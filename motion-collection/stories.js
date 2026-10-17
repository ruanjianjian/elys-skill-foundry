// Three separate physical worlds; all foreground motion is derived from time.
export const films = [
  {
    id: "elys-evaluation",
    duration: 14,
    bpm: 138,
    genre: "hyper-glass",
    style: "光学实验",
    posterTime: 10.6,
  },
  {
    id: "engineering-delivery",
    duration: 16,
    bpm: 124,
    genre: "synthwave-house",
    style: "夜航快递",
    posterTime: 7.36,
  },
  {
    id: "codex-weekly-session-report",
    duration: 16,
    bpm: 118,
    genre: "nu-disco",
    style: "编辑手账",
    posterTime: 12.8,
  },
];

const W = 1280,
  H = 720,
  PI = Math.PI;
const clamp = (v) => Math.max(0, Math.min(1, v));
const smooth = (v) => {
  v = clamp(v);
  return v * v * (3 - 2 * v);
};
const out = (v) => 1 - Math.pow(1 - clamp(v), 3);
const q = (t, s, d = 1) => smooth((t - s) / d);
const mix = (a, b, p) => a + (b - a) * p;
const hash = (n) => {
  const v = Math.sin(n * 72.31 + 19.7) * 43758.5453;
  return v - Math.floor(v);
};
const sans =
  '-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';
const serif = '"Songti SC","STSong",Georgia,serif';
const mono = "ui-monospace,SFMono-Regular,Menlo,monospace";

export async function loadAssets(id) {
  if (!films.some((f) => f.id === id))
    throw new Error(`Unknown story film: ${id}`);
  const src = new URL(`../media/collection-art/${id}.jpg`, import.meta.url)
    .href;
  const art = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Cannot load story art: ${src}`));
    image.src = src;
  });
  return { art };
}

function text(
  c,
  s,
  x,
  y,
  size = 18,
  col = "#eee9df",
  weight = 500,
  align = "left",
  font = sans,
) {
  c.font = `${weight} ${size}px ${font}`;
  c.textBaseline = "middle";
  c.textAlign = align;
  c.fillStyle = col;
  c.fillText(s, x, y);
}
function path(c, points, fill, stroke, lw = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = lw;
    c.stroke();
  }
}
function rect(c, x, y, w, h, col, r = 0) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = col;
  c.fill();
}
function line(c, x1, y1, x2, y2, col, lw = 1) {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.stroke();
}
function circle(c, x, y, r, fill, stroke, lw = 1) {
  c.beginPath();
  c.arc(x, y, r, 0, PI * 2);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = lw;
    c.stroke();
  }
}
function move(c, x, y, angle, scale, fn) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.scale(scale, scale);
  fn();
  c.restore();
}
function alpha(c, a, fn) {
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= clamp(a);
  fn();
  c.restore();
}
function cover(c, img) {
  const s = Math.max(W / img.width, H / img.height);
  c.drawImage(
    img,
    (W - img.width * s) / 2,
    (H - img.height * s) / 2,
    img.width * s,
    img.height * s,
  );
}
function world(c, img, { zoom = 1, x = 640, y = 360, roll = 0 } = {}, fn) {
  // A cut may pan only while the enlarged plate still covers the full aperture.
  x = Math.max(W / (2 * zoom), Math.min(W - W / (2 * zoom), x));
  y = Math.max(H / (2 * zoom), Math.min(H - H / (2 * zoom), y));
  c.save();
  c.translate(640, 360);
  c.rotate(roll);
  c.scale(zoom, zoom);
  c.translate(-x, -y);
  cover(c, img);
  fn?.();
  c.restore();
}
function caption(c, s, dark = false) {
  c.save();
  const g = c.createLinearGradient(0, 575, 0, H);
  g.addColorStop(0, dark ? "#eee5d400" : "#06071100");
  g.addColorStop(1, dark ? "#eee5d4e8" : "#060711e0");
  c.fillStyle = g;
  c.fillRect(0, 575, W, 145);
  text(c, s, 57, 650, 27, dark ? "#34262a" : "#f4eadb", 500, "left", serif);
  c.restore();
}
function label(c, id, dark = false) {
  text(
    c,
    "能力示意",
    1228,
    684,
    10,
    dark ? "#735b58" : "#d1bfaa",
    400,
    "right",
  );
  if (id)
    text(c, id, 57, 58, 13, dark ? "#6a4650" : "#e6d3b5", 500, "left", mono);
}
function shadow(c, fn, col = "#07040b77", blur = 12, dy = 9) {
  c.save();
  c.shadowColor = col;
  c.shadowBlur = blur;
  c.shadowOffsetY = dy;
  fn();
  c.restore();
}

// Optical specimens are physical slides. Identical dot notches identify the batch
// across both channels and again when the same batch is replayed.
function specimen(
  c,
  x,
  y,
  seed,
  scale = 1,
  { diff = false, version = "", angle = 0 } = {},
) {
  move(c, x, y, angle, scale, () => {
    shadow(
      c,
      () =>
        path(
          c,
          [
            [-40, -25],
            [41, -27],
            [48, 24],
            [-33, 29],
          ],
          "#bdd4e022",
          "#d6edf496",
          1.2,
        ),
      "#02030699",
      10,
      7,
    );
    line(c, -34, -20, 35, -22, "#e1f5ffbb", 1);
    const col = ["#a8ccef", "#d2b5ed", "#e4c894", "#bed8d0"][seed % 4];
    c.save();
    c.shadowColor = col;
    c.shadowBlur = 10;
    circle(c, diff ? 7 : 0, 0, 9, col);
    c.restore();
    if (diff) circle(c, 0, 0, 13, null, "#ffd29a", 1.5);
    for (let n = 0; n <= seed % 3; n++)
      circle(c, -24 + n * 5, 18, 1.4, "#b8cbd8");
    if (version) text(c, version, -29, -14, 8, "#e4ecf4", 500, "left", mono);
  });
}
function beam(c, points, col, opacity = 1, lw = 2) {
  alpha(c, opacity, () => {
    c.save();
    c.globalCompositeOperation = "screen";
    c.shadowColor = col;
    c.shadowBlur = 13;
    c.strokeStyle = col;
    c.lineWidth = lw;
    c.lineCap = "round";
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
    c.restore();
  });
}
function bead(c, a, b, p, col) {
  const x = mix(a[0], b[0], p),
    y = mix(a[1], b[1], p);
  c.save();
  c.shadowColor = col;
  c.shadowBlur = 16;
  circle(c, x, y, 3, col);
  c.restore();
}
function optics(c, a, t) {
  let camera = { zoom: 1.02, x: 640, y: 365 };
  if (t < 2.3) camera = { zoom: 1.14, x: 535, y: 398 };
  else if (t >= 5.2 && t < 8.3) camera = { zoom: 1.84, x: 922, y: 307 };
  else if (t >= 8.3 && t < 11.2) camera = { zoom: 1.05, x: 665, y: 370 };
  else if (t >= 11.2) camera = { zoom: 1.12, x: 620, y: 408 };
  world(c, a.art, camera, () => {
    const bright = 0.28 + 0.2 * Math.sin((t * PI * 116) / 60) ** 2;
    beam(
      c,
      [
        [89, 244],
        [400, 263],
      ],
      "#eff4ff",
      bright,
      3,
    );
    beam(
      c,
      [
        [400, 263],
        [1106, 213],
      ],
      "#b7c7ff",
      bright,
      2,
    );
    beam(
      c,
      [
        [400, 263],
        [1107, 355],
      ],
      "#e8c295",
      bright,
      2,
    );
    if (t < 2.3) {
      const into = out(t / 1.8);
      for (let i = 0; i < 6; i++)
        specimen(
          c,
          mix(-100 + i * 90, 213 + i * 59, into),
          mix(730, 548 + (i % 2) * 6, into),
          i,
          0.75,
          { angle: -0.1 },
        );
      for (let i = 0; i < 6; i++) {
        const p = clamp((t - 0.35 - i * 0.17) / 1.4);
        if (p > 0 && p < 1) bead(c, [89, 244], [400, 263], p, "#f1f5ff");
      }
      text(c, "SAME SAMPLE SET", 210, 588, 11, "#bacbd5", 400, "left", mono);
    } else if (t < 5.2) {
      const flow = q(t, 2.3, 1.45);
      for (let row = 0; row < 2; row++) {
        text(
          c,
          row ? "候选 B" : "参考 A",
          812,
          row ? 397 : 187,
          12,
          "#d6d7df",
          500,
        );
        for (let i = 0; i < 4; i++) {
          const p = clamp(flow * 1.25 - i * 0.09);
          specimen(
            c,
            mix(411, 795 + i * 81, p),
            mix(267, row ? 354 : 235, p),
            i,
            0.72,
            { version: row ? "B" : "A" },
          );
          bead(
            c,
            [400, 263],
            [1107, row ? 355 : 213],
            (t * 0.54 + i * 0.21) % 1,
            row ? "#efd5ab" : "#b6d1ff",
          );
        }
      }
    } else if (t < 8.3) {
      const reveal = q(t, 5.25, 0.8);
      for (let row = 0; row < 2; row++)
        for (let i = 0; i < 4; i++)
          specimen(c, 795 + i * 81, row ? 354 : 235, i, 0.72, {
            diff: row === 1 && i === 2 && reveal > 0.3,
            version: row ? "B" : "A",
          });
      const scan = mix(758, 1124, q(t, 5.45, 1.6));
      beam(
        c,
        [
          [scan, 187],
          [scan, 396],
        ],
        "#f1dcc3",
        0.48,
        1.2,
      );
      if (t > 6.5) {
        c.setLineDash([3, 4]);
        line(c, 957, 256, 957, 333, "#e6be91", 1);
        c.setLineDash([]);
      }
    } else if (t < 11.2) {
      const rewind = q(t, 8.3, 0.85),
        again = q(t, 9.35, 1.35);
      for (let row = 0; row < 2; row++)
        for (let i = 0; i < 4; i++) {
          const x =
            t < 9.35
              ? mix(795 + i * 81, 416, rewind)
              : mix(416, 795 + i * 81, again);
          const y =
            t < 9.35
              ? mix(row ? 354 : 235, 269, rewind)
              : mix(269, row ? 354 : 235, again);
          specimen(c, x, y, i, 0.72, {
            diff: row === 1 && i === 2 && again > 0.6,
            version: row ? "B" : "A",
          });
        }
    } else {
      const land = q(t, 11.2, 0.9);
      move(c, 613, mix(744, 521, land), -0.08, 1, () => {
        shadow(
          c,
          () =>
            path(
              c,
              [
                [-245, -105],
                [247, -112],
                [258, 104],
                [-237, 111],
              ],
              "#15202ae8",
              "#9cb3bd",
              1,
            ),
          "#000b",
          22,
          14,
        );
        text(c, "A / B", -205, -65, 17, "#e7d8c0", 500, "left", mono);
        text(
          c,
          "同批样本，同一尺度。",
          -205,
          -22,
          24,
          "#ede3d4",
          500,
          "left",
          serif,
        );
        line(c, -205, 12, 209, 12, "#91a9b84f");
        ["样本", "版本", "记录"].forEach((s, i) => {
          specimen(c, -166 + i * 169, 63, i, 0.55, {
            version: ["SET", "A · B", "LOG"][i],
          });
          text(c, s, -127 + i * 169, 62, 13, "#c4d1d5", 500);
        });
      });
    }
  });
  caption(
    c,
    t < 2.3
      ? "同一束输入。"
      : t < 5.2
        ? "放进两个通道。"
        : t < 8.3
          ? "差异，显出来。"
          : t < 11.2
            ? "用同批样本再测。"
            : "每次比较，都能回溯。",
  );
  label(c, t >= 11.2 ? "elys-evaluation" : "");
}

// Physical parcel, retaining the same folded corner and PR seal in every shot.
function fiberFace(c, points, base, light, seed) {
  c.save();
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.clip();
  const g = c.createLinearGradient(-85, -60, 70, 90);
  g.addColorStop(0, light);
  g.addColorStop(1, base);
  c.fillStyle = g;
  c.fillRect(-100, -80, 210, 190);
  for (let i = 0; i < 340; i++) {
    const x = -95 + hash(seed + i) * 195,
      y = -73 + hash(seed + 800 + i) * 170;
    c.globalAlpha = 0.06 + hash(seed + 400 + i) * 0.12;
    c.fillStyle = i % 3 ? "#3a2030" : "#ffdfac";
    c.fillRect(
      x,
      y,
      hash(seed + 1200 + i) * 2.8 + 0.4,
      0.5 + hash(seed + 1600 + i) * 1.4,
    );
  }
  c.restore();
  path(c, points, null, "#4b2b3c", 1.1);
}
function parcel(c, x, y, s = 1, { fixed = false, tag = 0, tilt = 0 } = {}) {
  move(c, x, y, tilt, s, () => {
    shadow(
      c,
      () => {
        c.beginPath();
        c.ellipse(7, 76, 82, 16, -0.15, 0, PI * 2);
        c.fillStyle = "#1c0e284d";
        c.fill();
      },
      "#160a27aa",
      17,
      4,
    );
    fiberFace(
      c,
      [
        [-81, -40],
        [31, -62],
        [87, -25],
        [-27, -2],
      ],
      "#ad754e",
      "#dcb17b",
      21,
    );
    fiberFace(
      c,
      [
        [-81, -40],
        [-27, -2],
        [-27, 79],
        [-81, 34],
      ],
      "#6f4341",
      "#a0694c",
      33,
    );
    fiberFace(
      c,
      [
        [-27, -2],
        [87, -25],
        [87, 52],
        [-27, 79],
      ],
      "#a06a48",
      "#c59463",
      47,
    );
    line(c, -78, -39, -28, -3, "#e6b88088", 1);
    line(c, -27, -1, 84, -24, "#e6b88088", 1);
    path(
      c,
      [
        [-18, -52],
        [0, -55],
        [55, -36],
        [37, -32],
      ],
      "#e5b675",
    );
    path(
      c,
      [
        [37, -32],
        [55, -36],
        [55, 59],
        [37, 63],
      ],
      "#d9a365",
    );
    text(c, "PR", -1, 33, 20, "#563043", 650, "left", mono);
    if (!fixed)
      path(
        c,
        [
          [56, -17],
          [64, -5],
          [51, 12],
          [67, 25],
        ],
        null,
        "#6f293e",
        3,
      );
    else {
      path(
        c,
        [
          [46, -13],
          [70, -17],
          [70, 28],
          [46, 32],
        ],
        "#e7b774",
      );
      line(c, 50, -2, 65, 18, "#ae724e", 1);
    }
    circle(c, -50, -23, 3.5, "#5c3441");
    if (tag > 0) reviewTag(c, 45, -7, -0.12 + tag * 0.1, 1);
  });
}
function reviewTag(c, x, y, angle = 0, s = 1, done = false) {
  move(c, x, y, angle, s, () => {
    line(c, -13, -29, 0, 0, "#c6aa86", 1.5);
    shadow(
      c,
      () =>
        path(
          c,
          [
            [-5, -2],
            [61, -2],
            [75, 11],
            [61, 60],
            [-5, 60],
          ],
          done ? "#c39162" : "#94394d",
          "#3e2436",
          1,
        ),
      "#1d0f2355",
      5,
      4,
    );
    circle(c, 5, 8, 3, "#482e3b");
    text(
      c,
      done ? "回应" : "待修",
      32,
      29,
      17,
      done ? "#372733" : "#ffdbbe",
      550,
      "center",
      serif,
    );
  });
}
function gate(c, open, t) {
  // The bar is deliberately in front of the parcel, establishing occlusion.
  move(c, 524, 342, -PI * 0.46 * open, 1, () => {
    shadow(
      c,
      () =>
        path(
          c,
          [
            [0, -10],
            [220, -10],
            [220, 11],
            [0, 11],
          ],
          "#c48b61",
          "#4c2c40",
          1,
        ),
      "#21102066",
      8,
      5,
    );
    for (let i = 0; i < 5; i++)
      path(
        c,
        [
          [13 + i * 43, -9],
          [30 + i * 43, -9],
          [18 + i * 43, 10],
          [1 + i * 43, 10],
        ],
        "#68435a",
      );
  });
  circle(c, 524, 342, 12, "#9d735c", "#35273d", 2);
  const sweep = (t * 1.3) % 1;
  alpha(c, 0.27, () =>
    line(c, 553 + 135 * sweep, 295, 553 + 135 * sweep, 409, "#ffdb9d", 1.5),
  );
}
function plane(c, x, y, s, fold = 1, angle = -0.15) {
  move(c, x, y, angle, s, () => {
    const wing = 42 * fold;
    shadow(
      c,
      () =>
        path(
          c,
          [
            [-90, -wing],
            [104, 0],
            [-88, wing],
            [-38, 0],
          ],
          "#e8ba86",
          "#61404b",
          1.4,
        ),
      "#0f071e66",
      9,
      10,
    );
    path(
      c,
      [
        [-90, -wing],
        [104, 0],
        [-38, 0],
      ],
      "#b77b5d",
    );
    path(
      c,
      [
        [-38, 0],
        [104, 0],
        [-51, 18 * fold],
      ],
      "#f3cea0",
    );
    line(c, -38, 0, 103, 0, "#805546", 1);
    text(c, "PR", -44, 7, 9, "#653b45", 600, "center", mono);
  });
}
function dispatch(c, a, t) {
  const step = Math.floor(t * 12) / 12;
  let camera = { zoom: 1.04, x: 626, y: 382 };
  if (t >= 3.2 && t < 6.1) camera = { zoom: 1.42, x: 595, y: 411 };
  else if (t >= 6.1 && t < 9.5) camera = { zoom: 1.25, x: 599, y: 419 };
  else if (t >= 9.5 && t < 12.8) camera = { zoom: 1.16, x: 711, y: 342 };
  else if (t >= 12.8) camera = { zoom: 1.02, x: 640, y: 360 };
  world(c, a.art, camera, () => {
    for (let i = 0; i < 8; i++) {
      const k = (step * 0.75 + i / 8) % 1;
      line(
        c,
        mix(152, 619, k),
        mix(581, 417, k),
        mix(170, 638, k),
        mix(583, 419, k),
        "#c4987059",
        1,
      );
    }
    if (t < 3.2) {
      const travel = out(t / 2.6),
        stop = q(t, 2.58, 0.3);
      parcel(
        c,
        mix(133, 605, travel) - stop * 20,
        mix(575, 415, travel),
        mix(1.22, 0.88, travel),
        { tilt: Math.sin(step * 4) * 0.009, tag: q(t, 2.65, 0.35) },
      );
      gate(c, 0, t);
    } else if (t < 6.1) {
      parcel(c, 585, 417, 0.91, { tag: 1 });
      gate(c, 0, t);
      alpha(c, q(t, 3.2, 0.55), () => reviewTag(c, 755, 320, 0.2, 0.9));
      const angle = Math.sin(step * 2) * 0.07;
      move(c, 770, 327, angle, 1, () =>
        line(c, -50, 57, -132, 92, "#dcab7a", 1),
      );
    } else if (t < 9.5) {
      const repair = q(t, 6.4, 1.35);
      parcel(c, 585, 417, 0.91, {
        fixed: repair > 0.66,
        tag: 1 - q(t, 8.15, 0.5),
      });
      if (repair < 1) {
        move(c, mix(955, 634, repair), mix(280, 422, repair), -0.18, 1, () => {
          shadow(
            c,
            () => rect(c, -14, -58, 28, 115, "#e8b678", 2),
            "#21102477",
            8,
            6,
          );
          line(c, -9, -45, 9, 43, "#bb8b58", 1);
          circle(c, 0, -69, 21, "#bc875d", "#432b40", 4);
        });
      }
      if (t >= 8.15) {
        const remove = q(t, 8.15, 0.8);
        reviewTag(
          c,
          mix(626, 907, remove),
          mix(410, 161, remove) - Math.sin(remove * PI) * 60,
          remove * 2,
          0.8 * (1 - remove),
        );
      }
      gate(c, 0, t);
    } else if (t < 12.8) {
      const pass = q(t, 9.5, 2.0),
        fold = q(t, 11.35, 0.9);
      const x = mix(585, 930, pass),
        y = mix(417, 239, pass),
        size = mix(0.91, 0.44, pass);
      alpha(c, 1 - fold, () => parcel(c, x, y, size, { fixed: true, tag: 0 }));
      gate(c, q(t, 9.5, 0.65), t);
      if (t > 10.25)
        alpha(c, q(t, 10.25, 0.45) * (1 - q(t, 11.1, 0.45)), () =>
          reviewTag(c, 635, 359, -0.1, 0.72, true),
        );
      if (fold > 0) plane(c, x, y, 0.65 * fold, 0.2 + 0.8 * fold, -0.22);
    } else {
      const launch = q(t, 12.8, 2.4);
      plane(
        c,
        mix(930, 1440, launch),
        mix(239, -75, launch) - Math.sin(launch * PI) * 40,
        0.65 - launch * 0.24,
        1,
        -0.22 - launch * 0.12,
      );
      for (let i = 0; i < 3; i++)
        alpha(c, (1 - launch) * 0.6, () =>
          line(
            c,
            920 - i * 26 + launch * 400,
            254 + i * 10 - launch * 240,
            879 - i * 36 + launch * 400,
            265 + i * 10 - launch * 240,
            "#d29b76",
            1,
          ),
        );
      const land = q(t, 13.05, 0.7);
      move(c, 390, mix(755, 469, land), -0.09, 1, () => {
        shadow(
          c,
          () =>
            path(
              c,
              [
                [-169, -66],
                [170, -70],
                [173, 68],
                [-168, 71],
              ],
              "#d6b38b",
              "#644656",
              1,
            ),
          "#140d2277",
          14,
          9,
        );
        text(c, "REVIEW", -135, -36, 12, "#81505a", 500, "left", mono);
        text(c, "已有结论", -135, 4, 28, "#513041", 550, "left", serif);
        text(c, "同一 PR · 问题已回应", -135, 43, 13, "#795250");
        reviewTag(c, 93, -24, 0.08, 0.68, true);
      });
      gate(c, 1, t);
    }
  });
  caption(
    c,
    t < 3.2
      ? "先送到评审这一步。"
      : t < 6.1
        ? "有问题，就停下来。"
        : t < 9.5
          ? "修好，同一份重交。"
          : t < 12.8
            ? "重新检查，再往前。"
            : "追到评审有结论。",
  );
  label(c, t >= 12.8 ? "engineering-delivery" : "");
}

function paper(c, x, y, w, h, angle, fn, { fill = "#f0e4cb", seed = 0 } = {}) {
  move(c, x, y, angle, 1, () => {
    const pts = [
      [-w / 2, -h / 2],
      [w / 2 - 3, -h / 2 + 2],
      [w / 2, h / 2 - 3],
      [-w / 2 + 3, h / 2],
    ];
    shadow(c, () => path(c, pts, fill, "#69534a26", 0.8), "#37241d3d", 10, 6);
    c.save();
    c.beginPath();
    c.rect(-w / 2, -h / 2, w, h);
    c.clip();
    c.globalAlpha = 0.13;
    for (let i = 0; i < 45; i++) {
      const xx = (hash(seed + i) - 0.5) * w,
        yy = (hash(seed + 100 + i) - 0.5) * h;
      line(c, xx, yy, xx + 3, yy + 0.5, "#8a7261", 0.5);
    }
    c.restore();
    fn?.();
  });
}
function receipt(
  c,
  x,
  y,
  id,
  angle = 0,
  s = 1,
  { source = false, muted = false } = {},
) {
  move(c, x, y, 0, s, () =>
    paper(
      c,
      0,
      0,
      137,
      205,
      angle,
      () => {
        text(
          c,
          "WEEK / " + id,
          -48,
          -75,
          11,
          muted ? "#a59887" : "#6e3646",
          600,
          "left",
          mono,
        );
        line(c, -48, -53, 48, -53, "#8b72654d");
        for (let i = 0; i < 5; i++)
          line(
            c,
            -48,
            -28 + i * 18,
            43 - (i % 3) * 11,
            -28 + i * 18,
            muted ? "#b4a692" : "#9e8b77",
            1.2,
          );
        for (let i = 0; i < 4; i++) rect(c, -48 + i * 10, 77, 4, 13, "#543b3b");
        if (source) {
          shadow(
            c,
            () =>
              path(
                c,
                [
                  [21, -87],
                  [80, -87],
                  [80, -54],
                  [21, -54],
                ],
                "#783c4b",
              ),
            "#44283244",
            5,
            3,
          );
          text(c, "来源 " + id, 50, -70, 11, "#f6e5ca", 500, "center");
          circle(c, 29, -72, 2, "#b79b76");
        }
      },
      { seed: id.charCodeAt(0) },
    ),
  );
}
function thread(c, from, to, p = 1) {
  const x = mix(from[0], to[0], p),
    y = mix(from[1], to[1], p);
  c.beginPath();
  c.moveTo(...from);
  c.bezierCurveTo(from[0] + 70, from[1] - 45, x - 55, y + 25, x, y);
  c.strokeStyle = "#8d4556";
  c.lineWidth = 1.2;
  c.stroke();
  circle(c, x, y, 2, "#8d4556");
}
function weekly(c, a, t) {
  const step = Math.floor(t * 12) / 12;
  let camera = { zoom: 1.04, x: 634, y: 365 };
  if (t >= 3 && t < 6) camera = { zoom: 1.4, x: 480, y: 390, roll: -0.025 };
  else if (t >= 6 && t < 9) camera = { zoom: 1.15, x: 478, y: 376 };
  else if (t >= 9 && t < 12) camera = { zoom: 1.39, x: 807, y: 346 };
  else if (t >= 12) camera = { zoom: 1.02, x: 640, y: 360 };
  world(c, a.art, camera, () => {
    const positions = [
      [157, 257, -0.14],
      [283, 394, 0.08],
      [405, 284, -0.08],
      [160, 488, -0.06],
      [386, 491, 0.16],
      [303, 238, 0.19],
    ];
    if (t < 3) {
      const arrivals = out(t / 1.75);
      positions.forEach(([x, y, r], i) =>
        receipt(
          c,
          mix(-140 - i * 25, x, arrivals),
          mix(743 + i * 10, y, arrivals),
          ["A", "B", "C", "A", "B", "C"][i],
          mix(r - 0.2, r, arrivals),
          0.83,
        ),
      );
    } else if (t < 6) {
      const sort = q(t, 3.25, 0.75),
        reject = q(t, 4.25, 1.1);
      positions.forEach(([x, y, r], i) => {
        const slot = i % 3,
          tx = 153 + slot * 127,
          ty = 385;
        if (i < 3)
          receipt(
            c,
            mix(x, tx, sort),
            mix(y, ty, sort),
            ["A", "B", "C"][i],
            mix(r, -0.04 + slot * 0.04, sort),
            0.83,
          );
        else
          alpha(c, 1 - reject, () =>
            receipt(
              c,
              mix(mix(x, tx, sort), tx - 110, reject),
              mix(mix(y, ty, sort), 785, reject),
              ["A", "B", "C"][slot],
              r + reject * 0.45,
              0.83,
              { muted: true },
            ),
          );
      });
      const sweep = q(t, 3.2, 0.85);
      move(c, mix(-150, 590, sweep), 401, 0.13, 1, () => {
        shadow(
          c,
          () => rect(c, -10, -205, 20, 410, "#b39166", 2),
          "#3b241c30",
          6,
          5,
        );
        for (let j = 0; j < 24; j++)
          line(
            c,
            -9,
            -190 + j * 16,
            j % 4 ? -1 : 6,
            -190 + j * 16,
            "#684e41",
            0.6,
          );
      });
    } else if (t < 9) {
      for (let i = 0; i < 3; i++) {
        receipt(
          c,
          171 + i * 157,
          371,
          ["A", "B", "C"][i],
          -0.06 + i * 0.04,
          0.86,
          { source: t > 6.4 + i * 0.38 },
        );
        const stamp = clamp((t - 6.15 - i * 0.4) / 0.38);
        if (stamp > 0 && stamp < 1)
          move(
            c,
            201 + i * 157,
            mix(170, 310, Math.sin(stamp * PI)),
            -0.1,
            1,
            () => {
              shadow(
                c,
                () => rect(c, -32, -13, 64, 26, "#623440", 3),
                "#39231d33",
                8,
                8,
              );
              rect(c, -10, -47, 20, 36, "#a58962", 3);
            },
          );
      }
      thread(c, [247, 308], [584, 227], q(t, 7.3, 1.2));
    } else if (t < 12) {
      const lift = q(t, 9, 1.2),
        turn = q(t, 10.15, 1.35);
      for (let i = 0; i < 3; i++) {
        const x = mix(171 + i * 157, 1000, lift),
          y = mix(371, 275 + i * 95, lift);
        receipt(
          c,
          x,
          y,
          ["A", "B", "C"][i],
          mix(-0.06 + i * 0.04, -0.1, lift),
          mix(0.86, 0.58, lift),
          { source: true },
        );
      }
      // A page physically hinges across the gutter, occluding the receipts.
      c.save();
      c.translate(844, 336);
      c.rotate(-0.14);
      const width = 335 * Math.sin(turn * PI);
      if (turn > 0 && turn < 1) {
        const side = turn < 0.5 ? 1 : -1;
        path(
          c,
          [
            [0, -221],
            [side * width, -198],
            [side * width, 229],
            [0, 221],
          ],
          turn < 0.5 ? "#eee1c9" : "#ded0b6",
          "#917a5a44",
          1,
        );
        line(c, 0, -214, 0, 213, "#805d4e66", 1);
        c.save();
        c.globalAlpha = 0.12;
        c.fillStyle = "#5b3d31";
        c.fillRect(Math.min(0, side * width), -210, Math.abs(width), 420);
        c.restore();
      }
      c.restore();
    } else {
      const settle = q(t, 12, 0.7);
      move(c, 1012, 317, -0.145, 1, () => {
        text(c, "本周成果", -122, -138, 27, "#4b3236", 550, "left", serif);
        line(c, -123, -105, 117, -105, "#97776466");
        ["成果", "证据", "下一步"].forEach((s, i) => {
          const yy = -58 + i * 83;
          text(c, s, -119, yy, 19, "#543b3b", 500, "left", serif);
          line(c, -119, yy + 25, 76 - (i % 2) * 28, yy + 25, "#a5927a88", 1);
          path(
            c,
            [
              [85, yy - 11],
              [129, yy - 11],
              [129, yy + 17],
              [85, yy + 17],
            ],
            "#7b3e4c",
          );
          text(
            c,
            ["A", "B", "C"][i],
            107,
            yy + 3,
            12,
            "#f4e7d1",
            500,
            "center",
            mono,
          );
        });
      });
      for (let i = 0; i < 3; i++) {
        receipt(
          c,
          mix(410, 666 + i * 37, settle),
          405 + i * 19,
          ["A", "B", "C"][i],
          -0.12 + i * 0.06,
          0.65,
          { source: true },
        );
        thread(
          c,
          [721 + i * 25, 352 + i * 20],
          [917, 288 + i * 82],
          q(t, 12.4 + i * 0.16, 0.8),
        );
      }
      if (t >= 14) {
        move(c, 331, mix(680, 555, q(t, 14, 0.8)), -0.08, 1, () =>
          paper(
            c,
            0,
            0,
            367,
            65,
            0,
            () =>
              text(
                c,
                "有来源，才算数。",
                0,
                0,
                24,
                "#6c3546",
                500,
                "center",
                serif,
              ),
            { seed: 91 },
          ),
        );
      }
    }
    // Loose source ribbons continue a subtle independent paper stop-motion.
    if (t > 12)
      path(
        c,
        [
          [575, 180],
          [623, 173],
          [625, 193 + Math.sin(step * 3) * 2],
          [575, 199],
        ],
        "#7b3d4a",
      );
  });
  caption(
    c,
    t < 3
      ? "一周，散在许多地方。"
      : t < 6
        ? "重复的，先收起来。"
        : t < 9
          ? "把来源，夹在旁边。"
          : t < 12
            ? "再整理成一页。"
            : "每条成果，都有来处。",
    true,
  );
  label(c, t >= 12 ? "codex-weekly-session-report" : "", true);
}

export function render(ctx, assets, id, seconds = 0) {
  const film = films.find((f) => f.id === id);
  if (!film) throw new Error(`Unknown story film: ${id}`);
  const t = Math.max(
    0,
    Math.min(film.duration, Number.isFinite(seconds) ? seconds : 0),
  );
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (id === "elys-evaluation") optics(ctx, assets, t);
  else if (id === "engineering-delivery") dispatch(ctx, assets, t);
  else weekly(ctx, assets, t);
  ctx.restore();
}
