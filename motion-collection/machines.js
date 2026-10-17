export const films = [
  {
    id: "mobile-testing",
    duration: 14,
    bpm: 124,
    genre: "noir-pulse",
    style: "城市穿行",
    posterTime: 11.8,
  },
  {
    id: "elys-backend-technical-design",
    duration: 16,
    bpm: 100,
    genre: "architectural",
    style: "建筑模型",
    posterTime: 11.8,
  },
  {
    id: "elys-code-development",
    duration: 14,
    bpm: 136,
    genre: "garage",
    style: "版画修理厂",
    posterTime: 10.8,
  },
];
const images = new Map();
export async function loadAssets(id) {
  if (!films.some((film) => film.id === id))
    throw new Error("Unknown machine film: " + id);
  if (!images.has(id))
    images.set(
      id,
      (async () => {
        const image = new Image();
        image.src = new URL(
          "../media/collection-art/" + id + ".jpg",
          import.meta.url,
        ).href;
        await image.decode();
        return image;
      })(),
    );
  return images.get(id);
}
const clamp = (n) => Math.max(0, Math.min(1, n));
const smooth = (n) => {
  const x = clamp(n);
  return x * x * (3 - 2 * x);
};
const p = (t, a, b) => smooth((t - a) / (b - a));
const mix = (a, b, f) => a + (b - a) * f;
const TAU = Math.PI * 2;
const font =
  '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';
function rr(c, x, y, w, h, r, fill, stroke, line = 1) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = line;
    c.stroke();
  }
}
function line(c, points, color, width = 2) {
  c.beginPath();
  points.forEach(([x, y], index) => (index ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.lineWidth = width;
  c.strokeStyle = color;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.stroke();
}
function circle(c, x, y, r, fill, stroke, width = 1) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
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
function text(c, s, x, y, size, color, weight = 500) {
  c.font = weight + " " + size + "px " + font;
  c.fillStyle = color;
  c.fillText(s, x, y);
}
function image(c, asset) {
  const scale = Math.max(1280 / asset.naturalWidth, 720 / asset.naturalHeight);
  const w = asset.naturalWidth * scale,
    h = asset.naturalHeight * scale;
  c.drawImage(asset, (1280 - w) / 2, (720 - h) / 2, w, h);
}
function camera(c, x, y, scale) {
  c.translate(640, 360);
  c.scale(scale, scale);
  c.translate(-x, -y);
}
function printLines(c, x, y, w, h, color, amount = 45) {
  c.strokeStyle = color;
  c.lineWidth = 0.8;
  for (let i = 0; i < amount; i++) {
    const px = x + ((i * 83.67 + 21) % w),
      py = y + ((i * 47.13 + 5) % h);
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(px + 3 + (i % 7), py - 0.8);
    c.stroke();
  }
}
function material(
  c,
  asset,
  points,
  bounds,
  alpha = 0.34,
  source = [0.22, 0.44, 0.5, 0.24],
) {
  if (!asset) return;
  c.save();
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.clip();
  c.globalAlpha = alpha;
  c.globalCompositeOperation = "multiply";
  c.drawImage(
    asset,
    source[0] * asset.naturalWidth,
    source[1] * asset.naturalHeight,
    source[2] * asset.naturalWidth,
    source[3] * asset.naturalHeight,
    ...bounds,
  );
  c.restore();
}
function subtitle(c, label, light = false) {
  c.font = "600 29px " + font;
  const w = c.measureText(label).width + 42;
  rr(c, 57, 614, w, 59, 2, light ? "#e9e7dfeb" : "#0a171de8");
  text(c, label, 78, 653, 29, light ? "#29343a" : "#f4e4c0", 600);
}
function stamp(c, name, command, end, light = false) {
  const ink = light ? "#1e353e" : "#e6d9b7";
  text(c, name.toUpperCase(), 59, 46, 11, ink, 650);
  text(c, "能力示意", 1157, 682, 10, light ? "#334a50" : "#d2c6a8");
  if (end > 0) {
    c.save();
    c.globalAlpha = end;
    c.font = "500 15px ui-monospace, monospace";
    c.fillStyle = ink;
    c.textAlign = "right";
    c.fillText("/" + command, 1218, 650);
    c.restore();
  }
}
function glow(c, x, y, r, color) {
  c.save();
  c.shadowBlur = r * 1.5;
  c.shadowColor = color;
  circle(c, x, y, r, color);
  c.restore();
}

// A city journey: a physical phone-door, a moving carriage, a blocked permission
// gate and an observed return, followed by a punched route ticket.
function phoneDoor(c, x, floor, w, h, open, amber = "#efbd6c") {
  c.save();
  c.translate(x, floor);
  c.fillStyle = "#07171bb3";
  c.beginPath();
  c.ellipse(10, 7, w * 0.72, 15, 0, 0, TAU);
  c.fill();
  rr(c, -w / 2, -h, w, h, 21, "#152d35", "#c08f4f", 5);
  rr(c, -w / 2 + 10, -h + 12, w - 20, h - 24, 13, "#071a23", "#597275", 1.5);
  const grad = c.createLinearGradient(0, -h, 0, 0);
  grad.addColorStop(0, "#d6a35c");
  grad.addColorStop(1, "#ffdf9a");
  c.save();
  c.beginPath();
  c.roundRect(-w / 2 + 14, -h + 17, w - 28, h - 38, 10);
  c.clip();
  c.globalAlpha = 0.24 + open * 0.66;
  c.fillStyle = grad;
  c.fillRect(-w / 2, -h, w, h);
  c.globalAlpha = 1;
  const panel = (w - 28) / 2;
  rr(
    c,
    -panel - panel * open,
    -h + 17,
    panel,
    h - 38,
    0,
    "#253d43",
    "#68716a",
    2,
  );
  rr(c, panel * open, -h + 17, panel, h - 38, 0, "#1b333b", "#68716a", 2);
  line(
    c,
    [
      [-4 - panel * open, -h * 0.5],
      [-4 - panel * open, -h * 0.39],
    ],
    amber,
    3,
  );
  line(
    c,
    [
      [4 + panel * open, -h * 0.5],
      [4 + panel * open, -h * 0.39],
    ],
    amber,
    3,
  );
  c.restore();
  rr(c, -w * 0.18, -h + 7, w * 0.36, 9, 5, "#081519");
  for (let n = 0; n < 5; n++)
    line(
      c,
      [
        [-w / 2 + 4, -h + 30 + n * 47],
        [-w / 2 + 8, -h + 31 + n * 47],
      ],
      "#dfaa61",
      1,
    );
  c.restore();
}
function carriage(c, x, y, t, stopped) {
  c.save();
  c.translate(x, y);
  if (stopped) c.translate(Math.sin(t * 18) * 0.65, 0);
  c.fillStyle = "#07101790";
  c.beginPath();
  c.ellipse(0, 19, 74, 9, -0.02, 0, TAU);
  c.fill();
  rr(c, -65, -49, 130, 66, 12, "#b08c52", "#081820", 4);
  rr(c, -58, -41, 116, 30, 6, "#213c47", "#e8c98d", 2);
  for (let i = 0; i < 4; i++) {
    rr(c, -48 + i * 26, -36, 17, 20, 2, i === 1 ? "#ffe0a1" : "#caab70");
    line(
      c,
      [
        [-47 + i * 26, -35],
        [-38 + i * 26, -19],
      ],
      "#fff0c244",
      2,
    );
  }
  line(
    c,
    [
      [-56, -3],
      [56, -3],
    ],
    "#243b42",
    3,
  );
  for (const wx of [-41, 41]) {
    circle(c, wx, 17, 12, "#14232b", "#be985a", 3);
    line(
      c,
      [
        [wx - 7 * Math.cos(t * 7), 17 - 7 * Math.sin(t * 7)],
        [wx + 7 * Math.cos(t * 7), 17 + 7 * Math.sin(t * 7)],
      ],
      "#73817b",
      2,
    );
  }
  glow(c, 65, -13, 4, "#f7d28b");
  printLines(c, -61, -45, 120, 58, "#10232b77", 23);
  c.restore();
}
function mobile(c, asset, t) {
  c.save();
  if (t < 2.3) camera(c, 340, 384, 1.18);
  else if (t < 4.2) camera(c, mix(410, 600, p(t, 2.3, 4.2)), 426, 1.15);
  else if (t < 6.8) camera(c, 711, 404, 1.48);
  else if (t < 10) camera(c, mix(760, 940, p(t, 6.8, 10)), 425, 1.16);
  else
    camera(
      c,
      mix(940, 640, p(t, 10, 10.6)),
      mix(425, 360, p(t, 10, 10.6)),
      mix(1.16, 1, p(t, 10, 10.6)),
    );
  image(c, asset);
  // Engraved rails in the foreground give the carriage a real ground plane.
  line(
    c,
    [
      [70, 566],
      [1140, 482],
    ],
    "#142b33",
    10,
  );
  line(
    c,
    [
      [70, 567],
      [1140, 483],
    ],
    "#a68b5d",
    2,
  );
  line(
    c,
    [
      [75, 585],
      [1145, 501],
    ],
    "#172b31",
    8,
  );
  line(
    c,
    [
      [75, 585],
      [1145, 501],
    ],
    "#d5bd85",
    1.5,
  );
  for (let i = 0; i < 30; i++) {
    const x = 80 + i * 36,
      y = 570 - (x - 80) * 0.078;
    line(
      c,
      [
        [x - 5, y - 3],
        [x + 10, y + 18],
      ],
      "#182b32",
      5,
    );
  }
  phoneDoor(c, 243, 547, 153, 308, p(t, 0.5, 1.8));
  phoneDoor(c, 1097, 477, 121, 254, p(t, 9.1, 10.2));
  text(c, "APP", 222, 217, 12, "#f6d693", 650);
  text(c, "APP", 1075, 201, 12, "#f6d693", 650);
  if (t < 2.1) {
    const x = mix(81, 240, p(t, 0.2, 1.7));
    glow(c, x, 491, 6, "#ffe0a0");
    line(
      c,
      [
        [x, 501],
        [x, 520],
      ],
      "#f4c470",
      3,
    );
    line(
      c,
      [
        [x, 510],
        [x - 7, 521],
      ],
      "#f4c470",
      2,
    );
    line(
      c,
      [
        [x, 510],
        [x + 7, 521],
      ],
      "#f4c470",
      2,
    );
  }
  const unblocked = p(t, 6.25, 7.05);
  const cx =
    t < 4.2 ? mix(260, 615, p(t, 2, 4.2)) : mix(615, 1096, p(t, 7.05, 10.1));
  if (t > 1.9 && t < 10.35) {
    c.save();
    c.globalAlpha = (1 - p(t, 10, 10.35)) * p(t, 1.9, 2.1);
    carriage(
      c,
      cx,
      548 - (cx - 260) * 0.078,
      t < 4.2 || t > 7.05 ? t : 4.2,
      t >= 4.2 && t < 7.05,
    );
    c.restore();
  }
  // The permission barrier physically stops the journey before it is repaired.
  rr(c, 733, 355, 15, 166, 3, "#21363c", "#d19b50", 2);
  circle(c, 739, 479, 14, "#9d542d", "#192a30", 3);
  c.save();
  c.translate(739, 479);
  c.rotate(unblocked * 1.4);
  rr(c, -116, -9, 124, 18, 2, "#ce8c47", "#172b32", 3);
  for (let k = 0; k < 5; k++)
    line(
      c,
      [
        [-110 + k * 23, -7],
        [-99 + k * 23, 7],
      ],
      "#26363a",
      6,
    );
  c.restore();
  glow(c, 740, 338, 5, unblocked > 0.9 ? "#d4e5a3" : "#f19d61");
  if (t >= 4.25 && t < 7.18) {
    const alpha = p(t, 4.25, 4.5) * (1 - p(t, 6.9, 7.18));
    c.save();
    c.globalAlpha = alpha;
    rr(c, 613, 217, 230, 126, 8, "#e8dbc0", "#1a3540", 3);
    circle(c, 639, 244, 9, "#b57d42");
    text(c, "需要权限", 658, 252, 22, "#263e46", 650);
    line(
      c,
      [
        [634, 271],
        [820, 271],
      ],
      "#9c978866",
      1,
    );
    rr(c, 635, 286, 186, 38, 4, unblocked > 0.2 ? "#426269" : "#cfb37c");
    text(
      c,
      unblocked > 0.2 ? "继续旅程" : "允许",
      unblocked > 0.2 ? 686 : 705,
      312,
      18,
      unblocked > 0.2 ? "#e9e4c8" : "#35444a",
      600,
    );
    if (t > 5.9) {
      const fy = mix(361, 308, p(t, 5.9, 6.4));
      glow(c, 746, fy, 5, "#f8e2ac");
      if (t > 6.3)
        circle(c, 746, 308, 9 + p(t, 6.3, 6.7) * 18, null, "#bfe8c588", 2);
    }
    c.restore();
  }
  if (t >= 10.3) {
    const q = p(t, 10.3, 11.25);
    c.save();
    c.translate(0, (1 - q) * 100);
    c.globalAlpha = q;
    rr(c, 267, 537, 754, 66, 2, "#dfcf9f", "#1a3037", 3);
    for (let x = 281; x < 1008; x += 16) circle(c, x, 546, 2, "#586d68");
    line(
      c,
      [
        [320, 574],
        [952, 574],
      ],
      "#4b6e73",
      2,
    );
    for (const [i, label] of ["App", "系统权限", "返回 App"].entries()) {
      const x = 340 + i * 287;
      circle(c, x, 574, 9, "#253e45", "#f2e2bc", 2);
      text(c, label, x + 17, 580, 15, "#233c42", 600);
    }
    c.restore();
  }
  // Subtle moving rain belongs to the city, not a generic decorative overlay.
  c.save();
  c.globalAlpha = 0.2;
  for (let i = 0; i < 33; i++) {
    const x = (i * 137.3) % 1280,
      y = (i * 79.7 + t * 105) % 720;
    line(
      c,
      [
        [x, y],
        [x - 3, y + 13],
      ],
      "#bccdcb",
      0.8,
    );
  }
  c.restore();
  c.restore();
  const labels =
    t < 2.3
      ? "从入口出发"
      : t < 4.2
        ? "不止一个页面"
        : t < 6.3
          ? "遇到阻挡，先停"
          : t < 8
            ? "修复后，再继续"
            : t < 10.5
              ? "返回，也要走通"
              : t < 12
                ? "只留关键路径"
                : "体验走过，路径留下";
  subtitle(c, labels);
  stamp(c, "MOBILE / 城市穿行", "mobile-testing", p(t, 11.5, 12.4));
}

// Tactile architectural model: a missing bridge interface, exploded floors,
// a measured interlocking joint, then a physically reassembled structure.
function poly(c, points, fill, stroke = null, width = 1) {
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
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
function prism(c, x, base, w, d, h, glass = false, lit = false, asset = null) {
  const top = base - h,
    slope = d * 0.53;
  c.save();
  poly(
    c,
    [
      [x - 10, base + 4],
      [x + w + d + 30, base - slope + 5],
      [x + w + d + 50, base - slope + 28],
      [x + 20, base + 34],
    ],
    "#17252b33",
  );
  const front = c.createLinearGradient(x, top, x + w, base);
  front.addColorStop(0, glass ? "#a4c5cdcc" : "#c9c6bb");
  front.addColorStop(1, glass ? "#547782cc" : "#9c9d96");
  const frontPoints = [
    [x, top],
    [x + w, top],
    [x + w, base],
    [x, base],
  ];
  const sidePoints = [
    [x + w, top],
    [x + w + d, top - slope],
    [x + w + d, base - slope],
    [x + w, base],
  ];
  const topPoints = [
    [x, top],
    [x + d, top - slope],
    [x + w + d, top - slope],
    [x + w, top],
  ];
  poly(c, frontPoints, front, "#555e5b", 1.1);
  const side = c.createLinearGradient(x + w, top, x + w + d, base);
  side.addColorStop(0, glass ? "#6797a4cc" : "#949a91");
  side.addColorStop(1, glass ? "#3f6574cc" : "#646e69");
  poly(c, sidePoints, side, "#5b6461", 1.1);
  const roof = c.createLinearGradient(x, top - slope, x + w, top);
  roof.addColorStop(0, glass ? "#e0eff0dd" : "#f1e8d3");
  roof.addColorStop(1, glass ? "#a0c3c7dd" : "#b8b9ac");
  poly(c, topPoints, roof, "#6b746e", 1.1);
  material(c, asset, frontPoints, [x, top, w, h], glass ? 0.15 : 0.48);
  material(c, asset, sidePoints, [x + w, top - slope, d, h + slope], 0.35);
  material(c, asset, topPoints, [x, top - slope, w + d, slope], 0.32);
  line(
    c,
    [
      [x + 0.6, top + 1],
      [x + w - 1, top + 1],
      [x + w + d - 1, top - slope + 1],
    ],
    "#fff9e596",
    1.1,
  );
  c.save();
  c.beginPath();
  c.rect(x + 1, top + 1, w - 2, h - 2);
  c.clip();
  printLines(c, x, top, w, h, "#5c686226", Math.min(60, (w * h) / 500));
  c.restore();
  if (h > 25) {
    for (let row = top + 17; row < base - 7; row += 29)
      for (let col = x + 15; col < x + w - 11; col += 27) {
        rr(
          c,
          col,
          row,
          12,
          Math.min(14, base - row - 4),
          0.5,
          lit ? "#b1e4ed" : "#485d65",
          "#dad8c04d",
          0.5,
        );
        line(
          c,
          [
            [col + 1, row + 1],
            [col + 1, row + 12],
          ],
          "#223d4677",
          1.6,
        );
        line(
          c,
          [
            [col + 1, row + 12],
            [col + 11, row + 12],
          ],
          "#ede5c999",
          1,
        );
        if (lit)
          line(
            c,
            [
              [col, row + 13],
              [col + 10, row + 13],
            ],
            "#d5f5ff",
            0.7,
          );
      }
  }
  c.restore();
}
function bridge(c, x, y, w, d, filled = true, asset = null) {
  if (!filled) return;
  prism(c, x, y, w, d, 17, false, true, asset);
  line(
    c,
    [
      [x + 4, y - 20],
      [x + w - 4, y - 20],
    ],
    "#b5e9f1",
    2,
  );
  for (let z = x + 8; z < x + w - 3; z += 21)
    line(
      c,
      [
        [z, y - 19],
        [z, y - 48],
      ],
      "#617a7c",
      1,
    );
  line(
    c,
    [
      [x + 8, y - 48],
      [x + w - 6, y - 48],
    ],
    "#94b9bd",
    1,
  );
}
function backend(c, asset, t) {
  c.save();
  if (t < 2.5) camera(c, 525, 438, 1.48);
  else if (t < 3.7) camera(c, 640, 405, 1);
  else if (t < 6.7) camera(c, 661, 380, 1.1);
  else if (t < 9) camera(c, 524, 435, 1.4);
  else if (t < 11.5) camera(c, 645, 410, 1.08);
  else camera(c, 640, 360, 1);
  image(c, asset);
  const exploded = p(t, 3.5, 4.7) * (1 - p(t, 9, 10.8));
  const repaired = p(t, 7.4, 8.6);
  // Three concrete masses have proper volume, openings and a shared ground.
  prism(c, 235, 558, 173, 69, 127, false, t > 10.5, asset);
  prism(c, 885, 548, 155, 82, 116, false, t > 11, asset);
  bridge(c, 409, 456, 62, 39, true, asset);
  bridge(c, 531, 456, 45, 39, true, asset);
  bridge(c, 770, 455, 119, 43, true, asset);
  for (let floor = 0; floor < 3; floor++) {
    const offset = exploded * (floor + 1) * 54;
    const base = 549 - floor * 57 - offset;
    prism(
      c,
      575 + exploded * floor * 6,
      base,
      182,
      91,
      48,
      floor === 1,
      t > 10.5,
      asset,
    );
    if (exploded > 0.15) {
      c.save();
      c.globalAlpha = exploded;
      const names = ["存储", "业务", "入口"];
      text(c, names[floor], 789 + floor * 5, base - 16, 17, "#2d535e", 600);
      line(
        c,
        [
          [765, base - 20],
          [781, base - 20],
        ],
        "#5d8f9c",
        1,
      );
      c.restore();
    }
  }
  // A real void is visible until the joining piece is understood and placed.
  if (repaired < 0.98) {
    line(
      c,
      [
        [473, 438],
        [528, 438],
      ],
      "#934b3f",
      1.7,
    );
    for (let k = 0; k < 5; k++)
      line(
        c,
        [
          [476 + k * 10, 442],
          [479 + k * 10, 451],
        ],
        "#8b625560",
        1,
      );
  }
  if (t > 6.65) {
    const lift = 1 - repaired;
    c.save();
    c.translate(mix(102, 0, repaired), -lift * 131);
    c.rotate(lift * -0.06);
    bridge(c, 471, 456, 60, 39, true, asset);
    // Tooth and socket silhouettes distinguish contract alignment from a box diagram.
    for (let k = 0; k < 3; k++)
      rr(c, 472 + k * 17, 437, 9, 7, 1, "#dae5df", "#627f83", 0.7);
    c.restore();
  }
  if (t > 6.4 && t < 9.2) {
    const show = p(t, 6.4, 6.8) * (1 - p(t, 8.8, 9.2));
    c.save();
    c.globalAlpha = show;
    line(
      c,
      [
        [458, 397],
        [543, 397],
      ],
      "#b3eaff",
      2,
    );
    line(
      c,
      [
        [458, 388],
        [458, 415],
      ],
      "#356f83",
      2,
    );
    line(
      c,
      [
        [543, 388],
        [543, 415],
      ],
      "#356f83",
      2,
    );
    for (let n = 0; n < 8; n++)
      line(
        c,
        [
          [463 + n * 10, 397],
          [463 + n * 10, 402 + (n % 2) * 3],
        ],
        "#3a7c91",
        1,
      );
    text(c, "连接契约", 466, 381, 15, "#245d70", 600);
    c.restore();
  }
  if (t > 10.5) {
    const q = p(t, 10.5, 13.2);
    const x = mix(290, 1015, q);
    c.save();
    c.shadowColor = "#b3ecff";
    c.shadowBlur = 18;
    line(
      c,
      [
        [290, 430],
        [Math.min(x, 572), 430],
      ],
      "#9fe5f9",
      2.5,
    );
    if (x > 572)
      line(
        c,
        [
          [572, 430],
          [Math.min(x, 1015), 430],
        ],
        "#9fe5f9",
        2.5,
      );
    circle(c, x, 429, 4, "#e2fbff");
    c.restore();
  }
  c.restore();
  const label =
    t < 2.5
      ? "连接，还差一点"
      : t < 3.7
        ? "先看清现状"
        : t < 6.7
          ? "拆开，看清责任"
          : t < 9
            ? "契约先对齐"
            : t < 11.5
              ? "接好，再复位"
              : "先看清，再动工";
  subtitle(c, label, true);
  stamp(
    c,
    "DESIGN / 建筑模型",
    "elys-backend-technical-design",
    p(t, 12.8, 13.6),
    true,
  );
}

// A repair shop, not a dashboard: intermeshing teeth stop on a real foreign
// bolt, a hand turns a spanner, the obstruction lifts, then the machine runs.
function gear(c, x, y, r, teeth, angle, color, asset) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.beginPath();
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * TAU;
    const radius = i % 4 === 0 || i % 4 === 3 ? r * 0.88 : r;
    const px = Math.cos(a) * radius,
      py = Math.sin(a) * radius;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
  c.fillStyle = color;
  c.fill();
  c.strokeStyle = "#151916";
  c.lineWidth = 5;
  c.stroke();
  c.save();
  c.clip();
  c.globalCompositeOperation = "multiply";
  c.globalAlpha = 0.55;
  c.drawImage(
    asset,
    asset.naturalWidth * 0.2,
    asset.naturalHeight * 0.65,
    asset.naturalWidth * 0.4,
    asset.naturalHeight * 0.12,
    -r,
    -r,
    r * 2,
    r * 2,
  );
  c.globalCompositeOperation = "source-over";
  c.globalAlpha = 1;
  printLines(c, -r, -r, r * 2, r * 2, "#171a14b3", 145);
  c.restore();
  circle(c, 0, 0, r * 0.62, "#20241f", "#c69848", 2);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    line(
      c,
      [
        [Math.cos(a) * r * 0.24, Math.sin(a) * r * 0.24],
        [Math.cos(a) * r * 0.59, Math.sin(a) * r * 0.59],
      ],
      color,
      r * 0.13,
    );
  }
  circle(c, 0, 0, r * 0.23, "#c1a064", "#171d1b", 4);
  circle(c, 0, 0, r * 0.085, "#343b33", "#0e1819", 2);
  c.restore();
}
function spannerHand(c, progress, t, asset) {
  const enter = p(t, 2.5, 3.35) * (1 - p(t, 5.8, 6.6));
  if (enter <= 0) return;
  c.save();
  c.translate((1 - enter) * 450, (1 - enter) * 100);
  const swing = Math.sin(progress * Math.PI * 3) * 0.26 - progress * 0.12;
  c.save();
  c.translate(615, 423);
  c.rotate(swing);
  // Rolled sleeve and forearm follow the wrist rather than sliding a tool icon.
  c.beginPath();
  c.moveTo(620, 103);
  c.bezierCurveTo(482, 58, 378, -16, 266, -18);
  c.bezierCurveTo(210, -20, 185, -10, 163, 1);
  c.lineTo(164, 51);
  c.bezierCurveTo(219, 47, 285, 53, 350, 86);
  c.lineTo(581, 185);
  c.closePath();
  c.fillStyle = "#bc7042";
  c.fill();
  c.strokeStyle = "#18201b";
  c.lineWidth = 5;
  c.stroke();
  c.save();
  c.clip();
  c.globalCompositeOperation = "multiply";
  c.globalAlpha = 0.37;
  c.drawImage(
    asset,
    asset.naturalWidth * 0.22,
    asset.naturalHeight * 0.65,
    asset.naturalWidth * 0.4,
    asset.naturalHeight * 0.1,
    130,
    -30,
    510,
    220,
  );
  c.globalCompositeOperation = "source-over";
  c.globalAlpha = 1;
  printLines(c, 130, -25, 490, 230, "#211d1777", 130);
  c.restore();
  poly(
    c,
    [
      [345, 1],
      [402, 24],
      [374, 109],
      [320, 81],
    ],
    "#8d402b",
    "#18201b",
    4,
  );
  for (let i = 0; i < 6; i++)
    line(
      c,
      [
        [350 + i * 6, 15],
        [328 + i * 6, 79],
      ],
      "#d98a4777",
      2,
    );
  // Long steel handle and an open jaw wrap the visible six-sided nut.
  c.save();
  c.rotate(-0.14);
  c.beginPath();
  c.moveTo(-23, -24);
  c.lineTo(-5, -34);
  c.lineTo(16, -26);
  c.lineTo(22, -9);
  c.lineTo(195, -7);
  c.quadraticCurveTo(215, -7, 215, 8);
  c.quadraticCurveTo(215, 23, 196, 23);
  c.lineTo(20, 11);
  c.lineTo(7, 25);
  c.lineTo(-19, 19);
  c.lineTo(-27, 3);
  c.lineTo(-10, 8);
  c.lineTo(4, -1);
  c.lineTo(0, -15);
  c.closePath();
  c.fillStyle = "#c5b481";
  c.fill();
  c.strokeStyle = "#17211c";
  c.lineWidth = 4;
  c.stroke();
  line(
    c,
    [
      [39, 1],
      [192, 5],
    ],
    "#e9d6a1",
    3,
  );
  circle(c, 198, 8, 5, "#2c362b");
  c.restore();
  // Gripping thumb, knuckle folds and four curled fingers give the hand volume.
  c.beginPath();
  c.moveTo(184, -25);
  c.bezierCurveTo(157, -35, 125, -26, 118, -10);
  c.bezierCurveTo(111, 0, 116, 10, 132, 10);
  c.lineTo(149, 4);
  c.bezierCurveTo(142, 27, 139, 49, 153, 57);
  c.bezierCurveTo(170, 66, 197, 63, 212, 48);
  c.bezierCurveTo(228, 30, 218, 1, 205, -12);
  c.closePath();
  c.fillStyle = "#d09359";
  c.fill();
  c.strokeStyle = "#20231b";
  c.lineWidth = 4;
  c.stroke();
  c.save();
  c.clip();
  printLines(c, 115, -30, 110, 100, "#422c2266", 115);
  c.restore();
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.moveTo(153 + i * 12, 7 + i * 2);
    c.bezierCurveTo(147 + i * 12, 21, 151 + i * 12, 36, 164 + i * 10, 37);
    c.strokeStyle = "#78502f";
    c.lineWidth = 2;
    c.stroke();
  }
  line(
    c,
    [
      [127, -7],
      [150, -13],
      [174, -12],
    ],
    "#e8b77b",
    2,
  );
  printLines(c, 127, -20, 82, 70, "#563b2633", 21);
  c.restore();
  c.restore();
}
function garage(c, asset, t) {
  c.save();
  if (t < 1.6) camera(c, 640, 360, 1.02);
  else if (t < 3) camera(c, 584, 425, 1.48);
  else if (t < 5.8) camera(c, 678, 433, 1.24);
  else if (t < 8) camera(c, 656, 437, 1.15);
  else camera(c, 640, 360, 1);
  image(c, asset);
  const fixed = p(t, 4.5, 5.45);
  const running = t < 5.5 ? 0 : t < 8 ? p(t, 5.5, 7.8) * 0.7 : 1;
  const angle =
    t < 5.5 ? Math.sin(t * 28) * 0.017 : (t - 5.5) * (1 + running * 2.8);
  // A heavy machine rests on the bench; the rollers carry the result out.
  rr(c, 262, 486, 686, 85, 4, "#635532", "#131c19", 5);
  material(
    c,
    asset,
    [
      [264, 488],
      [946, 488],
      [946, 569],
      [264, 569],
    ],
    [264, 488, 682, 81],
    0.6,
    [0.22, 0.65, 0.4, 0.12],
  );
  rr(c, 284, 500, 645, 28, 2, "#1d2821", "#c7a45a", 2);
  for (let i = 0; i < 14; i++) {
    const x = 301 + i * 44;
    circle(c, x, 516, 11, "#746b49", "#141e18", 2);
    line(
      c,
      [
        [x - 6 * Math.cos(angle), 516 - 6 * Math.sin(angle)],
        [x + 6 * Math.cos(angle), 516 + 6 * Math.sin(angle)],
      ],
      "#cfb276",
      2,
    );
  }
  for (const x of [280, 918]) {
    rr(c, x, 566, 22, 27, 1, "#443e2b", "#17201b", 3);
  }
  line(
    c,
    [
      [380, 460],
      [380, 545],
    ],
    "#25342b",
    18,
  );
  line(
    c,
    [
      [824, 450],
      [824, 545],
    ],
    "#25342b",
    18,
  );
  gear(c, 450, 423, 91, 16, angle, "#a9572d", asset);
  gear(c, 615, 423, 91, 16, -angle, "#bfa14c", asset);
  gear(c, 772, 423, 76, 14, angle * 1.18, "#ae6f32", asset);
  // The red foreign bolt visibly wedges the teeth before being withdrawn.
  if (fixed < 0.99) {
    c.save();
    c.globalAlpha = 1 - p(t, 5.2, 5.6);
    c.translate(532 + fixed * 144, 414 - fixed * 119);
    c.rotate(-0.6 + fixed * 1.1);
    rr(c, -7, -24, 14, 48, 1, "#a33b2a", "#1c201a", 3);
    rr(c, -17, -23, 34, 12, 1, "#d16c3e", "#1c201a", 3);
    for (let n = 0; n < 5; n++)
      line(
        c,
        [
          [-8, -4 + n * 5],
          [8, -2 + n * 5],
        ],
        "#e5a26a",
        1,
      );
    c.restore();
  }
  const turn = p(t, 3.2, 5.4);
  spannerHand(c, turn, t, asset);
  // Physical red/green inspection lamps; the first rotation is still a retest.
  rr(c, 928, 327, 18, 162, 2, "#303b2c", "#0f1916", 4);
  rr(c, 903, 321, 68, 50, 5, "#1f2c24", "#b9994d", 3);
  const green = t >= 8;
  circle(c, 922, 347, 11, green ? "#563c2c" : "#c0502d", "#111d17", 2);
  circle(c, 952, 347, 11, green ? "#bfcb6b" : "#454d2b", "#111d17", 2);
  if (green) glow(c, 952, 347, 5, "#dce69a");
  else if (Math.sin(t * 9) > -0.3) glow(c, 922, 347, 5, "#e66d36");
  if (t >= 8.1) {
    const q = p(t, 8.1, 10.2);
    c.save();
    c.translate(mix(824, 1028, q), 487);
    c.rotate(-0.03);
    rr(c, -65, -38, 134, 75, 1, "#d0bc80", "#333e2c", 2);
    for (let k = 0; k < 5; k++)
      line(
        c,
        [
          [-47, -23 + k * 10],
          [10, -23 + k * 10],
        ],
        "#6b7253",
        2,
      );
    line(
      c,
      [
        [22, 0],
        [34, 11],
        [55, -15],
      ],
      "#345a42",
      5,
    );
    printLines(c, -59, -32, 121, 63, "#58583c55", 18);
    c.restore();
  }
  if (t >= 9) {
    // Moving belt marks make the completed mechanism visibly sustained.
    for (let i = 0; i < 9; i++) {
      const x = 284 + ((i * 70 + (t - 9) * 90) % 623);
      line(
        c,
        [
          [x, 550],
          [x + 20, 550],
        ],
        "#b2a260",
        2,
      );
    }
  }
  c.restore();
  const label =
    t < 2.5
      ? "先复现卡点"
      : t < 4.3
        ? "沿着契约找"
        : t < 5.8
          ? "修在关键处"
          : t < 8
            ? "修完，再走一遍"
            : t < 10.5
              ? "整条链跑起来"
              : t < 12
                ? "结果看得见"
                : "做完，也走通";
  subtitle(c, label);
  stamp(c, "BUILD / 版画修理厂", "elys-code-development", p(t, 11.4, 12.2));
}

export function render(ctx, assets, id, time) {
  const film = films.find((film) => film.id === id);
  if (!film) throw new Error("Unknown machine film: " + id);
  const t = Math.max(
    0,
    Math.min(film.duration - 0.001, Number.isFinite(time) ? time : 0),
  );
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "#111e22";
  ctx.fillRect(0, 0, 1280, 720);
  if (id === "mobile-testing") mobile(ctx, assets, t);
  else if (id === "elys-backend-technical-design") backend(ctx, assets, t);
  else garage(ctx, assets, t);
  ctx.restore();
}
