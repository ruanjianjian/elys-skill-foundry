import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Liquid } from "liquid-gooey";

// Original title copy and material choreography. These islands never own films.
const TITLES = [
  { full: "我很懒，所以我做了", lines: ["我很懒，", "所以我做了"] },
  { full: "Jade重磅开源了", lines: ["Jade重磅", "开源了"] },
  {
    full: "一个biu嘚儿必须知道的skills",
    lines: ["一个biu嘚儿必须", "知道的skills"],
  },
  { full: "很好，你来到了强者的领域", lines: ["很好，你来到了", "强者的领域"] },
];
const DROP_MOTION = [
  { a: [0, 0], b: [0, 0] },
  { a: [4, 2], b: [-4, 2] },
  { a: [-2, 4], b: [4, -2] },
  { a: [3, -2], b: [-2, 3] },
];
const titleRoots = new WeakMap();
const cardRoots = new WeakMap();

function initialReduced() {
  return (
    document.documentElement.classList.contains("static-mode") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
function useReducedMotion() {
  const [reduced, setReduced] = useState(initialReduced);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = (event) =>
      setReduced(Boolean(event?.detail?.reduced) || initialReduced());
    media.addEventListener("change", sync);
    document.addEventListener("foundry:motion-change", sync);
    // The app may have set its initial preference between module evaluation and mount.
    sync();
    return () => {
      media.removeEventListener("change", sync);
      document.removeEventListener("foundry:motion-change", sync);
    };
  }, []);
  return reduced;
}
function TitleCopy({ title, phase = "idle", fallback = false }) {
  return (
    <h1
      className={`liquid-title is-${phase}${fallback ? " liquid-title-fallback" : ""}`}
    >
      <span className="liquid-title-copy">
        {title.lines[0]}
        <i className="mobile-break" aria-hidden="true"></i>
        {title.lines[1]}
      </span>
    </h1>
  );
}
function GooeyTitle({ mount }) {
  const reduced = useReducedMotion();
  const [titleIndex, setTitleIndex] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [visible, setVisible] = useState(() => !document.hidden);
  const title = TITLES[titleIndex],
    drops = DROP_MOTION[titleIndex];
  useEffect(() => {
    let intersects = true;
    const sync = () => setVisible(intersects && !document.hidden);
    const observer = new IntersectionObserver(
      (entries) => {
        intersects = entries[0]?.isIntersecting ?? true;
        sync();
      },
      { threshold: 0.01 },
    );
    observer.observe(mount);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [mount]);
  useEffect(() => {
    setPhase("idle");
    if (reduced || !visible) return undefined;
    let cycleTimer, swapTimer, settleTimer;
    const schedule = () => {
      cycleTimer = window.setTimeout(() => {
        setPhase("exit");
        swapTimer = window.setTimeout(() => {
          setTitleIndex((current) => (current + 1) % TITLES.length);
          setPhase("enter");
          settleTimer = window.setTimeout(() => {
            setPhase("idle");
            schedule();
          }, 100);
        }, 300);
      }, 3000);
    };
    schedule();
    return () => {
      window.clearTimeout(cycleTimer);
      window.clearTimeout(swapTimer);
      window.clearTimeout(settleTimer);
    };
  }, [reduced, visible]);
  if (reduced) return <TitleCopy title={title} fallback />;
  return (
    <Liquid
      className="liquid-title-group"
      blur={8}
      contrast={22}
      fill="var(--signal)"
      filterPadding={25}
      shadow="5px 5px 0 rgba(17, 24, 43, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.34), inset 0 -1px 0 rgba(17, 24, 43, 0.18)"
    >
      <Liquid.Item
        className="liquid-title-item"
        radius={12}
        morph={{
          shape: true,
          speed: 0.38,
          bounce: 0.18,
          contentBlur: 0,
          advanced: {
            bridgeGrow: 2.4,
            evolve: {
              anticipation: 12,
              travel: 7,
              cornerDuration: 1200,
              roundness: 0.72,
            },
          },
        }}
      >
        <TitleCopy title={title} phase={phase} />
      </Liquid.Item>
      <Liquid.Item
        className="title-drop title-drop-a"
        radius={999}
        x={drops.a[0]}
        y={drops.a[1]}
        transition="smooth"
        delay={60}
      >
        <i className="title-droplet" aria-hidden="true"></i>
      </Liquid.Item>
      <Liquid.Item
        className="title-drop title-drop-b"
        radius={999}
        x={drops.b[0]}
        y={drops.b[1]}
        transition="smooth"
        delay={110}
      >
        <i className="title-droplet" aria-hidden="true"></i>
      </Liquid.Item>
    </Liquid>
  );
}
function GooeyCardVerb({ article }) {
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [playing, setPlaying] = useState(() =>
    article.classList.contains("is-playing"),
  );
  const fineRef = useRef(
    window.matchMedia("(hover: hover) and (pointer: fine)"),
  );
  useEffect(() => {
    const fine = fineRef.current;
    const enter = (event) => {
      if (event.pointerType === "mouse" && fine.matches) setHovered(true);
    };
    const leave = () => setHovered(false);
    const focus = (event) => {
      if (event.target.matches(":focus-visible")) setFocused(true);
    };
    const blur = (event) => {
      if (!article.contains(event.relatedTarget)) setFocused(false);
    };
    const pointerChange = () => {
      if (!fine.matches) setHovered(false);
    };
    const playingChange = () =>
      setPlaying(article.classList.contains("is-playing"));
    const observer = new MutationObserver(playingChange);
    observer.observe(article, { attributes: true, attributeFilter: ["class"] });
    article.addEventListener("pointerenter", enter);
    article.addEventListener("pointerleave", leave);
    article.addEventListener("pointercancel", leave);
    article.addEventListener("focusin", focus);
    article.addEventListener("focusout", blur);
    fine.addEventListener("change", pointerChange);
    playingChange();
    return () => {
      observer.disconnect();
      article.removeEventListener("pointerenter", enter);
      article.removeEventListener("pointerleave", leave);
      article.removeEventListener("pointercancel", leave);
      article.removeEventListener("focusin", focus);
      article.removeEventListener("focusout", blur);
      fine.removeEventListener("change", pointerChange);
    };
  }, [article]);
  const active = !reduced && (hovered || focused || playing);
  const verb = article.dataset.verb || "SKILL";
  const verbWidth = Math.max(29, Math.min(70, verb.length * 6 + 15));
  const accent = article.dataset.accent || "#1746e6";
  const accentInk = article.dataset.accentInk || "#ffffff";
  useEffect(() => {
    article.style.setProperty("--verb-accent", accent);
    article.style.setProperty("--verb-ink", accentInk);
    article.classList.toggle("has-verb-intent", active);
    return () => article.classList.remove("has-verb-intent");
  }, [article, active, accent, accentInk]);
  if (reduced) return null;
  return (
    <Liquid
      className="card-verb-liquid"
      blur={4}
      contrast={21}
      fill={accent}
      filterPadding={11}
    >
      <Liquid.Item
        className="card-verb-liquid-item"
        radius={999}
        transition="smooth"
        morph={{
          shape: true,
          speed: 0.46,
          bounce: 0.2,
          contentBlur: 0,
          advanced: {
            bridgeGrow: 2,
            evolve: {
              anticipation: 12,
              travel: 6,
              cornerDuration: 1080,
              roundness: 0.9,
            },
          },
        }}
      >
        <i
          className={`card-verb-blob${active ? " is-active" : ""}`}
          style={{ "--verb-width": `${verbWidth}px` }}
          aria-hidden="true"
        ></i>
      </Liquid.Item>
    </Liquid>
  );
}
function mountIslands() {
  for (const mount of document.querySelectorAll("[data-gooey-title]")) {
    if (titleRoots.has(mount)) continue;
    const root = createRoot(mount);
    titleRoots.set(mount, root);
    root.render(<GooeyTitle mount={mount} />);
  }
  for (const mount of document.querySelectorAll(".card-verb-mount")) {
    if (cardRoots.has(mount)) continue;
    const article = mount.closest("article");
    if (!article) continue;
    mount.setAttribute("aria-hidden", "true");
    const root = createRoot(mount);
    cardRoots.set(mount, root);
    root.render(<GooeyCardVerb article={article} />);
  }
}
document.addEventListener("foundry:ready", mountIslands);
mountIslands();
