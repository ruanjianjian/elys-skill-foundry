// Official, visible YouTube playback only. No audio is downloaded or extracted.
// API contract: https://developers.google.com/youtube/iframe_api_reference
let apiPromise;
let instanceSequence = 0;

function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady;
    let settled = false;
    let timer;
    let script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const owned = !script;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script?.removeEventListener("error", onError);
      if (window.onYouTubeIframeAPIReady === ready) window.onYouTubeIframeAPIReady = previous;
      if (error) {
        if (owned) script?.remove();
        apiPromise = undefined;
        reject(error);
      } else resolve(window.YT);
    };
    const ready = () => {
      try { if (typeof previous === "function") previous(); } catch (_) { /* Other embeds own their callback. */ }
      if (window.YT?.Player) finish();
      else finish(new Error("YouTube 播放器尚未就绪"));
    };
    const onError = () => finish(new Error("无法连接 YouTube 播放器"));
    window.onYouTubeIframeAPIReady = ready;
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
    }
    script.addEventListener("error", onError, { once: true });
    timer = setTimeout(() => finish(new Error("YouTube 播放器连接超时")), 15000);
    if (owned) document.head.append(script);
  });
  return apiPromise;
}

/**
 * The caller owns sound preference and active-card scope.
 * setWanted(false) revokes playback immediately; asynchronous events cannot renew it.
 * Loading is lazy. A blocked autoplay stays blocked until a trusted user gesture.
 */
export function createOfficialMusic({
  videoId = "E6wPP2tOHgg",
  onChange = () => {},
  onClose = () => {},
  mount,
} = {}) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new TypeError("Invalid YouTube video ID");
  const id = ++instanceSequence;
  const dock = mount || document.createElement("aside");
  const ownsMount = !mount;
  dock.classList.add("official-music");
  dock.id ||= id === 1 ? "official-music" : `official-music-${id}`;
  dock.dataset.officialMusic = "";
  dock.setAttribute("aria-label", "艺人官方配乐播放器");
  dock.hidden = true;
  dock.innerHTML = `
    <header class="official-music__header">
      <div class="official-music__title"><span class="official-music__note" aria-hidden="true">♪</span><div><strong>Groove Dealers</strong><span>艺人官方音源 · YouTube</span></div></div>
      <button class="official-music__close" type="button" aria-label="关闭音乐" title="关闭音乐"><span aria-hidden="true">×</span></button>
    </header>
    <div class="official-music__player" data-music-player></div>
    <footer class="official-music__footer"><p class="official-music__status" role="status" aria-live="polite"></p><a class="official-music__source" href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener noreferrer">在 YouTube 打开 <span aria-hidden="true">↗</span></a></footer>`;
  if (ownsMount) document.body.append(dock);
  const playerMount = dock.querySelector("[data-music-player]");
  const statusNode = dock.querySelector(".official-music__status");
  const close = dock.querySelector(".official-music__close");
  let wanted = false;
  let suspended = false;
  let destroyed = false;
  let revision = 0;
  let player = null;
  let currentToken = null;
  let loadPending = false;
  let stopTimer;
  let readyTimer;
  let playbackTimer;
  let sampleTimer;
  let lastNotification = "";
  let state = {
    status: "idle", playing: false, wanted: false, ready: false,
    muted: true, playerState: -1, position: 0, duration: 0, stopping: false, error: "", reason: "idle",
  };

  const allowed = () => !destroyed && wanted && !suspended && !document.hidden;
  const safeCall = (target, method, ...args) => {
    try { return target?.[method]?.(...args); } catch (_) { return undefined; }
  };
  function getState() {
    const actualState = state.ready ? safeCall(player, "getPlayerState") : undefined;
    const actualMuted = state.ready ? safeCall(player, "isMuted") : undefined;
    const position = state.ready ? safeCall(player, "getCurrentTime") : undefined;
    const duration = state.ready ? safeCall(player, "getDuration") : undefined;
    return {
      ...state, wanted, visible: !dock.hidden, videoId,
      playerState: Number.isFinite(actualState) ? actualState : state.playerState,
      playing: Number.isFinite(actualState) ? actualState === 1 : state.playing,
      muted: typeof actualMuted === "boolean" ? actualMuted : state.muted,
      position: Number.isFinite(position) ? position : state.position,
      currentTime: Number.isFinite(position) ? position : state.position,
      duration: Number.isFinite(duration) ? duration : state.duration,
    };
  }
  function publish(patch = {}, text) {
    state = { ...state, ...patch, wanted };
    if (text !== undefined) statusNode.textContent = text;
    const snapshot = getState();
    for (const key of ["status", "playing", "wanted", "ready", "muted", "playerState", "position", "currentTime", "duration", "stopping", "reason", "videoId", "visible"])
      dock.dataset[key] = String(snapshot[key]);
    dock.dataset.error = state.error;
    const signature = JSON.stringify(snapshot);
    if (signature !== lastNotification) {
      lastNotification = signature;
      onChange(snapshot);
    }
  }
  function clearPlaybackTimer() {
    clearTimeout(playbackTimer);
    playbackTimer = undefined;
  }
  function disposePlayer() {
    clearTimeout(stopTimer);
    clearTimeout(readyTimer);
    clearInterval(sampleTimer);
    clearPlaybackTimer();
    const retiring = player;
    currentToken = null;
    player = null;
    safeCall(retiring, "mute");
    safeCall(retiring, "pauseVideo");
    safeCall(retiring, "destroy");
    // Removing the browsing context is the final stop barrier if the remote
    // pause acknowledgement is unavailable. Never hide a live audio iframe.
    playerMount.replaceChildren();
    state.ready = false;
  }
  function finishStop(reason, forceDispose = false, confirmedState) {
    clearTimeout(stopTimer);
    clearTimeout(readyTimer);
    clearPlaybackTimer();
    clearInterval(sampleTimer);
    const actual = confirmedState ?? safeCall(player, "getPlayerState");
    if (forceDispose || !player || !state.ready || ![-1, 0, 2, 5].includes(actual)) {
      disposePlayer();
      state.playerState = -1;
      state.position = 0;
      state.duration = 0;
    } else {
      // Preserve a confirmed-paused browsing context and its position. It is
      // muted before hiding, and any delayed PLAY event is independently guarded.
      state.playerState = actual;
      state.position = safeCall(player, "getCurrentTime") || 0;
      state.duration = safeCall(player, "getDuration") || 0;
    }
    dock.hidden = true;
    publish({ status: "idle", playing: false, muted: true, stopping: false, reason, error: "" }, "音乐已暂停");
  }
  function stop(reason = "off") {
    clearPlaybackTimer();
    clearTimeout(readyTimer);
    clearInterval(sampleTimer);
    safeCall(player, "mute");
    safeCall(player, "pauseVideo");
    if (!player || !state.ready) {
      finishStop(reason, true);
      return;
    }
    const actual = safeCall(player, "getPlayerState");
    if ([-1, 0, 2, 5].includes(actual)) finishStop(reason, false, actual);
    else {
      // A late remote PLAY must remain visible while the immediate pause command
      // is being acknowledged. The timeout removes the iframe, never hides it live.
      dock.hidden = false;
      publish({ muted: true, stopping: true, reason }, "正在停止音乐…");
      clearTimeout(stopTimer);
      stopTimer = setTimeout(() => finishStop(reason, true), 900);
    }
  }
  function fail(message, code = "") {
    safeCall(player, "mute");
    safeCall(player, "pauseVideo");
    disposePlayer();
    if (!wanted || destroyed) {
      dock.hidden = true;
      publish({ status: "idle", playing: false, stopping: false, muted: true, reason: "off" });
      return;
    }
    dock.hidden = false;
    publish({ status: "error", playing: false, ready: false, stopping: false, muted: true, playerState: -1, position: 0, duration: 0, reason: "unavailable", error: String(code || message) }, `${message}，请打开官方页面收听。`);
  }
  function blocked() {
    clearPlaybackTimer();
    if (!allowed()) { stop("blocked-after-off"); return; }
    if (safeCall(player, "getPlayerState") === 1) return;
    publish({ status: "blocked", playing: false, stopping: false, reason: "gesture-required" }, "首次开声请返回短片，点「点击开声」。");
  }
  function attemptPlay() {
    if (!allowed()) return false;
    if (!state.ready || !player) return false;
    dock.hidden = false;
    clearTimeout(stopTimer);
    clearPlaybackTimer();
    publish({ status: "ready", stopping: false, reason: "requesting-play", error: "" }, "正在请求播放官方配乐…");
    clearInterval(sampleTimer);
    sampleTimer = setInterval(() => {
      if (allowed() && state.ready) publish();
      else if (player) stop("scope-ended");
    }, 500);
    safeCall(player, "unMute");
    safeCall(player, "playVideo");
    // Some browsers do not emit onAutoplayBlocked. Never label a request as
    // playing before YouTube confirms PLAYING; leave a useful gesture prompt.
    playbackTimer = setTimeout(() => {
      if (allowed() && !state.playing) blocked();
    }, 2500);
    return true;
  }
  function handleState(event, token) {
    if (token !== currentToken) {
      if (event.data === 1 || event.data === 3) {
        safeCall(event.target, "mute");
        safeCall(event.target, "pauseVideo");
        safeCall(event.target, "destroy");
      }
      return;
    }
    if (!allowed()) {
      safeCall(event.target, "mute");
      safeCall(event.target, "pauseVideo");
      if ([-1, 0, 2, 5].includes(event.data)) finishStop(state.reason || "off", false, event.data);
      else stop(state.reason || "revoked");
      return;
    }
    if (event.data === 1) {
      clearPlaybackTimer();
      const muted = safeCall(player, "isMuted");
      publish({ status: "playing", playing: true, ready: true, muted: muted !== false, playerState: 1, stopping: false, reason: "playing", error: "" }, muted ? "官方视频正在静音播放，可在播放器内开声。" : "正在播放艺人官方配乐");
    } else if (event.data === 3) {
      publish({ status: "loading", playing: false, playerState: 3, reason: "buffering" }, "官方播放器缓冲中…");
    } else {
      clearPlaybackTimer();
      publish({ status: "ready", playing: false, playerState: event.data, reason: event.data === 0 ? "ended" : "paused" }, event.data === 0 ? "配乐已结束，可在官方播放器内重播。" : "配乐已暂停，可在官方播放器内播放。");
    }
  }
  async function ensurePlayer() {
    if (!allowed() || player || loadPending) return;
    loadPending = true;
    const requestedRevision = revision;
    dock.hidden = false;
    publish({ status: "loading", playing: false, ready: false, reason: "loading-api", error: "" }, "正在连接 YouTube 官方播放器…");
    let YT;
    try { YT = await loadYouTubeAPI(); }
    catch (error) {
      loadPending = false;
      if (allowed()) fail(error.message);
      return;
    }
    loadPending = false;
    if (!allowed()) return;
    // A newer wanted scope may share the same lazy API load. It is safe to
    // create only after checking the current scope, never the stale promise.
    if (requestedRevision !== revision && !allowed()) return;
    const token = {};
    currentToken = token;
    const target = document.createElement("div");
    target.id = `official-music-player-${id}-${revision}`;
    playerMount.replaceChildren(target);
    try {
      player = new YT.Player(target.id, {
        width: "360", height: "203", videoId,
        playerVars: {
          autoplay: 0, controls: 1, playsinline: 1,
          origin: location.origin, rel: 0,
        },
        events: {
          onReady(event) {
            if (token !== currentToken || !allowed()) {
              safeCall(event.target, "mute");
              safeCall(event.target, "pauseVideo");
              safeCall(event.target, "destroy");
              if (token === currentToken) finishStop("ready-after-off");
              return;
            }
            clearTimeout(readyTimer);
            publish({ status: "ready", ready: true, playing: false, reason: "ready" }, "官方播放器已就绪");
            attemptPlay();
          },
          onStateChange: event => handleState(event, token),
          onAutoplayBlocked() { if (token === currentToken) blocked(); },
          onError(event) {
            if (token !== currentToken) return;
            const messages = { 2: "官方视频地址无效", 5: "官方视频暂时无法播放", 100: "官方视频不可用", 101: "此环境暂无法播放官方配乐", 150: "此环境暂无法播放官方配乐", 153: "官方播放器无法识别此页面" };
            fail(messages[event.data] || "官方配乐暂时无法播放", event.data);
          },
        },
      });
      readyTimer = setTimeout(() => {
        if (token === currentToken && allowed() && !state.ready) fail("官方播放器响应超时");
      }, 15000);
    } catch (_) { fail("无法创建官方播放器"); }
  }
  function setWanted(value) {
    if (destroyed) return;
    const next = Boolean(value);
    if (next !== wanted) revision++;
    wanted = next;
    if (!next) { stop("off"); return; }
    suspended = false;
    if (!allowed()) { stop(document.hidden ? "hidden" : "static"); return; }
    if (state.stopping) disposePlayer();
    if (player && state.ready) {
      if (!state.playing && state.status !== "blocked" && state.reason !== "requesting-play") attemptPlay();
      else publish();
    } else ensurePlayer();
  }
  function resumeFromGesture() {
    if (!allowed()) return false;
    if (state.ready && player) return attemptPlay();
    ensurePlayer();
    if (state.status !== "error") publish({}, "配乐加载后，点短片开声。");
    return false;
  }
  const onCloseClick = () => {
    setWanted(false);
    onClose();
  };
  const onVisibility = () => {
    if (document.hidden) {
      suspended = true;
      revision++;
      stop("hidden");
    }
  };
  const onMotion = event => {
    if (event?.detail?.reduced) {
      suspended = true;
      revision++;
      stop("static");
    }
  };
  const onPageHide = () => {
    suspended = true;
    revision++;
    finishStop("pagehide", true);
  };
  close.addEventListener("click", onCloseClick);
  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("foundry:motion-change", onMotion);
  window.addEventListener("pagehide", onPageHide);
  lastNotification = JSON.stringify(getState());
  publish();
  return {
    setWanted,
    resumeFromGesture,
    getState,
    destroy() {
      if (destroyed) return;
      wanted = false;
      destroyed = true;
      revision++;
      finishStop("destroyed", true);
      close.removeEventListener("click", onCloseClick);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("foundry:motion-change", onMotion);
      window.removeEventListener("pagehide", onPageHide);
      if (ownsMount) dock.remove();
      else dock.replaceChildren();
    },
  };
}
