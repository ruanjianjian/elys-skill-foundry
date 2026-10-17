/** Original physical-session dispatch film. Demonstration, never a desktop recording. */
export const films = [
  {
    id: "multi-agent-coding",
    duration: 16,
    bpm: 128,
    genre: "festival-electro",
    style: "会话调度台",
    posterTime: 10.2,
  },
];
const W = 1280,
  H = 720,
  PI = Math.PI;
const sans =
    '-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif',
  serif = '"Kaiti SC","STKaiti","Songti SC",Georgia,serif',
  mono = "ui-monospace,SFMono-Regular,Menlo,monospace";
const clamp = (v) => Math.max(0, Math.min(1, v)),
  ease = (v) => 1 - Math.pow(1 - clamp(v), 3),
  smooth = (v) => {
    v = clamp(v);
    return v * v * (3 - 2 * v);
  },
  mix = (a, b, p) => a + (b - a) * p;
const phase = (t, s, d = 0.7) => ease((t - s) / d),
  hash = (n) => {
    const v = Math.sin(n * 12.98 + 78.2) * 43758.54;
    return v - Math.floor(v);
  };
const image = (src) =>
  new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`Missing dispatch art: ${src}`));
    im.src = src;
  });
export async function loadAssets() {
  return { art: await image("media/collection-art/multi-agent-coding.jpg") };
}
function text(
  c,
  s,
  x,
  y,
  size = 16,
  col = "#333e4b",
  weight = 500,
  align = "left",
  font = sans,
) {
  c.font = `${weight} ${size}px ${font}`;
  c.fillStyle = col;
  c.textAlign = align;
  c.textBaseline = "middle";
  c.fillText(s, x, y);
}
function line(c, x1, y1, x2, y2, col, width = 1) {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.strokeStyle = col;
  c.lineWidth = width;
  c.stroke();
}
function rect(c, x, y, w, h, col, r = 0) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = col;
  c.fill();
}
function alpha(c, a, fn) {
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= clamp(a);
  fn();
  c.restore();
}
function circle(c, x, y, r, col) {
  c.beginPath();
  c.arc(x, y, r, 0, PI * 2);
  c.fillStyle = col;
  c.fill();
}
function transform(c, x, y, r, s, fn) {
  c.save();
  c.translate(x, y);
  c.rotate(r);
  c.scale(s, s);
  fn();
  c.restore();
}
function cover(c, img) {
  if (!img) return;
  const iw = img.naturalWidth || img.width,
    ih = img.naturalHeight || img.height,
    s = Math.max(W / iw, H / ih);
  c.drawImage(img, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s);
}
function paper(
  c,
  {
    x,
    y,
    w = 190,
    h = 100,
    r = 0,
    s = 1,
    id = "A",
    title = "交互与界面",
    line2 = "只做确认的范围",
    opacity = 1,
    ink = "#33445c",
    filled = false,
  } = {},
) {
  alpha(c, opacity, () =>
    transform(c, x, y, r, s, () => {
      c.save();
      c.shadowColor = "#2b120b66";
      c.shadowBlur = 12;
      c.shadowOffsetX = 4;
      c.shadowOffsetY = 7;
      rect(c, -w / 2, -h / 2, w, h, filled ? "#d6e2e3" : "#f0d4a8", 2);
      c.restore();
      c.save();
      c.globalAlpha = 0.15;
      for (let i = 0; i < 48; i++)
        line(
          c,
          (hash(i + 3) - 0.5) * w,
          (hash(i + 160) - 0.5) * h,
          (hash(i + 3) - 0.5) * w + 2,
          (hash(i + 160) - 0.5) * h + 0.4,
          "#7e6242",
          0.5,
        );
      c.restore();
      line(
        c,
        -w / 2 + 15,
        -h / 2 + 25,
        w / 2 - 15,
        -h / 2 + 25,
        "#9b7a4d55",
        0.7,
      );
      text(c, id, -w / 2 + 15, -h / 2 + 15, 10, ink, 650, "left", mono);
      text(c, title, -w / 2 + 16, -h / 2 + 48, 17, ink, 550);
      text(
        c,
        line2,
        -w / 2 + 16,
        h / 2 - 17,
        11,
        "#7e624c",
        400,
        "left",
        serif,
      );
      rect(c, w / 2 - 27, -h / 2 + 9, 13, 5, "#ab5d30", 1);
    }),
  );
}
const AREAS = {
  lead: { x: 111, y: 151, w: 254, h: 160 },
  A: { x: 540, y: 223, w: 160, h: 105 },
  B: { x: 780, y: 223, w: 160, h: 105 },
  C: { x: 1032, y: 223, w: 160, h: 105 },
};
function screen(c, area, fn) {
  c.save();
  c.beginPath();
  c.roundRect(
    area.x + 5,
    area.y + 4,
    area.w - 10,
    area.h - 8,
    area === AREAS.lead ? 16 : 8,
  );
  c.clip();
  fn(area);
  c.restore();
}
function lead(c, t) {
  screen(c, AREAS.lead, (a) => {
    const x = a.x + 22,
      y = a.y + 22;
    text(c, "Claude", x, y, 20, "#69391e", 650);
    text(
      c,
      "LEAD SESSION",
      a.x + a.w - 20,
      y,
      8,
      "#9d6b43",
      500,
      "right",
      mono,
    );
    line(c, x, y + 20, a.x + a.w - 22, y + 20, "#aa78465c", 1);
    if (t < 3.7) {
      text(
        c,
        t < 1.4 ? "一个大任务" : "拆成三份简短派活单",
        x,
        y + 48,
        17,
        "#553a27",
        550,
      );
      text(c, "交互 / 数据 / 验收", x, y + 77, 14, "#89633e", 450);
      text(c, "给 Codex 开可见会话", x, y + 107, 12, "#8d6740", 500);
    } else if (t < 8.3) {
      text(c, "3 个可见 Codex 会话", x, y + 48, 17, "#553a27", 550);
      text(c, "A 交互    B 数据    C 验收", x, y + 77, 12, "#89633e", 450);
      text(c, "派活后，继续跟进", x, y + 107, 12, "#8d6740", 500);
    } else if (t < 11.7) {
      text(c, "给 Session B 的反馈", x, y + 48, 16, "#553a27", 550);
      text(c, "补齐空状态", x, y + 77, 17, "#995333", 500);
      text(c, "回到 B-01，不重开", x, y + 107, 12, "#8d6740", 500);
    } else {
      text(c, "结果已回收", x, y + 48, 18, "#553a27", 550);
      text(
        c,
        "A-01 / B-01 / C-01",
        x,
        y + 79,
        13,
        "#89633e",
        500,
        "left",
        mono,
      );
      text(c, "会话保留，可继续跟进", x, y + 107, 12, "#8d6740", 500);
    }
  });
}
function session(c, id, t, index) {
  const a = AREAS[id],
    received = phase(t, 4.4 + index * 0.45, 0.45);
  screen(c, a, () => {
    const x = a.x + 14,
      y = a.y + 17;
    text(c, `Codex / ${id}-01`, x, y, 11, "#273e57", 650, "left", mono);
    line(c, x, y + 13, a.x + a.w - 14, y + 13, "#56788a55", 0.7);
    if (received <= 0) {
      text(c, "等 Claude 派活", x, y + 38, 12, "#67828e", 450);
      text(c, "桌面会话 · 可见", x, y + 66, 9, "#728b91", 500);
    } else if (id === "B" && t >= 8.3) {
      text(c, "原任务：数据接口", x, y + 31, 9, "#64818d", 450);
      if (t >= 9.2) {
        text(c, "反馈：补齐空状态", x, y + 49, 11, "#9c5a32", 550);
        text(
          c,
          t < 10.4 ? "原会话继续修…" : "空状态已补充",
          x,
          y + 69,
          11,
          "#2e536a",
          550,
        );
      } else {
        text(c, "等待 Lead 反馈", x, y + 55, 11, "#5e7985", 450);
      }
    } else {
      text(
        c,
        ["交互与界面", "数据与边界", "核心体验验收"][index],
        x,
        y + 33,
        12,
        "#344f66",
        550,
      );
      text(
        c,
        t >= 11.7 ? "结果已返回 Lead" : "正在处理…",
        x,
        y + 56,
        10,
        "#5a7b87",
        450,
      );
      const q = clamp((t - 4.2 - index * 0.45) / 6);
      rect(c, x, y + 73, 125, 2, "#90a6af44", 1);
      rect(c, x, y + 73, 125 * q, 2, "#a76a37", 1);
    }
    if (t >= 12.7) {
      circle(c, a.x + a.w - 17, a.y + 16, 2.5, "#ad783d");
    }
  });
}
function route(t, x1, y1, x2, y2, bend = -110) {
  const q = clamp(t),
    e = smooth(q);
  return { x: mix(x1, x2, e), y: mix(y1, y2, e) + Math.sin(e * PI) * bend };
}
function tasks(c, t) {
  const labels = ["交互与界面", "数据与边界", "核心体验验收"];
  if (t < 3.7) {
    const split = phase(t, 1.5, 1.3);
    if (t < 1.8)
      paper(c, {
        x: 350,
        y: 511,
        w: 270,
        h: 190,
        r: -0.06,
        id: "CLAUDE / TASK",
        title: "这个需求，开始做",
        line2: "先说清范围与验收",
        opacity: 1 - phase(t, 1.5, 0.3),
      });
    for (let i = 2; i >= 0; i--) {
      const a = phase(t, 1.55 + i * 0.16, 0.5);
      paper(c, {
        x: mix(350, 320 + i * 225, split),
        y: mix(511, 518 + (i % 2) * 10, split),
        w: 196,
        h: 106,
        r: mix(-0.06, [-0.09, 0.02, 0.08][i], split),
        s: mix(0.9, 1, split),
        id: `${"ABC"[i]} / CODEX TASK`,
        title: labels[i],
        line2: "范围明确，原会话跟进",
        opacity: a,
      });
    }
  } else if (t < 6.7) {
    for (let i = 0; i < 3; i++) {
      const q = phase(t, 3.7 + i * 0.45, 1.1),
        pos = route(
          q,
          320 + i * 225,
          518 + (i % 2) * 10,
          [619, 860, 1112][i],
          290,
          -95,
        );
      paper(c, {
        ...pos,
        w: 196,
        h: 106,
        r: mix([-0.09, 0.02, 0.08][i], 0, q),
        s: mix(1, 0.15, q),
        id: `${"ABC"[i]} / TASK`,
        title: labels[i],
        line2: "进入可见 Session",
        opacity: 1 - phase(q, 0.86, 0.14),
      });
    }
  }
  if (t >= 8.3 && t < 10) {
    const q = phase(t, 8.3, 1.1),
      pos = route(q, 312, 355, 859, 287, -110);
    for (let k = 2; k > 0; k--)
      paper(c, {
        ...pos,
        x: pos.x - k * 12,
        w: 178,
        h: 100,
        r: -0.08,
        s: mix(0.95, 0.23, q),
        id: "FEEDBACK / B-01",
        title: "补齐空状态",
        line2: "续修原会话",
        opacity: (1 - phase(q, 0.88, 0.12)) * 0.045,
      });
    paper(c, {
      ...pos,
      w: 178,
      h: 100,
      r: mix(-0.08, 0, q),
      s: mix(0.95, 0.23, q),
      id: "FEEDBACK / B-01",
      title: "补齐空状态",
      line2: "续修原会话",
      opacity: 1 - phase(q, 0.9, 0.1),
    });
  }
  if (t >= 11.7) {
    for (let i = 0; i < 3; i++) {
      const q = phase(t, 11.7 + i * 0.33, 1),
        pos = route(
          q,
          [619, 860, 1112][i],
          329,
          350 + i * 123,
          512 + i * 8,
          85,
        );
      paper(c, {
        ...pos,
        w: 180,
        h: 104,
        r: mix(0, [-0.06, 0.01, 0.07][i], q),
        s: mix(0.22, 0.85, q),
        id: `${"ABC"[i]}-01 / RESULT`,
        title: labels[i],
        line2: "会话仍可继续",
        filled: true,
      });
    }
  }
  if (t >= 14) {
    const q = phase(t, 14, 0.6);
    paper(c, {
      x: 705,
      y: 597,
      w: 437,
      h: 95,
      r: -0.027,
      id: "VISIBLE SESSION DISPATCH",
      title: "/multi-agent-coding",
      line2: "Claude 派活 · Codex 开工",
      s: 1,
      opacity: q,
      ink: "#283f5c",
    });
  }
}
function camera(t) {
  const shots = [
    { s: 0, z: 1, x: 640, y: 360 },
    { s: 1.5, z: 1.13, x: 500, y: 385 },
    { s: 3.7, z: 1.08, x: 750, y: 345 },
    { s: 6.7, z: 1, x: 640, y: 350 },
    { s: 8.3, z: 1.9, x: 858, y: 288 },
    { s: 11.7, z: 1.07, x: 630, y: 365 },
    { s: 14, z: 1.02, x: 640, y: 380 },
  ];
  let i = 0;
  for (let j = 1; j < shots.length; j++) if (t >= shots[j].s) i = j;
  const to = shots[i],
    from = shots[Math.max(0, i - 1)],
    q = smooth((t - to.s) / 0.48);
  const z = mix(from.z, to.z, q),
    x = mix(from.x, to.x, q),
    y = mix(from.y, to.y, q);
  return {
    z,
    x: Math.max(640 / z, Math.min(W - 640 / z, x)),
    y: Math.max(360 / z, Math.min(H - 360 / z, y)),
  };
}
export function render(c, a, id, seconds = 0) {
  const t = Math.max(0, Math.min(16, Number.isFinite(seconds) ? seconds : 0)),
    cam = camera(t);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, H);
  c.save();
  c.translate(640, 360);
  c.scale(cam.z, cam.z);
  c.translate(-cam.x, -cam.y);
  cover(c, a.art);
  lead(c, t);
  for (let i = 0; i < 3; i++) session(c, "ABC"[i], t, i);
  tasks(c, t);
  c.restore();
  const cap =
    t < 3.7
      ? "Claude 派活，Codex 开工。"
      : t < 8.3
        ? "进度，看得见。"
        : t < 11.7
          ? "反馈，回到原会话。"
          : t < 14
            ? "结果回收，会话留住。"
            : "派得出，也管得住。";
  const g = c.createLinearGradient(0, 580, 0, 720);
  g.addColorStop(0, "#20130d00");
  g.addColorStop(1, "#20130db3");
  c.fillStyle = g;
  c.fillRect(0, 580, W, 140);
  text(c, cap, 52, 658, 27, "#f5ddbb", 500, "left", serif);
  text(c, "能力示意 · 非桌面实录", 1237, 697, 9, "#c5b69e", 400, "right");
  c.restore();
}
