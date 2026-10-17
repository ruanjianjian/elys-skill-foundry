import { skills } from "./catalog.js";

// Keep the new direction reviewable before replacing the full collection.
const cinematicPreview =
  new URLSearchParams(location.search).get("cut") === "cinematic";
if (cinematicPreview) {
  const link = document.querySelector(".style-link");
  link.href = "./#ns-spec-cards";
  link.textContent = "返回原片 ↗";
}
const filmPath = (skill) =>
  cinematicPreview && skill.id === "ns-spec-cards"
    ? "media/pilots/ns-spec-cards.mp4"
    : "media/films/" + skill.id + ".mp4";
const posterPath = (skill) =>
  cinematicPreview && skill.id === "ns-spec-cards"
    ? "media/pilots/ns-spec-cards.jpg"
    : "media/posters/" + skill.id + ".jpg";

const grid = document.querySelector("#skill-grid");
const toast = document.querySelector("[data-toast]");
const motionButton = document.querySelector("#motion-toggle");
const bgmButton = document.querySelector("#bgm-toggle");
const bgm = document.querySelector("#bgm");
if (cinematicPreview) bgm.src = "media/pilots/score.m4a";
const media = matchMedia("(prefers-reduced-motion: reduce)");
const hoverMedia = matchMedia("(hover: hover) and (pointer: fine)");
const openers = new WeakMap();
const items = [];
const examples = {
  "ns-spec-cards": {
    src: "media/examples/ns-spec-cards.jpg",
    title: "ns-spec-cards · 实际页面示例",
  },
  "test-journal": {
    src: "media/examples/test-journal.jpg",
    title: "test-journal · 实际报告样式",
  },
};
let quiet = false;
let bgmIntent = true;
let bgmManual = false;
let active = null;
let videoVersion = 0;
let bgmVersion = 0;
let toastTimer;
try {
  quiet = localStorage.getItem("foundry-static") === "yes";
  bgmIntent = localStorage.getItem("foundry-bgm") !== "off";
} catch (_) {}
const reduced = () => quiet || media.matches;
bgm.volume = 0.24;

function notify(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2500);
}
function pauseItem(item) {
  if (!item) return;
  if (active === item) {
    active = null;
    videoVersion++;
  }
  item.video.pause();
  item.card.classList.remove("is-playing", "is-loading");
  item.preview.setAttribute("aria-pressed", "false");
  item.preview.setAttribute("aria-label", "播放" + item.skill.title + "短片");
  item.icon.textContent = "▶";
  item.label.textContent =
    reduced() || !hoverMedia.matches ? "点按播放" : "悬停预览";
}
async function playItem(item, { manual = false } = {}) {
  if (document.hidden || (reduced() && !manual)) return;
  if (active === item && !item.video.paused) return;
  pauseItem(active);
  const version = ++videoVersion;
  active = item;
  item.video.muted = true;
  item.video.currentTime = 0;
  if (
    cinematicPreview &&
    item.skill.id === "ns-spec-cards" &&
    bgmIntent &&
    !bgm.paused
  )
    bgm.currentTime = 0;
  item.card.classList.add("is-loading");
  try {
    await item.video.play();
    if (version !== videoVersion || active !== item || document.hidden) {
      if (active !== item || document.hidden) item.video.pause();
      return;
    }
    item.card.classList.remove("is-loading");
    item.card.classList.add("is-playing");
    item.preview.setAttribute("aria-pressed", "true");
    item.preview.setAttribute("aria-label", "暂停" + item.skill.title + "短片");
    item.icon.textContent = "Ⅱ";
    item.label.textContent = "正在预览";
  } catch (error) {
    if (version === videoVersion) {
      pauseItem(item);
      if (error.name !== "AbortError")
        notify("暂时无法播放，可从卡片下载 MP4。");
    }
  }
}
function showDialog(dialog, opener) {
  if (dialog.open) return;
  pauseItem(active);
  openers.set(dialog, opener);
  dialog.showModal();
}
for (const dialog of document.querySelectorAll("dialog")) {
  dialog
    .querySelectorAll(".close-dialog")
    .forEach((button) =>
      button.addEventListener("click", () => dialog.close()),
    );
  dialog.addEventListener("close", () =>
    openers.get(dialog)?.focus({ preventScroll: true }),
  );
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  });
}
async function copyText(text, opener, message) {
  try {
    if (!navigator.clipboard || !isSecureContext)
      throw new Error("Manual copy");
    await navigator.clipboard.writeText(text);
    notify(message);
  } catch (_) {
    const input = document.querySelector("#copy-text");
    input.value = text;
    showDialog(document.querySelector("#copy-dialog"), opener);
    input.focus();
    input.select();
  }
}
function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function showExample(skill, opener) {
  const example = examples[skill.id];
  if (!example) return;
  const image = document.querySelector("#example-image");
  image.src = example.src;
  image.alt = example.title;
  document.querySelector("#example-title").textContent = example.title;
  showDialog(document.querySelector("#example-dialog"), opener);
  document.querySelector("#example-dialog .close-dialog").focus();
}
for (const [index, skill] of skills.entries()) {
  const card = node("article", "film-card");
  card.dataset.skill = skill.id;
  card.id = skill.id;
  card.setAttribute("aria-labelledby", "title-" + skill.id);
  const preview = node("button", "film-preview");
  preview.type = "button";
  preview.dataset.skill = skill.id;
  preview.setAttribute("aria-pressed", "false");
  preview.setAttribute("aria-label", "播放" + skill.title + "短片");
  const video = node("video", "skill-video");
  video.id = "video-" + skill.id;
  video.src = filmPath(skill);
  video.poster = posterPath(skill);
  video.preload = "none";
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = true;
  video.setAttribute("aria-hidden", "true");
  preview.setAttribute("aria-controls", video.id);
  const poster = node("img", "poster");
  poster.src = video.poster;
  poster.alt = "";
  poster.width = 1280;
  poster.height = 720;
  poster.loading = index < 3 ? "eager" : "lazy";
  const state = node("span", "preview-state");
  state.setAttribute("aria-hidden", "true");
  const icon = node("span", "preview-icon", "▶");
  const label = node("span", "preview-label", "悬停预览");
  state.append(icon, label);
  preview.append(
    video,
    poster,
    node(
      "span",
      "preview-number",
      cinematicPreview && index === 0
        ? "新版试映"
        : String(index + 1).padStart(2, "0"),
    ),
    node(
      "span",
      "preview-duration",
      cinematicPreview && index === 0 ? "00:16" : "00:12",
    ),
    state,
  );
  const body = node("div", "film-body");
  const titleRow = node("div", "film-title-row");
  const title = node("h2", "", skill.title);
  title.id = "title-" + skill.id;
  titleRow.append(title, node("span", "film-tag", skill.tag));
  const actions = node("div", "install-actions");
  const copy = node(
    "button",
    "copy-skill",
    skill.zipUrl ? "复制 SKILL.md" : "复制安装说明",
  );
  copy.type = "button";
  copy.dataset.skill = skill.id;
  copy.setAttribute(
    "aria-label",
    (skill.zipUrl ? "复制技能 " : "复制安装说明 ") + skill.id,
  );
  copy.addEventListener("click", async () => {
    copy.disabled = true;
    try {
      let text;
      if (skill.zipUrl) {
        const response = await fetch(skill.skillUrl);
        if (!response.ok) throw new Error("Could not load skill");
        text = await response.text();
      } else
        text =
          "请安装 " +
          skill.id +
          "：" +
          skill.skillUrl +
          "\n" +
          skill.installText;
      await copyText(
        text,
        copy,
        skill.zipUrl
          ? "SKILL.md 已复制；配套文件请下载 ZIP。"
          : "安装说明已复制。",
      );
    } catch (_) {
      notify("暂时无法读取，请从源链接查看。");
    } finally {
      copy.disabled = false;
    }
  });
  const source = node(
    "a",
    "skill-source",
    skill.zipUrl ? "下载技能 ZIP ↓" : "查看源仓库 ↗",
  );
  source.href = skill.zipUrl || skill.skillUrl;
  if (skill.zipUrl) source.download = skill.id + ".zip";
  else {
    source.target = "_blank";
    source.rel = "noopener noreferrer";
  }
  actions.append(copy, source);
  const links = node("div", "card-links");
  if (examples[skill.id]) {
    const example = node("button", "show-example", "看实际页面 ↗");
    example.type = "button";
    example.addEventListener("click", () => showExample(skill, example));
    links.append(example);
  }
  const download = node("a", "film-download", "下载短片 MP4 ↓");
  download.href = video.getAttribute("src");
  download.download = skill.id + ".mp4";
  links.append(download);
  const details = node("details", "film-tools");
  const summary = node("summary", "", "使用说明");
  summary.append(node("span", "", "＋"));
  const sourceLink = node("a", "", "查看 SKILL.md ↗");
  sourceLink.href = skill.skillUrl;
  if (!skill.zipUrl) {
    sourceLink.target = "_blank";
    sourceLink.rel = "noopener noreferrer";
  }
  const sourceParagraph = node("p");
  sourceParagraph.append(sourceLink);
  details.append(
    summary,
    node("p", "film-description", skill.description),
    node("p", "install-note", skill.installText),
    sourceParagraph,
  );
  body.append(
    titleRow,
    node("p", "skill-payoff", skill.payoff),
    node("code", "skill-command", skill.command),
    actions,
    links,
    details,
  );
  card.append(preview, body);
  const item = { card, preview, video, icon, label, skill };
  items.push(item);
  card.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse" && hoverMedia.matches && !reduced())
      playItem(item);
  });
  card.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") pauseItem(item);
  });
  card.addEventListener("focusin", (event) => {
    if (event.target.matches(":focus-visible") && !reduced()) playItem(item);
  });
  card.addEventListener("focusout", (event) => {
    if (!card.contains(event.relatedTarget)) pauseItem(item);
  });
  preview.addEventListener("click", () => {
    if (active === item && !video.paused) pauseItem(item);
    else playItem(item, { manual: true });
  });
  video.addEventListener("volumechange", () => {
    if (!video.muted) video.muted = true;
  });
  video.addEventListener("play", () => {
    if (active !== item || document.hidden) video.pause();
  });
  video.addEventListener("error", () => {
    pauseItem(item);
    notify(skill.title + "短片加载失败，可稍后重试。");
  });
  grid.append(card);
}

function updateBgmButton() {
  const playing = bgmIntent && !bgm.paused && !bgm.ended;
  bgmButton.dataset.state = !bgmIntent
    ? "off"
    : playing
      ? "playing"
      : "waiting";
  bgmButton.setAttribute("aria-pressed", String(bgmIntent));
  bgmButton.textContent = !bgmIntent
    ? "节拍 · 关闭"
    : playing
      ? "节拍 ♪"
      : "节拍 · 点击播放";
  bgmButton.setAttribute(
    "aria-label",
    !bgmIntent
      ? "开启背景节拍"
      : playing
        ? "关闭正在播放的背景节拍"
        : "背景节拍等待点击播放",
  );
}
async function tryBgm() {
  const version = ++bgmVersion;
  if (!bgmIntent || document.hidden || (reduced() && !bgmManual)) {
    bgm.pause();
    updateBgmButton();
    return;
  }
  try {
    await bgm.play();
    if (version !== bgmVersion) return;
    if (!bgmIntent || document.hidden || (reduced() && !bgmManual)) bgm.pause();
  } catch (_) {
    /* Autoplay denial remains visibly waiting for a user gesture. */
  }
  updateBgmButton();
}
bgmButton.addEventListener("click", () => {
  if (bgmIntent && !bgm.paused) {
    bgmIntent = false;
    bgmManual = false;
    bgmVersion++;
    bgm.pause();
  } else {
    bgmIntent = true;
    bgmManual = true;
    tryBgm();
  }
  try {
    localStorage.setItem("foundry-bgm", bgmIntent ? "on" : "off");
  } catch (_) {}
  updateBgmButton();
});
bgm.addEventListener("playing", updateBgmButton);
bgm.addEventListener("pause", updateBgmButton);
bgm.addEventListener("error", () => {
  updateBgmButton();
  notify("背景节拍暂时不可用，预览仍可正常观看。");
});
function resumeOnGesture(event) {
  if (!event.isTrusted || event.target.closest?.("#bgm-toggle, #motion-toggle"))
    return;
  if (bgmIntent && bgm.paused && !reduced() && !document.hidden) tryBgm();
}
document.addEventListener("pointerdown", resumeOnGesture, { passive: true });
document.addEventListener("keydown", resumeOnGesture);
function updatePreference() {
  document.documentElement.classList.toggle("static-mode", reduced());
  motionButton.setAttribute("aria-pressed", String(reduced()));
  motionButton.textContent = media.matches
    ? "跟随系统静态"
    : quiet
      ? "恢复动态"
      : "静态模式";
  document.querySelector("#preview-hint").textContent = reduced()
    ? "静态浏览 · 点按可播放"
    : cinematicPreview
      ? "新版决策卡 · 16 秒试片"
      : hoverMedia.matches
        ? "悬停预览 · 9 × 12 秒"
        : "点按预览 · 9 × 12 秒";
  if (reduced()) {
    pauseItem(active);
    bgmManual = false;
  }
  for (const item of items) if (active !== item) pauseItem(item);
  tryBgm();
}
motionButton.addEventListener("click", () => {
  if (media.matches) {
    notify("当前跟随系统静态设置，仍可点按短片播放。");
    return;
  }
  quiet = !quiet;
  try {
    localStorage.setItem("foundry-static", quiet ? "yes" : "no");
  } catch (_) {}
  updatePreference();
});
media.addEventListener("change", updatePreference);
hoverMedia.addEventListener("change", updatePreference);
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries)
      if (!entry.isIntersecting || entry.intersectionRatio < 0.1) {
        const item = items.find((item) => item.preview === entry.target);
        if (item && active === item) pauseItem(item);
      }
  },
  { threshold: 0.1 },
);
items.forEach((item) => observer.observe(item.preview));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseItem(active);
    bgmVersion++;
    bgm.pause();
  } else tryBgm();
});
window.addEventListener("pagehide", () => {
  pauseItem(active);
  bgmVersion++;
  bgm.pause();
  clearTimeout(toastTimer);
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) updatePreference();
});
document
  .querySelector("#copy-all")
  .addEventListener("click", (event) =>
    copyText(
      skills.map((skill) => skill.command).join("\n"),
      event.currentTarget,
      "9 个技能命令已复制。",
    ),
  );
document
  .querySelector("#copy-share")
  .addEventListener("click", (event) =>
    copyText(
      "分享一个 Skill 片库：悬停或点按就能看懂用途，9 个技能按需安装。\nhttps://ruanjianjian.github.io/elys-skill-foundry/",
      event.currentTarget,
      "群介绍已复制。",
    ),
  );
updatePreference();
updateBgmButton();
