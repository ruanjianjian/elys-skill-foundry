import { skills } from "./catalog.js";
import { initSurfaceMotion } from "./surface-motion.js";

import { films } from "./collection-catalog.js";
const cardVerbs = [
  "ALIGN",
  "TRACE",
  "WEB",
  "MOBILE",
  "SHAPE",
  "BUILD",
  "MEASURE",
  "SHIP",
  "REVIEW",
];
const filmById = new Map(films.map((film) => [film.id, film]));
const filmPath = (skill) => "media/collection/" + skill.id + ".mp4";
const posterPath = (skill) => "media/collection/" + skill.id + ".jpg";

const grid = document.querySelector("#skill-grid");
const toast = document.querySelector("[data-toast]");
const motionButton = document.querySelector("#motion-toggle");
const bgmButton = document.querySelector("#bgm-toggle");
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
let soundEnabled = true;
let active = null;
let videoVersion = 0;
let soundRequest = 0;
let toastTimer;
try {
  quiet = localStorage.getItem("foundry-static") === "yes";
  soundEnabled = localStorage.getItem("foundry-bgm") !== "off";
} catch (_) {}
const reduced = () => quiet || media.matches;
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
    soundRequest++;
  }
  item.video.pause();
  item.video.muted = true;
  item.needsGesture = false;
  item.card.classList.remove("is-playing", "is-loading");
  item.preview.setAttribute("aria-pressed", "false");
  item.preview.setAttribute("aria-label", "播放" + item.skill.title + "短片");
  item.icon.textContent = "▶";
  item.label.textContent =
    reduced() || !hoverMedia.matches ? "点按播放" : "悬停预览";
  updateSoundButton();
}
async function playItem(item, { manual = false } = {}) {
  if (document.hidden || (reduced() && !manual)) return;
  if (active === item && !item.video.paused) return;
  pauseItem(active);
  const version = ++videoVersion;
  active = item;
  item.video.muted = !soundEnabled;
  item.video.volume = 0.65;
  item.needsGesture = false;
  item.video.currentTime = 0;
  item.card.classList.add("is-loading");
  try {
    try {
      await item.video.play();
    } catch (error) {
      if (error.name !== "NotAllowedError") throw error;
      if (version !== videoVersion || active !== item || document.hidden)
        return;
      // Audible hover may be blocked until a trusted click. Keep the preview usable.
      item.video.muted = true;
      item.needsGesture = soundEnabled;
      await item.video.play();
    }
    if (version !== videoVersion || active !== item || document.hidden) {
      if (active !== item || document.hidden) item.video.pause();
      return;
    }
    item.card.classList.remove("is-loading");
    item.card.classList.add("is-playing");
    item.preview.setAttribute("aria-pressed", "true");
    item.preview.setAttribute("aria-label", "暂停" + item.skill.title + "短片");
    item.icon.textContent = "Ⅱ";
    item.label.textContent = item.needsGesture ? "点击开声" : "正在预览";
    updateSoundButton();
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
    const copiedCard = opener?.closest(".film-card");
    if (copiedCard)
      document.dispatchEvent(
        new CustomEvent("foundry:copy-success", {
          detail: { cardId: copiedCard.id },
        }),
      );
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
  card.dataset.verb = cardVerbs[index];
  card.dataset.accent =
    skill.id === "engineering-delivery"
      ? "#e4492e"
      : skill.id === "codex-weekly-session-report"
        ? "#20d5ad"
        : "#1746e6";
  card.dataset.accentInk =
    skill.id === "codex-weekly-session-report" ? "#11182b" : "#ffffff";
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
  const face = node("span", "card-face");
  face.append(
    node("span", "face-title", skill.title),
    node("code", "face-command", skill.command),
    node("span", "face-promise", skill.payoff),
  );
  const verbMount = node("span", "card-verb-mount");
  verbMount.setAttribute("aria-hidden", "true");
  const verbLabel = node("span", "verb-label", cardVerbs[index]);
  verbLabel.setAttribute("aria-hidden", "true");
  preview.append(
    video,
    poster,
    face,
    verbMount,
    verbLabel,
    node("span", "preview-number", String(index + 1).padStart(2, "0")),
    node(
      "span",
      "preview-duration",
      "00:" + String(filmById.get(skill.id).duration).padStart(2, "0"),
    ),
    state,
  );
  const body = node("div", "film-body");
  const titleRow = node("div", "film-title-row");
  const title = node("h2", "", skill.title);
  title.id = "title-" + skill.id;
  titleRow.append(
    title,
    node("span", "film-tag", filmById.get(skill.id).style),
  );
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
  body.append(titleRow, actions, links, details);
  card.append(preview, body);
  const item = {
    card,
    preview,
    video,
    icon,
    label,
    skill,
    needsGesture: false,
  };
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
    if (active === item && !video.paused) {
      if (soundEnabled && video.muted) unmuteActive();
      else pauseItem(item);
    } else playItem(item, { manual: true });
  });
  video.addEventListener("volumechange", updateSoundButton);
  video.addEventListener("play", () => {
    if (active !== item || document.hidden) video.pause();
  });
  video.addEventListener("pause", updateSoundButton);
  video.addEventListener("error", () => {
    pauseItem(item);
    notify(skill.title + "短片加载失败，可稍后重试。");
  });
  grid.append(card);
}

function updateSoundButton() {
  const running = active && !active.video.paused;
  const waiting = soundEnabled && running && active.video.muted;
  bgmButton.dataset.state = !soundEnabled
    ? "off"
    : waiting
      ? "waiting"
      : running
        ? "playing"
        : "ready";
  bgmButton.setAttribute("aria-pressed", String(soundEnabled));
  bgmButton.textContent = soundEnabled ? "声音 开 ♪" : "声音 关";
  bgmButton.setAttribute(
    "aria-label",
    soundEnabled ? "关闭所有短片声音" : "开启短片声音（随悬停播放）",
  );
}
async function unmuteActive() {
  const item = active;
  if (!soundEnabled || !item || item.video.paused || document.hidden) return;
  const version = videoVersion;
  const request = ++soundRequest;
  item.video.muted = false;
  try {
    await item.video.play();
    if (version !== videoVersion || active !== item || request !== soundRequest)
      return;
    if (!soundEnabled || document.hidden) item.video.muted = true;
    else {
      item.needsGesture = false;
      item.label.textContent = "正在预览";
    }
  } catch (_) {
    if (version !== videoVersion || active !== item || request !== soundRequest)
      return;
    item.video.muted = true;
    item.needsGesture = true;
    if (active === item) await item.video.play().catch(() => {});
  }
  updateSoundButton();
}
bgmButton.addEventListener("click", () => {
  // A strict preference toggle: OFF always means OFF, even if autoplay was blocked.
  soundEnabled = !soundEnabled;
  soundRequest++;
  try {
    localStorage.setItem("foundry-bgm", soundEnabled ? "on" : "off");
  } catch (_) {}
  if (!soundEnabled) {
    for (const item of items) {
      item.video.muted = true;
      item.needsGesture = false;
      if (!item.video.paused) item.label.textContent = "正在预览";
    }
  } else unmuteActive();
  updateSoundButton();
});
function resumeOnGesture(event) {
  if (
    !event.isTrusted ||
    event.target.closest?.("#bgm-toggle, #motion-toggle, .film-preview")
  )
    return;
  if (soundEnabled && active && active.video.muted) unmuteActive();
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
    : hoverMedia.matches
      ? "悬停播放 · 移开即停"
      : "点按播放 · 再点暂停";
  if (reduced()) pauseItem(active);
  for (const item of items) if (active !== item) pauseItem(item);
  updateSoundButton();
  document.dispatchEvent(
    new CustomEvent("foundry:motion-change", {
      detail: { reduced: reduced() },
    }),
  );
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
  if (document.hidden) pauseItem(active);
});
window.addEventListener("pagehide", () => {
  pauseItem(active);
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
updateSoundButton();

let surfaceCleanup = initSurfaceMotion({ grid, items, reduced, hoverMedia });
document.dispatchEvent(new CustomEvent("foundry:ready"));
window.addEventListener("pagehide", () => {
  surfaceCleanup?.();
  surfaceCleanup = null;
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted && !surfaceCleanup)
    surfaceCleanup = initSurfaceMotion({ grid, items, reduced, hoverMedia });
});
