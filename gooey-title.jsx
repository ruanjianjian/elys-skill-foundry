import React, { useEffect, useState } from "react";
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
          }, 70);
        }, 260);
      }, 3400);
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
          speed: 0.82,
          bounce: 0.8,
          contentBlur: 3,
          advanced: {
            bridgeGrow: 10,
            evolve: {
              anticipation: 55,
              travel: 44,
              cornerDuration: 720,
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

      <Liquid.Item className="title-drop title-drop-a" radius={999} x={drops.a[0]} y={drops.a[1]} transition="bouncy" delay={35}>
        <i className="title-droplet" aria-hidden="true"></i>
      </Liquid.Item>
      <Liquid.Item className="title-drop title-drop-b" radius={999} x={drops.b[0]} y={drops.b[1]} transition="bouncy" delay={80}>
        <i className="title-droplet" aria-hidden="true"></i>
      </Liquid.Item>
    </Liquid>
  );
}

const titleMount = document.querySelector("[data-gooey-title]");

if (titleMount) {
  createRoot(titleMount).render(<GooeyTitle />);
}
