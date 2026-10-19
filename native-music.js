// Same-origin, licensed background music. The caller owns the active-card scope.
export function createNativeMusic({ src, onChange = () => {} } = {}) {
  if (!src) throw new TypeError("A same-origin music source is required");
  const source = new URL(src, location.href);
  const localPreview = location.protocol === "file:" && source.protocol === "file:";
  const sameOriginHTTP = /^https?:$/.test(source.protocol) && source.origin === location.origin;
  if (!localPreview && !sameOriginHTTP)
    throw new TypeError("Background music must use a same-origin HTTP source or local file preview");

  const audio = document.createElement("audio");
  audio.id = "foundry-bgm-audio";
  audio.hidden = true;
  audio.setAttribute("aria-hidden", "true");
  audio.preload = "none";
  audio.loop = true;
  audio.muted = true;
  audio.volume = 0.32;
  audio.src = source.href;
  document.body.append(audio);

  let wanted = false;
  let destroyed = false;
  let request = 0;
  let pending = null;
  let confirmedPlaying = false;
  let status = "idle";
  let reason = "idle";
  let error = "";
  let lastNotification = "";
  const listeners = [];
  const allowed = () => wanted && !destroyed && !document.hidden;
  const finite = value => Number.isFinite(value) ? value : 0;

  function getState() {
    return {
      status,
      playing: confirmedPlaying && !audio.paused && !audio.ended && audio.readyState >= 3,
      wanted,
      muted: audio.muted,
      position: finite(audio.currentTime),
      currentTime: finite(audio.currentTime),
      duration: finite(audio.duration),
      ready: audio.readyState >= 2,
      readyState: audio.readyState,
      paused: audio.paused,
      error,
      reason,
    };
  }
  function publish() {
    const state = getState();
    for (const [key, value] of Object.entries(state)) audio.dataset[key] = String(value);
    const signature = JSON.stringify(state);
    if (signature !== lastNotification) {
      lastNotification = signature;
      onChange(state);
    }
  }
  function silence() {
    // Mute synchronously before pause. Both promise and media-event guards also
    // repeat this barrier if the browser delivers an obsolete play afterwards.
    audio.muted = true;
    audio.pause();
    confirmedPlaying = false;
  }
  function revoke(cause = "off") {
    wanted = false;
    request++;
    pending = null;
    silence();
    status = "idle";
    reason = cause;
    publish();
  }
  function rejectPlay(cause) {
    silence();
    const name = cause?.name || "";
    if (name === "NotAllowedError") {
      status = "blocked";
      reason = "gesture-required";
      error = "";
    } else if (name === "AbortError") {
      status = audio.readyState >= 2 ? "ready" : "loading";
      reason = "interrupted";
      error = "";
    } else {
      status = "error";
      reason = "unavailable";
      error = cause?.message || "配乐暂时无法播放";
    }
    publish();
  }
  function attemptPlay() {
    if (!allowed()) return false;
    const version = ++request;
    pending = version;
    confirmedPlaying = false;
    status = audio.readyState >= 2 ? "ready" : "loading";
    reason = "requesting-play";
    error = "";
    audio.muted = false;
    let promise;
    try { promise = audio.play(); }
    catch (cause) {
      if (version === request) {
        pending = null;
        if (allowed()) rejectPlay(cause);
        else revoke("revoked-before-play");
      }
      return false;
    }
    publish();
    Promise.resolve(promise).then(() => {
      if (destroyed) return;
      if (version !== request) {
        // An older promise must not pause a newer valid scope, but it also must
        // not resurrect playback when there is no current permission to play.
        if (!allowed()) { silence(); publish(); }
        return;
      }
      pending = null;
      if (!allowed()) { revoke("revoked-after-play"); return; }
      if (!audio.paused && !audio.ended && audio.readyState >= 3) {
        confirmedPlaying = true;
        status = "playing";
        reason = "playing";
      }
      publish();
    }).catch(cause => {
      if (destroyed) return;
      if (version !== request) {
        if (!allowed()) { silence(); publish(); }
        return;
      }
      pending = null;
      if (!allowed()) { revoke("revoked-after-rejection"); return; }
      rejectPlay(cause);
    });
    return true;
  }
  function listen(type, handler) {
    audio.addEventListener(type, handler);
    listeners.push([type, handler]);
  }
  function guardMediaEvent() {
    if (allowed()) return true;
    silence();
    status = "idle";
    reason = document.hidden ? "hidden" : "off";
    publish();
    return false;
  }
  listen("play", () => {
    if (!guardMediaEvent()) return;
    status = audio.readyState >= 2 ? "ready" : "loading";
    reason = "starting";
    publish();
  });
  listen("playing", () => {
    if (!guardMediaEvent()) return;
    confirmedPlaying = true;
    status = "playing";
    reason = "playing";
    error = "";
    publish();
  });
  listen("pause", () => {
    // A queued pause event from the previous scope must not overwrite a newer
    // successful play on this same audio element.
    if (!audio.paused) return;
    confirmedPlaying = false;
    if (!wanted) status = "idle";
    else if (!["blocked", "error"].includes(status)) {
      status = audio.readyState >= 2 ? "ready" : "loading";
      reason = "paused";
    }
    publish();
  });
  listen("waiting", () => {
    if (!guardMediaEvent()) return;
    confirmedPlaying = false;
    status = "loading";
    reason = "buffering";
    publish();
  });
  listen("loadstart", () => {
    if (allowed()) { status = "loading"; reason = "loading"; }
    publish();
  });
  listen("canplay", () => {
    if (!guardMediaEvent()) return;
    if (!["blocked", "error", "playing"].includes(status)) status = "ready";
    publish();
  });
  for (const event of ["loadedmetadata", "durationchange", "timeupdate", "volumechange", "stalled", "suspend"])
    listen(event, publish);
  listen("error", () => {
    if (destroyed) return;
    silence();
    pending = null;
    request++;
    const messages = {
      1: "配乐加载已中止",
      2: "配乐网络加载失败",
      3: "配乐文件无法解码",
      4: "配乐格式或地址不可用",
    };
    error = messages[audio.error?.code] || "配乐暂时无法播放";
    status = wanted ? "error" : "idle";
    reason = "unavailable";
    publish();
  });
  function setWanted(value) {
    if (destroyed) return;
    if (!value) { revoke("off"); return; }
    if (document.hidden) { revoke("hidden"); return; }
    const wasWanted = wanted;
    wanted = true;
    if (pending !== null || getState().playing || (wasWanted && ["blocked", "error"].includes(status))) {
      publish();
      return;
    }
    attemptPlay();
  }
  function resumeFromGesture() {
    // This is intentionally not an ON switch; the caller must still want music
    // for the currently active card when the trusted gesture arrives.
    if (!allowed()) return false;
    return attemptPlay();
  }
  const onVisibility = () => { if (document.hidden) revoke("hidden"); };
  const onPageHide = () => revoke("pagehide");
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  lastNotification = JSON.stringify(getState());
  publish();

  return {
    setWanted,
    resumeFromGesture,
    getState,
    destroy() {
      if (destroyed) return;
      revoke("destroyed");
      destroyed = true;
      for (const [type, handler] of listeners) audio.removeEventListener(type, handler);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      audio.removeAttribute("src");
      audio.load();
      audio.remove();
    },
  };
}
