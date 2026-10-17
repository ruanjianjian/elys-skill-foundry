import { skills } from "./catalog.js";

const video = document.querySelector("#feature-video");
const grid = document.querySelector("#skill-grid");
const toast = document.querySelector("[data-toast]");
const motionButton = document.querySelector("#motion-toggle");
const soundButton = document.querySelector("#sound-toggle");
const media = matchMedia("(prefers-reduced-motion: reduce)");
const dialogs = [...document.querySelectorAll("dialog")];
const openers = new WeakMap();
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
let selected = skills[0];
let visible = true;
let resumeWhenVisible = false;
let quiet = false;
let toastTimer;
let selectionVersion = 0;
try {
  quiet = localStorage.getItem("foundry-static") === "yes";
} catch (_) {}
const reduced = () => quiet || media.matches;
const filmPath = (skill) => "media/films/" + skill.id + ".mp4";
const posterPath = (skill) => "media/posters/" + skill.id + ".jpg";
const field = (id, text) => {
  document.getElementById(id).textContent = text;
};

function notify(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2500);
}
function showDialog(dialog, opener) {
  if (dialog.open) return;
  openers.set(dialog, opener);
  dialog.showModal();
}
for (const dialog of dialogs) {
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
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
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
function playIfAllowed() {
  if (reduced() || !visible || document.hidden) return;
  resumeWhenVisible = false;
  video.play().catch(() => {
    /* The native play control remains available. */
  });
}
function setStill() {
  video.pause();
  resumeWhenVisible = false;
  if (video.readyState >= 1 && Number.isFinite(video.duration))
    video.currentTime = Math.min(10.2, video.duration - 0.1);
}
function updatePreference() {
  document.documentElement.classList.toggle("static-mode", reduced());
  motionButton.setAttribute("aria-pressed", String(reduced()));
  motionButton.textContent = media.matches
    ? "跟随系统静态"
    : quiet
      ? "恢复动态"
      : "静态模式";
  if (reduced()) setStill();
}
function updateSound() {
  soundButton.setAttribute("aria-pressed", String(!video.muted));
  soundButton.textContent = video.muted ? "开启节拍 ♪" : "关闭声音 ♪";
}
function choose(skill, { user = false, autoplay = true } = {}) {
  const version = ++selectionVersion;
  video.pause();
  selected = skill;
  field(
    "film-number",
    String(skills.indexOf(skill) + 1).padStart(2, "0") + " / 09",
  );
  field("film-title", skill.title);
  field("skill-tag", skill.tag);
  field("skill-payoff", skill.payoff);
  field("skill-command", skill.command);
  field("skill-description", skill.description);
  field("install-note", skill.description + "\n\n" + skill.installText);
  const source = document.querySelector("#skill-download");
  source.href = skill.zipUrl || skill.skillUrl;
  source.textContent = skill.zipUrl ? "下载技能 ZIP ↓" : "查看源仓库 ↗";
  if (skill.zipUrl) {
    source.setAttribute("download", skill.id + ".zip");
    source.removeAttribute("target");
  } else {
    source.removeAttribute("download");
    source.target = "_blank";
  }
  field("copy-skill", skill.zipUrl ? "复制 SKILL.md" : "复制安装说明");
  document.querySelector("#show-example").hidden = !examples[skill.id];
  const download = document.querySelector("#film-download");
  download.href = filmPath(skill);
  download.download = skill.id + ".mp4";
  for (const button of grid.querySelectorAll("button"))
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.skill === skill.id),
    );
  video.poster = posterPath(skill);
  video.src = filmPath(skill);
  video.setAttribute("aria-label", skill.id + " · 12 秒能力示意短片");
  video.onloadedmetadata = () => {
    if (version !== selectionVersion) return;
    if (reduced()) setStill();
    else if (autoplay) {
      resumeWhenVisible = true;
      playIfAllowed();
    }
  };
  video.load();
  history.replaceState(null, "", "#" + skill.id);
  document.title = skill.title + " · ELYS Skill Foundry";
  if (user)
    document
      .querySelector(".cinema")
      .scrollIntoView({
        behavior: reduced() ? "instant" : "smooth",
        block: "start",
      });
}
for (const [index, skill] of skills.entries()) {
  const button = document.createElement("button");
  button.className = "film-card";
  button.type = "button";
  button.dataset.skill = skill.id;
  button.setAttribute(
    "aria-label",
    "播放 " + skill.title + " 宣传短片 · " + skill.command,
  );
  button.setAttribute("aria-controls", "feature-video");
  button.setAttribute("aria-pressed", "false");
  const imageBox = document.createElement("div");
  imageBox.className = "film-poster";
  const poster = document.createElement("img");
  poster.src = posterPath(skill);
  poster.alt = "";
  poster.width = 1280;
  poster.height = 720;
  poster.loading = "lazy";
  const play = document.createElement("span");
  play.textContent = "▶";
  play.setAttribute("aria-hidden", "true");
  imageBox.append(poster, play);
  const meta = document.createElement("div");
  meta.className = "film-card-meta";
  const number = document.createElement("span");
  number.className = "file-number";
  number.textContent = String(index + 1).padStart(2, "0");
  const title = document.createElement("strong");
  title.textContent = skill.title;
  const duration = document.createElement("small");
  duration.textContent = "00:12";
  meta.append(number, title, duration);
  button.append(imageBox, meta);
  button.addEventListener("click", () => choose(skill, { user: true }));
  grid.append(button);
}
document
  .querySelector("#copy-skill")
  .addEventListener("click", async (event) => {
    const button = event.currentTarget;
    const skill = selected;
    button.disabled = true;
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
        button,
        skill.zipUrl
          ? "SKILL.md 已复制；完整配套文件请下载 ZIP。"
          : "安装说明已复制，发给 Agent 即可。",
      );
    } catch (_) {
      notify("暂时无法读取，请从源链接查看。");
    } finally {
      button.disabled = false;
    }
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
      "分享一个 Skill 片库：9 个常用技能，每个 12 秒看懂用途。决策卡、测试报告、开发、验收和交付，按需安装。\nhttps://ruanjianjian.github.io/elys-skill-foundry/",
      event.currentTarget,
      "群介绍已复制。",
    ),
  );
document.querySelector("#show-example").addEventListener("click", (event) => {
  const example = examples[selected.id];
  if (!example) return;
  const image = document.querySelector("#example-image");
  image.src = example.src;
  image.alt = example.title;
  field("example-title", example.title);
  showDialog(document.querySelector("#example-dialog"), event.currentTarget);
  document.querySelector("#example-dialog .close-dialog").focus();
});
function advance(direction) {
  const index = skills.indexOf(selected);
  choose(skills[(index + direction + skills.length) % skills.length]);
}
document
  .querySelector("#previous-film")
  .addEventListener("click", () => advance(-1));
document
  .querySelector("#next-film")
  .addEventListener("click", () => advance(1));
soundButton.addEventListener("click", () => {
  video.muted = !video.muted;
  updateSound();
  if (!video.muted && video.paused && !reduced()) {
    if (video.ended) video.currentTime = 0;
    resumeWhenVisible = true;
    playIfAllowed();
  }
});
video.addEventListener("volumechange", updateSound);
video.addEventListener("error", () =>
  notify("短片加载失败，可下载 MP4 或稍后重试。"),
);
motionButton.addEventListener("click", () => {
  if (media.matches) {
    notify("当前跟随系统的减少动态设置。");
    return;
  }
  quiet = !quiet;
  try {
    localStorage.setItem("foundry-static", quiet ? "yes" : "no");
  } catch (_) {}
  updatePreference();
  if (!quiet) {
    video.currentTime = 0;
    resumeWhenVisible = true;
    playIfAllowed();
  }
});
media.addEventListener("change", updatePreference);
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
      if (!visible) {
        resumeWhenVisible ||= !video.paused;
        video.pause();
      } else if (resumeWhenVisible) playIfAllowed();
    }
  },
  { threshold: 0.25 },
);
observer.observe(video);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    resumeWhenVisible ||= !video.paused;
    video.pause();
  } else if (resumeWhenVisible) playIfAllowed();
});
window.addEventListener("pagehide", () => {
  video.pause();
  clearTimeout(toastTimer);
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) updatePreference();
});
window.addEventListener("hashchange", () => {
  const target = skills.find((skill) => skill.id === location.hash.slice(1));
  if (target && target !== selected) choose(target);
});
updatePreference();
updateSound();
choose(
  skills.find((skill) => skill.id === location.hash.slice(1)) || skills[0],
);
