import { loadCinematicAssets, renderCinematic } from "../cinematic-renderer.js";
export const films = [
  {
    id: "ns-spec-cards",
    duration: 16,
    bpm: 126,
    genre: "shibuya-pop",
    style: "手绘叙事",
    posterTime: 7.7,
  },
  {
    id: "test-journal",
    duration: 16,
    bpm: 104,
    genre: "detective-bigbeat",
    style: "纸片侦探",
    posterTime: 7.36,
  },
  {
    id: "web-testing",
    duration: 14,
    bpm: 168,
    genre: "jungle-breaks",
    style: "超现实游乐场",
    posterTime: 11.1,
  },
];
const PI = Math.PI,
  W = 1280,
  H = 720;
const clamp = (x) => Math.max(0, Math.min(1, x)),
  ease = (x) => 1 - Math.pow(1 - clamp(x), 3),
  smooth = (x) => {
    x = clamp(x);
    return x * x * (3 - 2 * x);
  },
  mix = (a, b, p) => a + (b - a) * p;
const p = (t, s, d = 1) => ease((t - s) / d),
  hash = (n) => {
    const a = Math.sin(n * 12.98 + 78.23) * 43758.54;
    return a - Math.floor(a);
  };
const sans =
    '-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif',
  serif = '"Kaiti SC","STKaiti","Songti SC",Georgia,serif',
  mono = "ui-monospace,SFMono-Regular,Menlo,monospace";
const image = (src) =>
  new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error(`Film art failed: ${src}`));
    i.src = src;
  });
export async function loadAssets(id) {
  if (id === "ns-spec-cards") return loadCinematicAssets();
  return { art: await image(`media/collection-art/${id}.jpg`) };
}
function text(
  c,
  s,
  x,
  y,
  size = 20,
  col = "#282720",
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
function rect(c, x, y, w, h, col, r = 0) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = col;
  c.fill();
}
function path(c, pts, col, stroke, width = 1) {
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  if (col) {
    c.fillStyle = col;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = width;
    c.stroke();
  }
}
function line(c, x1, y1, x2, y2, col, width = 1) {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.strokeStyle = col;
  c.lineWidth = width;
  c.stroke();
}
function alpha(c, a, fn) {
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= clamp(a);
  fn();
  c.restore();
}
function move(c, x, y, r, sx, sy, fn) {
  c.save();
  c.translate(x, y);
  c.rotate(r);
  c.scale(sx, sy);
  fn();
  c.restore();
}
function circle(c, x, y, r, col, stroke, lw = 1) {
  c.beginPath();
  c.arc(x, y, r, 0, PI * 2);
  if (col) {
    c.fillStyle = col;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = lw;
    c.stroke();
  }
}
function check(c, x, y, size, col = "#ad3e2e", q = 1, lw = 4) {
  c.beginPath();
  c.moveTo(x - size * 0.45, y);
  if (q < 0.35)
    c.lineTo(
      x - size * 0.45 + (size * 0.32 * q) / 0.35,
      y + (size * 0.33 * q) / 0.35,
    );
  else {
    c.lineTo(x - size * 0.13, y + size * 0.33);
    c.lineTo(
      mix(x - size * 0.13, x + size * 0.54, (q - 0.35) / 0.65),
      mix(y + size * 0.33, y - size * 0.42, (q - 0.35) / 0.65),
    );
  }
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.stroke();
}
function cover(c, img) {
  if (!img) return;
  const iw = img.naturalWidth || img.width,
    ih = img.naturalHeight || img.height,
    s = Math.max(W / iw, H / ih);
  c.drawImage(img, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s);
}
function world(c, img, zoom, cx, cy, roll, fn) {
  c.save();
  c.translate(640, 360);
  c.rotate(roll || 0);
  c.scale(zoom, zoom);
  c.translate(-cx, -cy);
  cover(c, img);
  fn?.();
  c.restore();
}
function shade(c, strength = 0.18) {
  const g = c.createRadialGradient(640, 340, 180, 640, 360, 820);
  g.addColorStop(0, "#00000000");
  g.addColorStop(1, `rgba(15,10,5,${strength})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}
function caption(c, s, t, options = {}) {
  const col = options.col || "#efe3cd",
    x = options.x || 54,
    y = options.y || 642;
  c.save();
  c.shadowColor = options.shadow === false ? "transparent" : "#211a17aa";
  c.shadowBlur = 6;
  c.shadowOffsetY = 2;
  text(c, s, x, y, options.size || 27, col, 500, "left", serif);
  c.restore();
}
function footer(c, id, dark = false) {
  text(c, "能力示意", 1237, 697, 8, dark ? "#2e5264" : "#ac9d87", 400, "right");
}
function sheet(
  c,
  {
    x,
    y,
    w = 200,
    h = 270,
    r = 0,
    s = 1,
    col = "#e4cda6",
    seed = 0,
    shadow = true,
    fn,
  } = {},
) {
  move(c, x, y, r, s, s, () => {
    if (shadow) {
      c.save();
      c.shadowColor = "#25190f66";
      c.shadowBlur = 15;
      c.shadowOffsetX = 5;
      c.shadowOffsetY = 8;
      path(
        c,
        [
          [-w / 2, -h / 2],
          [w / 2 - 2, -h / 2 + 2],
          [w / 2, h / 2],
          [-w / 2 + 1, h / 2 - 2],
        ],
        col,
      );
      c.restore();
    }
    path(
      c,
      [
        [-w / 2, -h / 2],
        [w / 2 - 2, -h / 2 + 2],
        [w / 2, h / 2],
        [-w / 2 + 1, h / 2 - 2],
      ],
      col,
      "#735d352b",
    );
    c.save();
    c.beginPath();
    c.rect(-w / 2, -h / 2, w, h);
    c.clip();
    c.globalAlpha = 0.16;
    for (let i = 0; i < 65; i++) {
      const xx = (hash(i + seed) - 0.5) * w,
        yy = (hash(i + seed + 100) - 0.5) * h;
      line(c, xx, yy, xx + 2, yy + 0.4, "#77623d", 0.5);
    }
    c.restore();
    fn?.(w, h);
  });
}
function longReply(c, x, y, w, h, r, seed, opacity = 1) {
  alpha(c, opacity, () =>
    sheet(c, {
      x,
      y,
      w,
      h,
      r,
      seed,
      fn: () => {
        text(
          c,
          "AI 回复",
          -w / 2 + 20,
          -h / 2 + 32,
          13,
          "#8e4c36",
          550,
          "left",
          mono,
        );
        text(
          c,
          ["先解释一下…", "另外还需考虑…", "继续补充…"][seed % 3],
          -w / 2 + 20,
          -h / 2 + 68,
          22,
          "#3e3a30",
          500,
          "left",
          serif,
        );
        for (let k = 0; k < 22; k++) {
          const yy = -h / 2 + 110 + k * 19;
          line(
            c,
            -w / 2 + 22,
            yy,
            w / 2 - 20 - (k % 3) * 20,
            yy,
            "#746b586b",
            1.5,
          );
        }
        line(c, -w * 0.32, -h * 0.1, w * 0.28, -h * 0.13, "#a64b3855", 2);
      },
    }),
  );
}
function spec(c, a, t) {
  if (t >= 2.5 && t < 3.5) {
    renderCinematic(c, a, t);
    return;
  }
  if (t >= 5.5 && t < 8) {
    renderCinematic(c, a, t);
    caption(c, "一张卡，对齐一件事。", t, { y: 640, size: 26 });
    return;
  }
  if (t >= 14) {
    renderCinematic(c, a, t);
    return;
  }
  if (t < 2.5) {
    const q = p(t, 0, 2.5);
    world(c, a.wide, mix(1, 1.07, q), 640 + q * 8, 360, 0, () => {
      for (let i = 0; i < 6; i++) {
        const v = p(t, i * 0.12, 0.65);
        longReply(
          c,
          mix(850, 125 + i * 119, v),
          mix(830, 245 + (i % 2) * 40, v),
          236,
          590,
          (i - 2.5) * -0.07,
          i,
          v,
        );
      }
    });
    caption(c, "别再长篇大论。", t);
  } else if (t < 5.5) {
    const local = t - 3.5;
    world(
      c,
      a.wide,
      1.07,
      645,
      360,
      mix(-0.02, 0.025, smooth(local / 2)),
      () => {
        for (let i = 0; i < 6; i++) {
          const q = p(local, 0.18 + i * 0.045, 0.85);
          const x = mix(125 + i * 119, -600 - i * 110, q);
          longReply(
            c,
            x,
            245 + (i % 2) * 40 - q * 150,
            236,
            590,
            (i - 2.5) * -0.07 + q * 0.7,
            i,
            1 - q * 0.6,
          );
        }
        if (local < 0.75) {
          const q = smooth(local / 0.75);
          sheet(c, {
            x: mix(-950, 2100, q),
            y: 360,
            w: 920,
            h: 1250,
            r: -0.5,
            seed: 80,
          });
        }
      },
    );
    caption(c, "只问关键的。", t);
  } else if (t < 11.5) {
    const local = t - 8,
      q = smooth(local / 3.5);
    world(c, a.clean, 1.075, 640 + q * 20, 365, 0, () => {
      const turn = p(local, 1.15, 1);
      move(
        c,
        470,
        360,
        -0.045,
        Math.max(0.015, Math.abs(Math.cos(PI * (1 - turn)))),
        1,
        () => {
          sheet(c, {
            x: 0,
            y: 0,
            w: 350,
            h: 432,
            seed: 90,
            fn: () => {
              if (turn < 0.5) {
                text(c, "这次，先做什么？", -139, -135, 25, "#3b3429", 550);
                line(c, -138, -92, 137, -92, "#9d84515c");
                text(c, "核心体验优先", -137, -25, 24, "#473b28", 500);
                check(c, 126, -24, 24, "#ac3e2f", p(local, 1, 0.5));
                text(
                  c,
                  "留言：先打通这一步。",
                  -137,
                  70,
                  19,
                  "#846143",
                  500,
                  "left",
                  serif,
                );
              } else {
                text(c, "已与 AI 对齐", -136, -136, 25, "#3b3429", 550);
                line(c, -138, -92, 137, -92, "#9d84515c");
                text(c, "核心体验优先", -137, -20, 26, "#473b28", 550);
                text(
                  c,
                  "下一步：开始实现",
                  -137,
                  80,
                  19,
                  "#846143",
                  500,
                  "left",
                  serif,
                );
                check(c, 110, 150, 33, "#ac3e2f", p(local, 1, 0.6));
              }
            },
          });
        },
      );
    });
    caption(c, "短问题，快对齐。", t);
  } else {
    const local = t - 11.5;
    world(
      c,
      a.clean,
      mix(1.04, 1.005, smooth(local / 2.5)),
      640,
      360,
      0,
      () => {
        sheet(c, {
          x: 355,
          y: 425,
          w: 300,
          h: 335,
          r: -0.08,
          seed: 72,
          fn: () => {
            text(c, "本轮结论", -115, -105, 22, "#51432d", 550);
            line(c, -115, -73, 114, -73, "#9276436b");
            text(c, "核心体验优先", -115, -13, 23, "#322d25", 550);
            text(
              c,
              "下一步，开始做。",
              -115,
              68,
              19,
              "#815a38",
              500,
              "left",
              serif,
            );
            check(c, 88, 111, 26, "#ac3e2f");
          },
        });
      },
    );
    caption(c, "需求说清，就开工。", t);
  }
  shade(c, 0.16);
  footer(c, "ns-spec-cards");
}
// Handmade miniature actor. Pose advances in deliberate 10 fps stop-motion, separate from the camera.
function walker(c, x, y, t, s = 1, col = "#35312e") {
  const frame = Math.floor(t * 10) / 10,
    step = Math.sin(frame * 8);
  move(c, x, y, Math.sin(frame * 3) * 0.018, s, s, () => {
    c.save();
    c.shadowColor = "#33291b55";
    c.shadowBlur = 7;
    c.shadowOffsetY = 6;
    c.beginPath();
    c.ellipse(0, 48, 27, 8, 0, 0, PI * 2);
    c.fillStyle = "#493b2738";
    c.fill();
    c.restore();
    line(c, -8, 19, -13 + step * 9, 47, col, 8);
    line(c, 8, 19, 13 - step * 9, 47, col, 8);
    path(
      c,
      [
        [-20, -18],
        [15, -20],
        [23, 24],
        [-22, 25],
      ],
      "#ddd1b8",
      col,
      1,
    );
    line(c, -19, -7, -28 - step * 4, 15, col, 5);
    line(c, 16, -8, 27 + step * 4, 10, col, 5);
    circle(c, -1, -37, 15, col);
    path(
      c,
      [
        [-21, -43],
        [17, -46],
        [27, -36],
        [-24, -31],
      ],
      col,
    );
    path(
      c,
      [
        [-16, -20],
        [18, -19],
        [12, -8],
        [-13, -10],
      ],
      "#922c47",
    );
  });
}
function snapshot(
  c,
  x,
  y,
  w,
  h,
  { step = 0, bug = false, version = "CURRENT", angle = 0, opacity = 1 } = {},
) {
  alpha(c, opacity, () =>
    sheet(c, {
      x,
      y,
      w,
      h,
      r: angle,
      col: "#eee5d1",
      seed: step + 22,
      fn: () => {
        rect(c, -w / 2 + 8, -h / 2 + 9, w - 16, h - 39, "#d5cdbf");
        const xx = -w / 2 + 17,
          yy = -h / 2 + 19;
        rect(c, xx, yy, w - 34, (h - 45) * 0.23, "#403b35", 2);
        for (let i = 0; i < 2; i++)
          rect(
            c,
            xx,
            yy + 30 + i * 22,
            (w - 34) * (0.83 - i * 0.13),
            10,
            i === step % 2 ? "#9a6d68" : "#bfb6a6",
            1,
          );
        circle(c, w * 0.18, h * 0.04, 9, bug ? "#a32d4a" : "#6b7770");
        text(
          c,
          ["进入", "选择", "结果"][step % 3],
          -w / 2 + 11,
          h / 2 - 17,
          Math.min(16, w * 0.105),
          "#44392b",
          500,
          "left",
          serif,
        );
        text(
          c,
          version,
          w / 2 - 11,
          h / 2 - 17,
          8,
          "#887254",
          500,
          "right",
          mono,
        );
      },
    }),
  );
}
function bugMark(c, x, y, size = 15) {
  circle(c, x, y, size * 0.55, "#9e2b49");
  circle(c, x, y - size * 0.53, size * 0.3, "#9e2b49");
  for (let i = 0; i < 3; i++) {
    line(
      c,
      x - size * 0.43,
      y + (i - 1) * size * 0.38,
      x - size * 0.9,
      y + (i - 1) * size * 0.65,
      "#9e2b49",
      2,
    );
    line(
      c,
      x + size * 0.43,
      y + (i - 1) * size * 0.38,
      x + size * 0.9,
      y + (i - 1) * size * 0.65,
      "#9e2b49",
      2,
    );
  }
  line(c, x, y - size * 0.2, x, y + size * 0.5, "#e5d8bf", 1);
}
function filmStrip(c, x, y, w, h, progress = 1) {
  rect(c, x, y, w * progress, h, "#342f2a", 3);
  for (let i = 0; i < w / 18; i++) {
    rect(c, x + 7 + i * 18, y + 5, 7, 7, "#e4d6be", 1);
    rect(c, x + 7 + i * 18, y + h - 12, 7, 7, "#e4d6be", 1);
  }
}
function checklist(c, x, y, h, r = 0, scale = 1) {
  sheet(c, {
    x,
    y,
    w: 220,
    h,
    r,
    s: scale,
    col: "#e9dfca",
    seed: 29,
    fn: () => {
      text(
        c,
        "TESTS / DRAFT",
        -87,
        -h / 2 + 27,
        13,
        "#6f6250",
        500,
        "left",
        mono,
      );
      for (let i = 0; i < Math.floor((h - 75) / 22); i++) {
        rect(c, -88, -h / 2 + 57 + i * 22, 9, 9, "#948a7766");
        line(
          c,
          -68,
          -h / 2 + 62 + i * 22,
          70 - (i % 3) * 17,
          -h / 2 + 62 + i * 22,
          "#9e927c9c",
          1.4,
        );
      }
    },
  });
}
function journal(c, a, t) {
  const fpsT = Math.floor(t * 10) / 10;
  let zoom = 1,
    cx = 640,
    cy = 360,
    roll = 0;
  if (t >= 5.3 && t < 8) {
    zoom = 1.32;
    cx = 520;
    cy = 380;
    roll = -0.025;
  } else if (t >= 10.6 && t < 13.5) {
    zoom = 1.14;
    cx = 600;
    cy = 405;
  } else if (t >= 13.5) {
    zoom = 1.05;
    cx = 650;
    cy = 400;
  }
  world(c, a.art, zoom, cx, cy, roll, () => {
    if (t < 5.3) {
      const cut = p(fpsT, 2.4, 1.1);
      for (let i = 2; i >= 0; i--)
        checklist(
          c,
          mix(225 + i * 32, -200 - i * 80, cut),
          mix(334 + i * 15, 150 + i * 20, cut),
          550,
          -0.12 + i * 0.08,
          1,
        );
      const x = mix(310, 740, p(fpsT, 0.5, 4.5));
      walker(c, x, 495, fpsT, 0.85);
      if (t >= 2.7) {
        for (let i = 0; i < 3; i++) {
          const reveal = p(fpsT, 2.7 + i * 0.4, 0.45);
          snapshot(c, 405 + i * 165, mix(430, 374, reveal), 132, 145, {
            step: i,
            angle: (i - 1) * 0.04,
            opacity: reveal,
          });
        }
      }
      if (cut > 0.03 && cut < 0.97) {
        const bx = mix(50, 610, cut);
        move(c, bx, 325, -0.2, 1, 1, () => {
          path(
            c,
            [
              [-90, -7],
              [95, -13],
              [95, 13],
              [-90, 7],
            ],
            "#bfc0bb",
            "#6c6c65",
            1,
          );
          circle(c, -84, 0, 13, "#e7dbbf", "#7c786a", 3);
        });
      }
    } else if (t < 8) {
      snapshot(c, 520, 380, 300, 225, { step: 1, bug: true, angle: -0.025 });
      bugMark(c, 570, 382, 17);
      const q = p(t, 5.5, 1);
      c.beginPath();
      c.ellipse(570, 382, 45, 40, -0.1, -PI * 0.55, -PI * 0.55 + PI * 2 * q);
      c.strokeStyle = "#9e2b49";
      c.lineWidth = 3;
      c.stroke();
      move(
        c,
        mix(960, 615, p(t, 5.4, 0.8)),
        mix(490, 380, p(t, 5.4, 0.8)),
        -0.35,
        1,
        1,
        () => {
          circle(c, 0, 0, 66, "#fff9dd18", "#5d5142", 7);
          circle(c, -3, -3, 60, null, "#c8b38d", 2);
          line(c, 45, 46, 101, 105, "#6a5741", 14);
        },
      );
    } else if (t < 10.6) {
      const collect = p(t, 8, 0.75);
      filmStrip(c, 175, 271, 630, 232, collect);
      for (let i = 0; i < 3; i++) {
        const q = p(t, 8.1 + i * 0.45, 0.6);
        snapshot(c, 270 + i * 205, mix(555, 386, q), 175, 177, {
          step: i,
          angle: (1 - q) * 0.12,
          opacity: q,
        });
      }
      walker(c, mix(220, 760, p(fpsT, 8, 2.4)), 558, fpsT, 0.7);
      alpha(c, 1 - p(t, 8, 0.8), () =>
        snapshot(c, 110, 240, 128, 145, {
          step: 0,
          version: "v1",
          angle: -0.18,
        }),
      );
    } else {
      const q = p(t, 10.6, 1);
      sheet(c, {
        x: 550,
        y: 404,
        w: 640,
        h: 350,
        r: mix(-0.09, -0.035, q),
        col: "#e9dfcb",
        seed: 101,
        fn: () => {
          line(c, 0, -158, 0, 158, "#ab977144", 1.5);
          for (let i = 0; i < 3; i++) {
            snapshot(c, -204 + i * 205, -12, 174, 205, {
              step: i,
              angle: (i - 1) * 0.025,
            });
          }
          text(c, "CORE JOURNEY", -280, -143, 14, "#7a5a45", 500, "left", mono);
          text(
            c,
            "CURRENT / REUSABLE",
            -280,
            145,
            12,
            "#912e48",
            500,
            "left",
            mono,
          );
        },
      });
      if (t >= 13.5) {
        sheet(c, {
          x: 530,
          y: 618,
          w: 400,
          h: 67,
          r: -0.035,
          col: "#d8c6a5",
          seed: 119,
          fn: () =>
            text(c, "/test-journal", -163, 0, 24, "#483b2d", 550, "left", mono),
        });
      }
    }
  });
  const cap =
    t < 2.4
      ? "先走用户动线。"
      : t < 5.3
        ? "多余的，收起来。"
        : t < 8
          ? "关键一步，抓住。"
          : t < 10.6
            ? "只留当前有效。"
            : t < 13.5
              ? "核心动线，入册。"
              : "下次，直接复测。";
  caption(c, cap, t, {
    col: "#4b392a",
    shadow: false,
    x: 345,
    y: 655,
    size: 26,
  });
  shade(c, 0.07);
  footer(c, "test-journal", true);
}
function clayBall(c, x, y, r = 24, squash = 1) {
  c.save();
  c.translate(x, y);
  c.scale(1, squash);
  const g = c.createRadialGradient(-r * 0.35, -r * 0.45, 2, 0, 0, r * 1.2);
  g.addColorStop(0, "#ffbea5");
  g.addColorStop(0.4, "#ef8f75");
  g.addColorStop(1, "#c7604e");
  circle(c, 0, 0, r, g);
  c.restore();
  c.save();
  c.globalAlpha = 0.15;
  c.beginPath();
  c.ellipse(x + 7, y + r + 8, r * 0.9, 5, 0, 0, PI * 2);
  c.fillStyle = "#235268";
  c.fill();
  c.restore();
}
function clayCursor(c, x, y, r = 0, s = 1) {
  move(c, x, y, r, s, s, () => {
    c.save();
    c.shadowColor = "#33546d55";
    c.shadowBlur = 8;
    c.shadowOffsetX = 5;
    c.shadowOffsetY = 8;
    path(
      c,
      [
        [0, 0],
        [3, 54],
        [18, 39],
        [32, 62],
        [43, 55],
        [29, 34],
        [50, 32],
      ],
      "#fff4df",
      "#d5c8b5",
      1.5,
    );
    c.restore();
  });
}
function bridgePatch(c, q) {
  const yy = mix(255, 451, q);
  move(c, 640, yy, mix(-0.27, 0, q), 1, 1, () => {
    c.save();
    c.shadowColor = "#1b507b55";
    c.shadowBlur = 10;
    c.shadowOffsetY = 12;
    rect(c, -50, -4, 100, 47, "#a1d3ea", 7);
    c.restore();
    rect(c, -49, -5, 98, 22, "#cae5f0", 7);
    line(c, -39, 10, 37, 10, "#eaf6fa66", 1);
  });
}
function web(c, a, t) {
  let zoom = 1,
    cx = 640,
    cy = 360;
  if (t >= 2.6 && t < 4.6) {
    zoom = 1.12;
    cx = 750;
    cy = 380;
  } else if (t >= 4.6 && t < 7.8) {
    zoom = 1.37;
    cx = 645;
    cy = 420;
  } else if (t >= 7.8 && t < 11.1) {
    zoom = 1.12;
    cx = mix(650, 790, smooth((t - 7.8) / 3.3));
    cy = 400;
  } else if (t >= 11.1) {
    zoom = mix(1.08, 1, smooth((t - 11.1) / 2.9));
  }
  world(c, a.art, zoom, cx, cy, 0, () => {
    const repair = p(t, 6.2, 1.15);
    if (t >= 6.2) bridgePatch(c, repair);
    const run1 = p(t, 0.5, 2.1),
      run2 = p(t, 7.8, 2.5);
    let x = t < 7.8 ? mix(180, 552, run1) : mix(552, 1041, run2);
    let y = 425;
    if (t < 2.6) y -= Math.abs(Math.sin(t * 4)) * 10;
    if (t >= 4.6 && t < 6.2) {
      const f = p(t, 4.6, 0.55);
      y += f * 24;
      for (let k = 0; k < 3; k++)
        alpha(c, 0.38 - k * 0.08, () =>
          path(
            c,
            [
              [605 + k * 25, 480 + k * 15],
              [621 + k * 25, 485 + k * 15],
              [609 + k * 25, 498 + k * 15],
            ],
            "#cf8a76",
          ),
        );
    }
    if (t >= 7.8 && t < 10.4) y -= Math.abs(Math.sin((t - 7.8) * 4)) * 12;
    clayBall(c, x, y, 24, t >= 4.6 && t < 6.2 ? 0.86 : 1);
    if (t >= 2.6 && t < 4.6) {
      const click = p(t, 2.7, 0.5);
      clayCursor(c, mix(753, 1030, click), mix(280, 393, click), -0.08, 1);
      if (t >= 3.2) {
        circle(c, 1050, 410, 28, null, "#df7c6a", 2);
        circle(c, 1050, 410, 39, null, "#fff0dd", 1);
      }
    }
    if (t >= 4.6 && t < 6.2) {
      c.beginPath();
      c.ellipse(
        640,
        478,
        72,
        45,
        -0.06,
        -PI * 0.5,
        -PI * 0.5 + PI * 2 * p(t, 4.8, 0.6),
      );
      c.strokeStyle = "#cb6858";
      c.lineWidth = 3;
      c.stroke();
    }
    if (t >= 6.2 && t < 7.8)
      clayCursor(c, 690, mix(256, 426, repair), -0.2, 1.1);
    if (t >= 10.2) {
      const press = p(t, 10.2, 0.4);
      c.save();
      c.translate(0, press * 4);
      c.beginPath();
      c.ellipse(1082, 405, 118, 37, 0, 0, PI * 2);
      c.fillStyle = press > 0.5 ? "#fff9d2aa" : "#fff9d244";
      c.fill();
      c.restore();
      alpha(c, p(t, 10.5, 0.6), () => {
        for (let i = 0; i < 7; i++) {
          const aa = (i * PI) / 3.5;
          line(
            c,
            1090 + Math.cos(aa) * 53,
            365 + Math.sin(aa) * 38,
            1090 + Math.cos(aa) * 71,
            365 + Math.sin(aa) * 54,
            "#ffedbf",
            3,
          );
        }
        check(c, 1080, 375, 38, "#bd6651", p(t, 10.5, 0.7), 5);
      });
    }
    if (t >= 11.1) {
      for (let i = 0; i < 13; i++) circle(c, 205 + i * 65, 461, 2.4, "#d77a68");
      sheet(c, {
        x: 364,
        y: 586,
        w: 406,
        h: 102,
        r: -0.06,
        col: "#f2e8d5",
        seed: 130,
        fn: () => {
          text(c, "/web-testing", -174, -12, 24, "#3f6571", 600, "left", mono);
          text(
            c,
            "这条路径，下次接着用。",
            -173,
            24,
            17,
            "#738a8d",
            500,
            "left",
            serif,
          );
        },
      });
    }
  });
  const cap =
    t < 2.6
      ? "从用户这一步出发。"
      : t < 4.6
        ? "点了，没反应。"
        : t < 6.2
          ? "断点，在这里。"
          : t < 7.8
            ? "修好，再走一遍。"
            : t < 11.1
              ? "一直走到可见结果。"
              : "留下能复测的路径。";
  caption(c, cap, t, { col: "#274e60", shadow: false, y: 666, size: 27 });
  footer(c, "web-testing", true);
}
export function render(ctx, assets, id, seconds = 0) {
  const duration = films.find((f) => f.id === id)?.duration || 16,
    t = Math.max(0, Math.min(duration, Number.isFinite(seconds) ? seconds : 0));
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (id === "ns-spec-cards") spec(ctx, assets, t);
  else if (id === "test-journal") journal(ctx, assets, t);
  else web(ctx, assets, t);
  ctx.restore();
}
