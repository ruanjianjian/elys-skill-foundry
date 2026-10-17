/** Deterministic 120 BPM motion films. All UI is capability illustration, not test evidence. */
export const FILM_DURATION = 12;
export const FILM_WIDTH = 1280;
export const FILM_HEIGHT = 720;
const W = FILM_WIDTH,
  H = FILM_HEIGHT;
const INK = "#111518",
  PAPER = "#f3f5f7",
  SILVER = "#c4cbd0",
  BLUE = "#345cff",
  LIME = "#d3ff58",
  RED = "#ff7866";
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
const mix = (a, b, p) => a + (b - a) * p;
const phase = (t, start, duration = 0.7) => ease((t - start) / duration);
function rr(c, x, y, w, h, r = 16) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}
function rect(c, x, y, w, h, fill, r = 16, stroke) {
  rr(c, x, y, w, h, r);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 1.5;
    c.stroke();
  }
}
function text(
  c,
  str,
  x,
  y,
  size = 20,
  fill = INK,
  weight = 600,
  align = "left",
  mono = false,
) {
  c.font = `${weight} ${size}px ${mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'}`;
  c.fillStyle = fill;
  c.textAlign = align;
  c.textBaseline = "middle";
  c.fillText(str || "", x, y);
}
function line(c, x1, y1, x2, y2, color = INK, width = 2, progress = 1) {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(mix(x1, x2, clamp(progress)), mix(y1, y2, clamp(progress)));
  c.lineWidth = width;
  c.strokeStyle = color;
  c.stroke();
}
function circle(c, x, y, r, fill, stroke, width = 2) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
}
function check(c, x, y, s = 18, color = INK, p = 1) {
  c.beginPath();
  c.moveTo(x - s * 0.5, y);
  if (p < 0.35)
    c.lineTo(x - s * 0.5 + s * 0.36 * (p / 0.35), y + s * 0.3 * (p / 0.35));
  else {
    c.lineTo(x - s * 0.14, y + s * 0.3);
    c.lineTo(
      mix(x - s * 0.14, x + s * 0.55, (p - 0.35) / 0.65),
      mix(y + s * 0.3, y - s * 0.4, (p - 0.35) / 0.65),
    );
  }
  c.strokeStyle = color;
  c.lineWidth = 3;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.stroke();
}
function arrow(c, x1, y1, x2, y2, color = INK, p = 1) {
  line(c, x1, y1, x2, y2, color, 2, p);
  if (p > 0.95) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    line(
      c,
      x2,
      y2,
      x2 - 11 * Math.cos(a - 0.5),
      y2 - 11 * Math.sin(a - 0.5),
      color,
    );
    line(
      c,
      x2,
      y2,
      x2 - 11 * Math.cos(a + 0.5),
      y2 - 11 * Math.sin(a + 0.5),
      color,
    );
  }
}
function layer(c, a, fn) {
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= clamp(a);
  fn();
  c.restore();
}
function move(c, x, y, angle, fn) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  fn();
  c.restore();
}
function tag(c, label, x, y, fill = INK, fg) {
  const width = label.length * 8.1 + 24;
  const rgb = /^#([0-9a-f]{6})$/i.exec(fill);
  if (!fg) {
    const n = rgb ? parseInt(rgb[1], 16) : 0;
    const luminance =
      (((n >> 16) & 255) * 0.2126 +
        ((n >> 8) & 255) * 0.7152 +
        (n & 255) * 0.0722) /
      255;
    fg = luminance > 0.55 ? INK : PAPER;
  }
  rect(c, x, y - 13, width, 26, fill, 4);
  text(c, label, x + 12, y, 11, fg, 650, "left", true);
}
function chrome(c, x, y, w, h, label = "PREVIEW", dark = false) {
  const fill = dark ? INK : "#f8faff";
  rect(c, x, y, w, h, fill, 18, dark ? "#434a4d" : "#a8b0b5");
  line(c, x + 18, y + 1, x + w - 18, y + 1, dark ? "#89969e" : "#ffffff", 1.5);
  line(c, x + 1, y + 18, x + 1, y + h - 18, dark ? "#56646d" : "#ffffff", 1);
  line(c, x, y + 32, x + w, y + 32, dark ? "#444b4d" : "#d2d7d5", 1);
  for (let i = 0; i < 3; i++)
    circle(c, x + 17 + i * 14, y + 16, 3, dark ? "#626a70" : "#bac1c2");
  text(
    c,
    label,
    x + w - 16,
    y + 16,
    10,
    dark ? "#a7afb2" : "#687378",
    500,
    "right",
    true,
  );
}
function cursor(c, x, y, color = BLUE, p = 1) {
  c.save();
  c.translate(x, y);
  c.scale(p, p);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, 29);
  c.lineTo(8, 21);
  c.lineTo(15, 34);
  c.lineTo(21, 31);
  c.lineTo(14, 18);
  c.lineTo(26, 18);
  c.closePath();
  c.fillStyle = color;
  c.fill();
  c.strokeStyle = PAPER;
  c.lineWidth = 2;
  c.stroke();
  c.restore();
}
function bars(c, x, y, w, rows = 3, color = "#bbc3c5", gap = 14) {
  for (let i = 0; i < rows; i++)
    rect(c, x, y + i * gap, w * (1 - (i % 3) * 0.17), 5, color, 2);
}
function tickBadge(c, x, y, p = 1, color = LIME) {
  circle(c, x, y, 17, color);
  check(c, x, y, 15, INK, p);
}
function miniScreen(c, x, y, w, h, label, accent = BLUE) {
  rect(c, x, y, w, h, "#e1e6e3", 10, "#b5bfc1");
  rect(c, x + 8, y + 8, w - 16, Math.min(23, h * 0.2), INK, 5);
  text(c, label, x + 15, y + 19, 9, PAPER, 650, "left", true);
  rect(c, x + 12, y + 43, w * 0.26, h * 0.32, accent, 5);
  bars(c, x + w * 0.4, y + 47, w * 0.45, 3, "#a5b1b6", 12);
  rect(c, x + 12, y + h - 26, w - 24, 13, "#c5cecc", 4);
}
function diamond(c, x, y, s, fill) {
  c.save();
  c.translate(x, y);
  c.rotate(Math.PI / 4);
  rect(c, -s / 2, -s / 2, s, s, fill, 5);
  c.restore();
}
function orbit(c, t) {
  c.save();
  c.translate(1110, 105);
  c.rotate(-0.35);
  c.strokeStyle = "#8d979a";
  c.lineWidth = 1.1;
  c.beginPath();
  c.ellipse(0, 0, 37, 13, 0, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.ellipse(0, 0, 13, 37, 0, 0, Math.PI * 2);
  c.stroke();
  circle(c, Math.cos(t * 0.65) * 37, Math.sin(t * 0.65) * 13, 4, BLUE);
  c.restore();
}
function bg(c, t, accent) {
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#f1f3f6");
  g.addColorStop(0.28, "#d2d9e0");
  g.addColorStop(0.44, "#fbfcff");
  g.addColorStop(0.52, "#bdc7d1");
  g.addColorStop(0.56, "#edf1f6");
  g.addColorStop(0.75, "#d9dfe7");
  g.addColorStop(1, "#c2cbd5");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.save();
  c.globalAlpha = 0.025;
  for (let y = 0; y < H; y += 5) line(c, 0, y, W, y, INK, 1);
  c.restore();
  c.save();
  c.globalAlpha = 0.23;
  for (let x = 30; x < W; x += 24)
    for (let y = 30; y < H; y += 24) {
      if ((x + y) % 48 === 12) rect(c, x, y, 1.5, 1.5, "#6c7c83", 0);
    }
  c.restore();
  rect(c, 40, 36, 28, 26, INK, 2);
  for (let i = 0; i < 3; i++) line(c, 48 + i * 6, 54, 53 + i * 6, 43, PAPER, 2);
  text(c, "ELYS_SKILLS / MOTION SERIES", 82, 49, 11, INK, 650, "left", true);
  text(
    c,
    "CAPABILITY DEMO / 能力示意",
    1238,
    49,
    10,
    "#5e6d73",
    500,
    "right",
    true,
  );
  line(c, 40, 80, 1240, 80, "#8e9da8", 1);
  line(c, 40, 81, 1240, 81, "#ffffff", 1);
  orbit(c, t);
  rect(c, 40, 665, 1200, 3, "#adb8bc", 0);
  rect(c, 40, 665, 1200 * clamp(t / FILM_DURATION), 3, accent, 0);
  const beat = Math.floor(t * 2);
  for (let i = 0; i < 24; i++)
    rect(c, 40 + i * 9, 683, 5, 7, i <= beat ? INK : "#a8b4b6", 0);
  text(c, "120 BPM", 1240, 687, 10, "#58696e", 500, "right", true);
}
function headline(c, s, t) {
  const done = phase(t, 9, 0.65);
  const early = (s.hook && s.hook[0]) || "把零散，变成清楚。";
  const late = (s.hook && s.hook[1]) || s.payoff || "看得见的结果。";
  layer(c, 1 - done, () =>
    text(
      c,
      t < 3 ? early : t < 6 ? late : s.payoff || s.title,
      50,
      135,
      38,
      INK,
      700,
    ),
  );
  layer(c, done, () => {
    const slug = s.command || "/" + s.id;
    c.font = "750 30px -apple-system, BlinkMacSystemFont, sans-serif";
    const slugSize = Math.min(
      30,
      (30 * 1090) / Math.max(1, c.measureText(slug).width),
    );
    text(c, slug, 50, 126, slugSize, INK, 750);
    text(c, s.payoff || s.title, 50, 164, 20, "#4a5b60", 500);
  });
}

function cards(c, t, a) {
  const gather = phase(t, 2.5, 1),
    select = phase(t, 4.5, 0.5),
    comment = phase(t, 6, 0.5),
    next = phase(t, 7.8, 0.65);
  const snippets = [
    ["先上线哪一个？", -340, -70, -0.1],
    ["这版先做什么", -270, 90, 0.1],
    ["上次选了哪项", 245, -60, 0.09],
    ["按最新结论来", 300, 100, -0.08],
  ];
  snippets.forEach(([label, x, y, r], i) =>
    move(
      c,
      mix(640 + x, 640, gather),
      mix(375 + y + 32 * (1 - phase(t, i * 0.25, 0.5)), 370, gather),
      r * (1 - gather),
      () =>
        layer(c, (1 - gather) * phase(t, i * 0.25, 0.5), () => {
          rect(c, -125, -32, 250, 64, i % 2 ? INK : "#f8faf4", 12);
          text(c, label, 0, 0, 22, i % 2 ? PAPER : INK, 550, "center");
        }),
    ),
  );
  layer(c, gather, () => {
    const x = 392 - next * 20,
      y = 223;
    move(c, 0, 0, 0, () => {
      rect(c, x + 18, y + 20, 490, 340, "#9ba7aa", 20);
      rect(c, x + 9, y + 10, 490, 340, "#d7deda", 20);
      rect(c, x, y, 490, 340, "#fafbf6", 20, "#a1adb0");
      text(
        c,
        next > 0.5 ? "DECISION 02 / 03" : "DECISION 01 / 03",
        x + 28,
        y + 32,
        11,
        "#697a7f",
        600,
        "left",
        true,
      );
      text(
        c,
        next > 0.5 ? "下一张，继续确认" : "先解决哪件事？",
        x + 28,
        y + 80,
        28,
        INK,
        700,
      );
      const p = select * (1 - next);
      rect(
        c,
        x + 28,
        y + 116,
        434,
        65,
        p > 0.5 ? LIME : "#e8ece5",
        12,
        p > 0.5 ? INK : undefined,
      );
      text(
        c,
        next > 0.5 ? "确认体验动线" : "优先打通核心体验",
        x + 48,
        y + 149,
        21,
        INK,
        600,
      );
      if (p > 0.5) check(c, x + 428, y + 148, 17, INK, p);
      rect(c, x + 28, y + 192, 434, 65, "#e7ece7", 12);
      text(
        c,
        next > 0.5 ? "补充验收方式" : "继续打磨细节",
        x + 48,
        y + 224,
        21,
        "#6a787c",
        500,
      );
      layer(c, comment * (1 - next), () => {
        rect(c, x + 28, y + 275, 434, 40, INK, 8);
        text(c, "留言：先把用户这一步做好。", x + 44, y + 295, 16, PAPER, 500);
      });
      layer(c, next, () => tag(c, "SAVED → NEXT", x + 28, y + 296, BLUE));
    });
  });
  layer(c, 1 - next, () => {
    const p = phase(t, 3.8, 0.7);
    cursor(c, mix(1070, 811, p), mix(565, 376, p), BLUE);
    if (t > 4.5 && t < 5)
      circle(c, 811, 376, 20 + (t - 4.5) * 45, null, BLUE, 2);
  });
  layer(c, next, () => {
    tickBadge(c, 950, 365, next);
    text(c, "选择 · 留言 · 留痕", 950, 410, 18, INK, 600, "center");
  });
}
function journal(c, t, a) {
  const gather = phase(t, 2.2, 1),
    latest = phase(t, 4, 0.7),
    connect = phase(t, 5.8, 0.7),
    finish = phase(t, 7.5, 0.7);
  const before = [
    [-390, -68, -0.09, "v1"],
    [-270, 95, 0.08, "v2"],
    [42, -50, -0.07, "v1"],
    [220, 83, 0.08, "v2"],
  ];
  before.forEach(([ox, oy, r, v], i) =>
    layer(c, (1 - gather) * phase(t, i * 0.25, 0.5), () =>
      move(
        c,
        640 + ox,
        380 + oy + 35 * (1 - phase(t, i * 0.25, 0.5)),
        r,
        () => {
          miniScreen(
            c,
            -105,
            -72,
            210,
            144,
            `SCREENSHOT ${v}`,
            i % 2 ? BLUE : "#a5b4b8",
          );
          tag(c, v, -90, -88, i % 2 ? BLUE : "#7a898d");
        },
      ),
    ),
  );
  layer(c, gather, () => {
    chrome(c, 155, 223, 970, 350, "TEST JOURNAL / LATEST");
    for (let i = 0; i < 3; i++) {
      const x = 205 + i * 300,
        active = phase(t, 3.15 + i * 0.5, 0.5);
      layer(c, active, () => {
        miniScreen(
          c,
          x,
          295,
          260,
          165,
          ["01 OPEN", "02 CHOOSE", "03 DONE"][i],
          i === 2 ? LIME : BLUE,
        );
        text(
          c,
          ["进入页面", "完成选择", "看到结果"][i],
          x + 130,
          492,
          20,
          INK,
          600,
          "center",
        );
        layer(c, finish, () => tickBadge(c, x + 239, 313, finish));
      });
      if (i < 2) arrow(c, x + 270, 376, x + 288, 376, INK, connect);
    }
    layer(c, latest, () => tag(c, "LATEST VALID VERSION", 180, 250, LIME));
    layer(c, finish, () => {
      rect(c, 967, 492, 130, 38, INK, 6);
      text(c, "核心动线 ✓", 1032, 511, 16, LIME, 650, "center");
    });
  });
  layer(c, 1 - gather, () => {
    text(c, "v1", 690, 537, 24, "#7a8689", 700);
    line(c, 671, 537, 713, 537, RED, 3, latest);
  });
}
function web(c, t, a) {
  const open = phase(t, 0.3, 0.8),
    narrow = phase(t, 3.2, 0.8),
    focus = phase(t, 4.8, 0.6),
    evidence = phase(t, 7.1, 0.8);
  move(c, mix(250, 145, narrow), 218, 0, () => {
    chrome(c, 0, 0, 700, 345, "BROWSER / DESKTOP");
    rect(c, 24, 57, 652, 47, INK, 7);
    rect(c, 45, 70, 86, 20, LIME, 4);
    bars(c, 163, 78, 220, 1, "#78868b");
    rect(c, 25, 129, 238, 188, BLUE, 10);
    text(c, "Aa", 144, 210, 64, PAPER, 650, "center");
    for (let i = 0; i < 3; i++) {
      rect(c, 286, 132 + i * 61, 388, 48, "#e0e7e3", 8);
      bars(c, 304, 145 + i * 61, 190, 2, "#9eacb0", 13);
    }
    layer(c, focus, () => {
      rr(c, 283, 129, 394, 54, 10);
      c.strokeStyle = BLUE;
      c.lineWidth = 3;
      c.setLineDash([8, 5]);
      c.stroke();
      c.setLineDash([]);
    });
  });
  layer(c, narrow, () => {
    chrome(c, mix(950, 906, narrow), 245, 218, 330, "390 PX");
    rect(c, 922, 294, 186, 46, INK, 6);
    rect(c, 922, 355, 186, 118, BLUE, 7);
    bars(c, 933, 491, 155, 3, "#abb8b9", 15);
  });
  const cp = phase(t, 1.2, 1);
  cursor(c, mix(1060, 754, cp), mix(590, 377, cp), BLUE);
  layer(c, focus, () => {
    line(c, 764, 394, 878, 394, BLUE, 2, narrow);
    circle(c, 881, 394, 4, BLUE);
  });
  layer(c, evidence, () => {
    tag(c, "DESKTOP", 170, 587, INK);
    tag(c, "NARROW", 909, 596, INK);
    tickBadge(c, 818, 545, evidence);
    tickBadge(c, 1099, 550, evidence);
  });
}
function phone(c, x, y, w = 236, h = 382) {
  rect(c, x + 7, y + 9, w, h, "#9ba7ab", 36);
  rect(c, x, y, w, h, INK, 36);
  rect(c, x + 9, y + 9, w - 18, h - 18, "#edf1eb", 28);
  rect(c, x + w / 2 - 35, y + 16, 70, 13, INK, 8);
  line(c, x + w / 2 - 33, y + h - 15, x + w / 2 + 33, y + h - 15, INK, 4);
}
function mobile(c, t, a) {
  const modal = phase(t, 2.5, 0.6),
    tap = phase(t, 4.1, 0.5),
    flow = phase(t, 6.1, 0.8),
    evidence = phase(t, 7.4, 0.7);
  const px = mix(515, 355, flow);
  phone(c, px, 215, 240, 390);
  rect(c, px + 24, 263, 192, 65, BLUE, 12);
  text(c, "USER FLOW", px + 120, 295, 16, PAPER, 600, "center", true);
  bars(c, px + 25, 350, 176, 3, "#b3bfc0", 18);
  rect(c, px + 24, 431, 192, 45, INK, 9);
  text(c, "继续", px + 120, 454, 19, PAPER, 650, "center");
  layer(c, modal * (1 - tap), () => {
    rect(c, px + 10, 250, 220, 330, "#1a242566", 20);
    rect(c, px + 25, 339, 190, 135, PAPER, 16);
    text(c, "允许通知？", px + 120, 375, 24, INK, 650, "center");
    line(c, px + 25, 411, px + 215, 411, "#c3cdca", 1);
    text(c, "允许", px + 120, 443, 21, BLUE, 650, "center");
  });
  layer(c, phase(t, 3.4, 0.4) * (1 - flow), () => {
    const y = mix(541, 444, tap);
    circle(c, px + 120, y, 18, "#345cff29", BLUE, 2);
    circle(c, px + 120, y, 5, BLUE);
    line(c, px + 120, y + 31, px + 120, y + 64, BLUE, 2);
  });
  layer(c, tap, () => {
    circle(c, px + 120, 528, 27, LIME);
    check(c, px + 120, 528, 24, INK, tap);
  });
  layer(c, flow, () => {
    for (let i = 0; i < 3; i++) {
      const x = 690 + i * 130;
      miniScreen(
        c,
        x,
        287 + i * 36,
        112,
        165,
        ["OPEN", "ALLOW", "DONE"][i],
        i === 2 ? LIME : BLUE,
      );
      arrow(c, x + 56, 468 + i * 36, x + 56, 494 + i * 36, INK, evidence);
    }
    tag(c, "DEVICE → EVIDENCE", 692, 572, INK);
  });
}
function blueprint(c, t, a) {
  const resolve = phase(t, 2.5, 1),
    links = phase(t, 4.5, 0.8),
    contract = phase(t, 6.5, 0.7);
  const loose = [
    [-370, -50, -0.1],
    [-205, 94, 0.11],
    [89, -79, -0.06],
    [298, 94, 0.09],
  ];
  loose.forEach(([x, y, r], i) =>
    layer(c, (1 - resolve) * phase(t, i * 0.25, 0.5), () =>
      move(c, 640 + x, 390 + y + 30 * (1 - phase(t, i * 0.25, 0.5)), r, () => {
        rect(c, -90, -63, 180, 126, i === 1 ? INK : "#f5f7f1", 10, "#a2b0b3");
        text(
          c,
          ["API", "MODEL", "QUEUE", "CLIENT"][i],
          -65,
          -34,
          14,
          i === 1 ? LIME : BLUE,
          650,
          "left",
          true,
        );
        bars(c, -64, -8, 113, 4, i === 1 ? "#68777b" : "#a8b7bb", 17);
      }),
    ),
  );
  layer(c, resolve, () => {
    const nodes = [
      [175, 350, BLUE, "CLIENT"],
      [503, 290, INK, "CONTRACT"],
      [905, 255, INK, "DATA"],
      [905, 440, INK, "EVENTS"],
    ];
    arrow(c, 375, 391, 503, 351, BLUE, links);
    arrow(c, 743, 335, 905, 305, INK, links);
    arrow(c, 743, 380, 905, 489, INK, links);
    nodes.forEach(([x, y, col, label], i) => {
      rect(c, x, y, i === 1 ? 240 : 200, 100, col, 14);
      text(
        c,
        label,
        x + (i === 1 ? 120 : 100),
        y + 42,
        19,
        col === BLUE ? PAPER : LIME,
        650,
        "center",
        true,
      );
      text(
        c,
        ["交互边界", "输入 · 输出 · 失败", "数据归属", "状态变化"][i],
        x + (i === 1 ? 120 : 100),
        y + 73,
        15,
        PAPER,
        500,
        "center",
      );
    });
    layer(c, contract, () => {
      rect(c, 458, 261, 330, 165, null, 18, BLUE);
      tag(c, "FROZEN", 550, 451, LIME);
      line(c, 622, 426, 622, 435, BLUE, 2);
      tickBadge(c, 774, 275, contract);
    });
  });
}
function build(c, t, a) {
  const red = phase(t, 0.5, 0.5),
    green = phase(t, 3.4, 0.65),
    e2e = phase(t, 5.6, 0.8),
    done = phase(t, 7.5, 0.7);
  chrome(c, 147, 222, 512, 340, "CONTRACT → CODE", true);
  text(c, "test / core journey", 177, 282, 18, "#a8babf", 500, "left", true);
  for (let i = 0; i < 4; i++) {
    text(
      c,
      (i === 2 ? "  return " : "  const ") +
        [
          "entry = open()",
          "choice = choose()",
          "visible(result)",
          "proof = capture()",
        ][i],
      177,
      333 + i * 32,
      17,
      i === 2 ? LIME : "#a5b8be",
      500,
      "left",
      true,
    );
  }
  const color = green > 0.45 ? LIME : RED;
  rect(c, 175, 493, 455, 41, color, 7);
  text(
    c,
    green > 0.45 ? "✓ CORE TEST PASSED" : "× CORE TEST FAILED",
    195,
    514,
    16,
    INK,
    650,
    "left",
    true,
  );
  layer(c, e2e, () => {
    arrow(c, 678, 392, 725, 392, INK, e2e);
    chrome(c, 744, 267, 385, 263, "END TO END");
    rect(c, 768, 317, 337, 50, BLUE, 6);
    for (let i = 0; i < 3; i++) {
      const p = phase(t, 6.1 + i * 0.4, 0.4);
      circle(c, 795 + i * 135, 419, 20, p > 0.5 ? LIME : "#d7e0d9");
      layer(c, p, () => check(c, 795 + i * 135, 419, 18, INK, p));
      if (i < 2)
        line(c, 818 + i * 135, 419, 904 + i * 135, 419, "#8ea0a5", 2, p);
    }
    text(c, "OPEN → ACT → SEE", 936, 486, 14, INK, 650, "center", true);
  });
  layer(c, done, () => {
    tag(c, "RED → GREEN → E2E", 780, 572, INK);
  });
}
function evalFilm(c, t, a) {
  const sample = phase(t, 0.5, 0.7),
    matrix = phase(t, 3, 0.9),
    compare = phase(t, 5, 0.8),
    choose = phase(t, 7.3, 0.7);
  layer(c, 1 - matrix, () => {
    for (let j = 0; j < 2; j++) {
      chrome(
        c,
        230 + j * 440,
        240,
        380,
        290,
        j === 0 ? "MODEL A" : "MODEL B",
        j === 0,
      );
      for (let i = 0; i < 3; i++) {
        rect(
          c,
          255 + j * 440,
          302 + i * 65,
          330,
          48,
          j === 0 ? "#293337" : "#e0e8e2",
          7,
        );
        text(
          c,
          `SAMPLE 0${i + 1}`,
          273 + j * 440,
          326 + i * 65,
          17,
          j === 0 ? LIME : INK,
          550,
          "left",
          true,
        );
      }
    }
  });
  layer(c, matrix, () => {
    chrome(c, 215, 221, 850, 360, "SAME SAMPLES / SAME CRITERIA");
    text(c, "样本", 262, 291, 20, INK, 650);
    text(c, "A", 627, 291, 21, INK, 700, "center", true);
    text(c, "B", 872, 291, 21, INK, 700, "center", true);
    line(c, 241, 317, 1040, 317, "#aebbbb", 1);
    for (let i = 0; i < 3; i++) {
      text(
        c,
        ["核心意图", "信息完整", "边界表达"][i],
        262,
        355 + i * 70,
        20,
        INK,
        600,
      );
      for (let j = 0; j < 2; j++) {
        const p = phase(t, 4 + i * 0.45 + j * 0.25, 0.45),
          x = 627 + j * 245,
          y = 355 + i * 70;
        layer(c, p, () => {
          if (j === 1 || i !== 1) check(c, x, y, 20, INK);
          else {
            circle(c, x, y, 12, null, "#8b9b9f", 2);
            line(c, x - 6, y, x + 6, y, "#8b9b9f", 2);
          }
        });
      }
      if (i < 2) line(c, 241, 386 + i * 70, 1040, 386 + i * 70, "#d1d9d5", 1);
    }
    layer(c, choose, () => {
      rect(c, 755, 267, 230, 276, null, 12, BLUE);
      tag(c, "EVIDENCE FIRST", 771, 558, BLUE);
      tickBadge(c, 983, 267, choose);
    });
  });
}
function ship(c, t, a) {
  const head = phase(t, 2, 0.7),
    gate = phase(t, 3.5, 0.8),
    checks = phase(t, 5.1, 0.8),
    pack = phase(t, 7.2, 0.8);
  layer(c, 1 - phase(t, 6.9, 0.25), () => {
    chrome(c, 160, 248, 355, 280, "PULL REQUEST", true);
    text(c, "PR / HEAD", 188, 310, 24, PAPER, 650, "left", true);
    rect(c, 188, 346, 299, 40, "#313e43", 6);
    text(
      c,
      head > 0.5 ? "LATEST SHA" : "PREVIOUS SHA",
      205,
      367,
      16,
      head > 0.5 ? LIME : "#a9b9bc",
      650,
      "left",
      true,
    );
    layer(c, head, () => {
      line(c, 188, 407, 486, 407, LIME, 3, head);
      tag(c, "HEAD CHANGED", 188, 453, LIME);
    });
    arrow(c, 532, 389, 605, 389, INK, gate);
    for (let i = 0; i < 3; i++) {
      const p = phase(t, 4.4 + i * 0.6, 0.45);
      rect(c, 625, 252 + i * 103, 455, 80, PAPER, 12, "#a7b7b8");
      text(
        c,
        ["规格一致", "代码与证据一致", "验收与报告齐全"][i],
        652,
        292 + i * 103,
        22,
        INK,
        600,
      );
      layer(c, p, () => tickBadge(c, 1041, 292 + i * 103, p));
    }
  });
  layer(c, pack, () => {
    const p = pack;
    rect(c, 423, 239, 434, 326, INK, 24);
    for (let i = 0; i < 3; i++) {
      const x = 466 + i * 113;
      rect(c, x, 284, 90, 116, i === 1 ? LIME : PAPER, 9);
      text(
        c,
        ["SPEC", "CODE", "PROOF"][i],
        x + 45,
        335,
        14,
        INK,
        650,
        "center",
        true,
      );
      bars(c, x + 15, 363, 60, 2, "#9aabae", 13);
    }
    line(c, 452, 433, 829, 433, "#657b80", 1);
    text(c, "DELIVERY", 454, 477, 28, PAPER, 650, "left", true);
    tickBadge(c, 796, 476, p);
    tag(c, "EXACT HEAD", 562, 586, BLUE);
  });
}
function weekly(c, t, a) {
  const collect = phase(t, 2.5, 1),
    timeline = phase(t, 4, 0.8),
    report = phase(t, 6.7, 0.8);
  const loose = [
    [-384, -57, -0.1],
    [-211, 113, 0.07],
    [87, -43, 0.06],
    [300, 89, -0.09],
  ];
  loose.forEach(([x, y, r], i) =>
    layer(c, (1 - collect) * phase(t, i * 0.25, 0.5), () =>
      move(c, 640 + x, 379 + y + 30 * (1 - phase(t, i * 0.25, 0.5)), r, () => {
        rect(c, -98, -60, 196, 120, i % 2 ? INK : PAPER, 10);
        text(
          c,
          `SESSION / 0${i + 1}`,
          -77,
          -30,
          12,
          i % 2 ? LIME : BLUE,
          650,
          "left",
          true,
        );
        bars(c, -76, -3, 142, 4, i % 2 ? "#687f85" : "#a3b6b9", 15);
      }),
    ),
  );
  layer(c, collect * (1 - report), () => {
    line(c, 186, 392, 1094, 392, INK, 3, timeline);
    for (let i = 0; i < 5; i++) {
      const p = phase(t, 3.4 + i * 0.35, 0.45);
      const x = 198 + i * 220;
      layer(c, p, () => {
        circle(c, x, 392, 12, i === 4 ? LIME : BLUE);
        text(
          c,
          ["MON", "TUE", "WED", "THU", "FRI"][i],
          x,
          445,
          16,
          INK,
          650,
          "center",
          true,
        );
        for (let j = 0; j < 2 + (i % 2); j++)
          rect(c, x - 41, 288 + j * 24, 82, 16, j === 0 ? INK : "#a0b1b5", 3);
        line(c, x, 349, x, 378, "#8a9fa5", 1);
      });
    }
  });
  layer(c, report, () => {
    chrome(c, 335, 221, 610, 375, "WEEKLY / SOURCED");
    text(c, "THIS WEEK", 365, 289, 33, INK, 750, "left", true);
    for (let i = 0; i < 3; i++) {
      const y = 349 + i * 70;
      rect(c, 365, y - 17, 39, 34, i === 0 ? BLUE : INK, 5);
      text(c, ["01", "02", "03"][i], 384, y, 13, PAPER, 650, "center", true);
      bars(c, 428, y - 11, 300, 2, "#b0bfc0", 17);
      text(c, ["完成", "阻塞", "下一步"][i], 838, y, 19, INK, 650, "center");
    }
    tag(c, "BACKED BY SESSIONS", 365, 568, LIME);
  });
}
const RENDERERS = {
  cards,
  journal,
  web,
  mobile,
  blueprint,
  build,
  eval: evalFilm,
  ship,
  weekly,
};
/** Render a standalone frame. Caller owns timing, pause, reduced-motion and encoding. */
export function renderFilm(ctx, skill = {}, seconds = 0) {
  const t = Math.max(
    0,
    Math.min(FILM_DURATION, Number.isFinite(seconds) ? seconds : 0),
  );
  const accent = skill.accent || BLUE;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  bg(ctx, t, accent);
  headline(ctx, skill, t);
  const renderer = RENDERERS[skill.visual] || RENDERERS.cards;
  // Four shot changes land on six-beat bars; geometry settles over one beat.
  const shotProgress = phase(t, Math.floor(Math.min(t, 11.99) / 3) * 3, 0.5);
  const shotScale = 1 + 0.06 * (1 - shotProgress);
  ctx.save();
  ctx.translate(640, 412);
  ctx.scale(shotScale, shotScale);
  ctx.translate(-640, -412);
  renderer(ctx, t, accent);
  // A tiny focus index catches every half-beat; it never changes scene luminance.
  const subBeat = Math.floor(t * 4) % 4;
  for (let i = 0; i < 4; i++)
    rect(ctx, 1168 + i * 15, 195, 8, 5, i === subBeat ? accent : "#8c9caa", 1);
  ctx.restore();
  // A restrained edit marker every six beats. No luminance flashes or random noise.
  const cut = Math.floor(t / 3);
  text(
    ctx,
    `0${Math.min(4, cut + 1)} / 04`,
    50,
    620,
    11,
    "#5c7077",
    650,
    "left",
    true,
  );
  const small =
    t < 3
      ? "整理之前"
      : t < 6
        ? "开始收拢"
        : t < 9
          ? "看见结果"
          : "READY TO USE";
  text(ctx, small, 1238, 620, 11, "#5c7077", 500, "right", true);
  ctx.restore();
}
