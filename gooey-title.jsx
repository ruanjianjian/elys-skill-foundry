import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Liquid } from "liquid-gooey";

const TITLES = [
  { full: "我很懒，所以我做了", lines: ["我很懒，", "所以我做了"] },
  { full: "Jade重磅开源了", lines: ["Jade重磅", "开源了"] },
  { full: "一个biu嘚儿必须知道的skills", lines: ["一个biu嘚儿必须", "知道的skills"] },
  { full: "很好，你来到了强者的领域", lines: ["很好，你来到了", "强者的领域"] },
];

const DROP_MOTION = [
  { a: [0, 0], b: [0, 0] },
  { a: [7, 4], b: [-6, 3] },
  { a: [-4, 7], b: [6, -4] },
  { a: [5, -3], b: [-3, 5] },
];

const SKILLS = [
  {
    number: "01",
    verb: "SHAPE",
    title: "技术方案",
    command: "/elys-backend-technical-design",
    promise: "把方案钉在当前代码上",
    className: "card-design",
    surface: "#f2f5ee",
    accent: "#1746e6",
    accentInk: "#ffffff",
    outline: "#11182b",
    verbWidth: 58,
  },
  {
    number: "02",
    verb: "BUILD",
    title: "代码开发",
    command: "/elys-code-development",
    promise: "真实 E2E 通过才算完成",
    className: "card-build",
    surface: "#f2f5ee",
    accent: "#1746e6",
    accentInk: "#ffffff",
    outline: "#11182b",
    verbWidth: 58,
  },
  {
    number: "03",
    verb: "MEASURE",
    title: "模型评测",
    command: "/elys-evaluation",
    promise: "先定义怎么测，再跑模型",
    className: "card-eval",
    surface: "#f2f5ee",
    accent: "#1746e6",
    accentInk: "#ffffff",
    outline: "#11182b",
    verbWidth: 72,
  },
  {
    number: "04",
    verb: "SHIP",
    title: "工程交付",
    command: "/engineering-delivery",
    promise: "当前 PR Head 通过才算交付",
    className: "card-ship",
    surface: "#1746e6",
    accent: "#e4492e",
    accentInk: "#ffffff",
    outline: "#1746e6",
    verbWidth: 48,
  },
  {
    number: "05",
    verb: "REVIEW",
    title: "周报复盘",
    command: "/codex-weekly-session-report",
    promise: "从真实 Session 还原工作",
    className: "card-review",
    surface: "#11182b",
    accent: "#20d5ad",
    accentInk: "#11182b",
    outline: "#11182b",
    verbWidth: 64,
  },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event) => setReduced(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function useWideGrid() {
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 1041px)").matches);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1041px)");
    const onChange = (event) => setWide(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return wide;
}

function GooeyTitle() {
  const reducedMotion = useReducedMotion();
  const [titleIndex, setTitleIndex] = useState(0);
  const [phase, setPhase] = useState("idle");
  const title = TITLES[titleIndex];
  const drops = DROP_MOTION[titleIndex];

  useEffect(() => {
    document.title = title.full;
  }, [title.full]);

  useEffect(() => {
    if (reducedMotion) {
      setPhase("idle");
      return undefined;
    }

    let cycleTimer;
    let swapTimer;
    let settleTimer;

    const clearTimers = () => {
      window.clearTimeout(cycleTimer);
      window.clearTimeout(swapTimer);
      window.clearTimeout(settleTimer);
    };

    const schedule = () => {
      cycleTimer = window.setTimeout(() => {
        if (document.hidden) {
          schedule();
          return;
        }

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

    const onVisibilityChange = () => {
      clearTimers();
      setPhase("idle");
      if (!document.hidden) schedule();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    schedule();

    return () => {
      clearTimers();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [reducedMotion]);

  return (
    <Liquid
      className="liquid-title-group"
      blur={14}
      contrast={22}
      fill="var(--signal)"
      filterPadding={42}
      shadow="8px 9px 0 rgba(17, 24, 43, 0.22), inset 0 2px 0 rgba(255, 255, 255, 0.34), inset 0 -2px 0 rgba(17, 24, 43, 0.18)"
    >
      <Liquid.Item
        className="liquid-title-item"
        radius={20}
        morph={{
          shape: true,
          speed: 0.38,
          bounce: 0.18,
          contentBlur: 0,
          advanced: {
            bridgeGrow: 4,
            evolve: {
              anticipation: 18,
              travel: 12,
              cornerDuration: 1200,
              roundness: 0.72,
            },
          },
        }}
      >
        <h1 className={`liquid-title is-${phase}`}>
          <span className="liquid-title-copy">
            {title.lines[0]}
            <i className="mobile-break" aria-hidden="true"></i>
            {title.lines[1]}
          </span>
        </h1>
      </Liquid.Item>

      <Liquid.Item className="title-drop title-drop-a" radius={999} x={drops.a[0]} y={drops.a[1]} transition="smooth" delay={60}>
        <i className="title-droplet" aria-hidden="true"></i>
      </Liquid.Item>
      <Liquid.Item className="title-drop title-drop-b" radius={999} x={drops.b[0]} y={drops.b[1]} transition="smooth" delay={110}>
        <i className="title-droplet" aria-hidden="true"></i>
      </Liquid.Item>
    </Liquid>
  );
}

function GooeySkillCard({ skill, onIntent }) {
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const flashTimer = useRef();
  const leaveTimer = useRef();
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const active = !reducedMotion && (hovered || focused || flashing);

  useEffect(() => () => {
    window.clearTimeout(flashTimer.current);
    window.clearTimeout(leaveTimer.current);
  }, []);

  const copySkill = () => {
    window.elysCopyText?.(skill.command);
    if (reducedMotion) return;

    window.clearTimeout(flashTimer.current);
    setFlashing(true);
    flashTimer.current = window.setTimeout(() => setFlashing(false), 380);
  };

  const enterCard = () => {
    window.clearTimeout(leaveTimer.current);
    hoveredRef.current = true;
    setHovered(true);
    onIntent(true);
  };

  const leaveCard = () => {
    hoveredRef.current = false;
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => {
      if (hoveredRef.current) return;
      setHovered(false);
      if (!focusedRef.current) onIntent(false);
    }, 160);
  };

  const focusCard = () => {
    window.clearTimeout(leaveTimer.current);
    focusedRef.current = true;
    setFocused(true);
    onIntent(true);
  };

  const blurCard = () => {
    focusedRef.current = false;
    setFocused(false);
    if (!hoveredRef.current) onIntent(false);
  };

  return (
    <div
      className={`skill-reactor ${skill.className}-reactor${active ? " is-active" : ""}${flashing ? " is-flashing" : ""}`}
      style={{
        "--card-surface": skill.surface,
        "--card-accent": skill.accent,
        "--card-accent-ink": skill.accentInk,
        "--card-outline": skill.outline,
      }}
    >
      <Liquid
        className="card-verb-liquid"
        blur={7}
        contrast={21}
        fill={skill.accent}
        filterPadding={18}
      >
        <Liquid.Item
          className="card-verb-liquid-item"
          radius={999}
          scale={flashing ? 1.08 : 1}
          transition="smooth"
          morph={{
            shape: true,
            speed: 0.46,
            bounce: 0.2,
            contentBlur: 0,
            advanced: {
              bridgeGrow: 3,
              evolve: {
                anticipation: 18,
                travel: 10,
                cornerDuration: 1080,
                roundness: 0.9,
              },
            },
          }}
        >
          <i
            className={`card-verb-blob${active ? " is-active" : ""}`}
            style={{ "--verb-width": `${skill.verbWidth}px` }}
            aria-hidden="true"
          ></i>
        </Liquid.Item>
      </Liquid>

      <button
        className={`skill-card ${skill.className}`}
        type="button"
        data-copy={skill.command}
        onPointerEnter={enterCard}
        onPointerLeave={leaveCard}
        onFocus={focusCard}
        onBlur={blurCard}
        onClick={copySkill}
      >
        <span className="card-meta"><b>{skill.number}</b><i>{skill.verb}</i></span>
        <strong>{skill.title}</strong>
        <code>{skill.command}</code>
        <span className="card-promise">{skill.promise}</span>
      </button>
    </div>
  );
}

function GooeySkillGrid() {
  const wideGrid = useWideGrid();
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    document.documentElement.classList.add("has-gooey-skills");
    return () => document.documentElement.classList.remove("has-gooey-skills");
  }, []);

  useEffect(() => {
    if (!skillsMount) return undefined;

    skillsMount.style.gridTemplateColumns = wideGrid
      ? SKILLS.map((_, index) => `minmax(0, ${index === activeIndex ? "1.4fr" : activeIndex === null ? "1fr" : "0.9fr"})`).join(" ")
      : "";

    return () => {
      skillsMount.style.gridTemplateColumns = "";
    };
  }, [activeIndex, wideGrid]);

  return SKILLS.map((skill, index) => (
    <GooeySkillCard
      key={skill.command}
      skill={skill}
      onIntent={(intent) => setActiveIndex((current) => (
        intent ? index : current === index ? null : current
      ))}
    />
  ));
}

const titleMount = document.querySelector("[data-gooey-title]");

if (titleMount) {
  createRoot(titleMount).render(<GooeyTitle />);
}

const skillsMount = document.querySelector("[data-gooey-skills]");

if (skillsMount) {
  createRoot(skillsMount).render(<GooeySkillGrid />);
}
