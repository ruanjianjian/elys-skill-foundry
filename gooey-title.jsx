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
  { a: [13, 8], b: [-12, 5] },
  { a: [-7, 14], b: [11, -7] },
  { a: [9, -6], b: [-5, 10] },
];

const SKILLS = [
  {
    number: "01",
    verb: "SHAPE",
    title: "技术方案",
    command: "/elys-backend-technical-design",
    promise: "把方案钉在当前代码上",
    className: "card-design",
    fill: "#f2f5ee",
    shadow: "#1746e6",
    outline: "#11182b",
    drop: [7, 3],
  },
  {
    number: "02",
    verb: "BUILD",
    title: "代码开发",
    command: "/elys-code-development",
    promise: "真实 E2E 通过才算完成",
    className: "card-build",
    fill: "#f2f5ee",
    shadow: "#1746e6",
    outline: "#11182b",
    drop: [-5, 8],
  },
  {
    number: "03",
    verb: "MEASURE",
    title: "模型评测",
    command: "/elys-evaluation",
    promise: "先定义怎么测，再跑模型",
    className: "card-eval",
    fill: "#f2f5ee",
    shadow: "#1746e6",
    outline: "#11182b",
    drop: [8, -4],
  },
  {
    number: "04",
    verb: "SHIP",
    title: "工程交付",
    command: "/engineering-delivery",
    promise: "当前 PR Head 通过才算交付",
    className: "card-ship",
    fill: "#1746e6",
    shadow: "#e4492e",
    outline: "transparent",
    drop: [-4, 7],
  },
  {
    number: "05",
    verb: "REVIEW",
    title: "周报复盘",
    command: "/codex-weekly-session-report",
    promise: "从真实 Session 还原工作",
    className: "card-review",
    fill: "#11182b",
    shadow: "#20d5ad",
    outline: "transparent",
    drop: [7, 5],
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
          }, 110);
        }, 340);
      }, 6200);
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
          speed: 0.48,
          bounce: 0.55,
          contentBlur: 2,
          advanced: {
            bridgeGrow: 8,
            evolve: {
              anticipation: 38,
              travel: 30,
              cornerDuration: 1100,
              roundness: 1,
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

function GooeySkillCard({ skill }) {
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const flashTimer = useRef();
  const active = !reducedMotion && (hovered || focused || flashing);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const copySkill = () => {
    window.elysCopyText?.(skill.command);
    if (reducedMotion) return;

    window.clearTimeout(flashTimer.current);
    setFlashing(true);
    flashTimer.current = window.setTimeout(() => setFlashing(false), 520);
  };

  return (
    <Liquid
      className={`skill-liquid ${skill.className}-liquid${active ? " is-active" : ""}`}
      blur={10}
      contrast={20}
      fill={skill.fill}
      filterPadding={28}
      shadow={
        active
          ? `7px 7px 0 ${skill.shadow}, 0 0 0 1px ${skill.outline}, inset 0 2px 0 rgba(255, 255, 255, 0.24)`
          : `0 0 0 1px ${skill.outline}`
      }
    >
      <Liquid.Item
        className="skill-liquid-item"
        radius={18}
        morph={{
          shape: true,
          speed: active ? 0.42 : 0.12,
          bounce: active ? 0.58 : 0.24,
          contentBlur: active ? 1 : 0,
          advanced: {
            bridgeGrow: active ? 7 : 2,
            evolve: {
              anticipation: active ? 34 : 0,
              travel: active ? 24 : 0,
              cornerDuration: active ? 980 : 2600,
              roundness: 1,
            },
          },
        }}
      >
        <button
          className={`skill-card ${skill.className}`}
          type="button"
          data-copy={skill.command}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onClick={copySkill}
        >
          <span className="card-meta"><b>{skill.number}</b><i>{skill.verb}</i></span>
          <strong>{skill.title}</strong>
          <code>{skill.command}</code>
          <span className="card-promise">{skill.promise}</span>
        </button>
      </Liquid.Item>

      <Liquid.Item
        className="card-drop"
        radius={999}
        x={active ? skill.drop[0] : 0}
        y={active ? skill.drop[1] : 0}
        scale={active ? 1 : 0.01}
        transition="smooth"
        delay={45}
      >
        <i className="card-droplet" aria-hidden="true"></i>
      </Liquid.Item>
    </Liquid>
  );
}

function GooeySkillGrid() {
  useEffect(() => {
    document.documentElement.classList.add("has-gooey-skills");
    return () => document.documentElement.classList.remove("has-gooey-skills");
  }, []);

  return SKILLS.map((skill) => <GooeySkillCard key={skill.command} skill={skill} />);
}

const titleMount = document.querySelector("[data-gooey-title]");

if (titleMount) {
  createRoot(titleMount).render(<GooeyTitle />);
}

const skillsMount = document.querySelector("[data-gooey-skills]");

if (skillsMount) {
  createRoot(skillsMount).render(<GooeySkillGrid />);
}
