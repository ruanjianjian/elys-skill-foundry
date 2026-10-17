/** 16-second illustrated decision-card film. Original layered artwork, physical paper and match cuts. */
export const CINEMATIC_DURATION = 16;
export const WIDTH = 1280;
export const HEIGHT = 720;
const W = WIDTH,
  H = HEIGHT,
  PI = Math.PI;
const INK = "#302d27",
  RED = "#a63d30",
  PAPER = "#e4cda6";
const sans =
  '-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif';
const serif = '"Kaiti SC","STKaiti","Songti SC",Georgia,serif';
const mono = "ui-monospace,SFMono-Regular,Menlo,monospace";
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
const smooth = (x) => {
  x = clamp(x);
  return x * x * (3 - 2 * x);
};
const mix = (a, b, p) => a + (b - a) * p;
const part = (t, s, d = 1) => ease((t - s) / d);
const hash = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
function txt(
  c,
  s,
  x,
  y,
  size = 20,
  color = INK,
  weight = 500,
  align = "left",
  font = sans,
) {
  c.fillStyle = color;
  c.font = `${weight} ${size}px ${font}`;
  c.textAlign = align;
  c.textBaseline = "middle";
  c.fillText(s, x, y);
}
function line(c, x1, y1, x2, y2, color = INK, width = 1) {
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
function polygon(c, pts, fill, stroke) {
  c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.closePath();
  if (fill) {
    c.fillStyle = fill;
    c.fill();
  }
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 1;
    c.stroke();
  }
}
function alpha(c, a, fn) {
  if (a <= 0) return;
  c.save();
  c.globalAlpha *= clamp(a);
  fn();
  c.restore();
}
function transform(c, x, y, r, sx, sy, fn) {
  c.save();
  c.translate(x, y);
  c.rotate(r);
  c.scale(sx, sy);
  fn();
  c.restore();
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Cinematic artwork unavailable: ${src}`));
    img.src = src;
  });
}
export async function loadCinematicAssets() {
  const [wide, eye, hand, clean] = await Promise.all(
    ["wide", "eye", "hand", "clean"].map((id) =>
      loadImage(`media/cinematic-art/${id}.jpg`),
    ),
  );
  return { wide, eye, hand, clean };
}
function artwork(
  c,
  img,
  { zoom = 1, x = 0, y = 0, roll = 0, brightness = 1 } = {},
) {
  c.save();
  c.translate(640 + x, 360 + y);
  c.rotate(roll);
  c.scale(zoom, zoom);
  if (img) {
    const iw = img.naturalWidth || img.width,
      ih = img.naturalHeight || img.height;
    const scale = Math.max(W / iw, H / ih);
    c.drawImage(
      img,
      (-iw * scale) / 2,
      (-ih * scale) / 2,
      iw * scale,
      ih * scale,
    );
  } else {
    c.fillStyle = "#bdb3a2";
    c.fillRect(-W / 2, -H / 2, W, H);
  }
  if (brightness < 1) {
    c.fillStyle = `rgba(20,17,14,${1 - brightness})`;
    c.fillRect(-W / 2, -H / 2, W, H);
  }
  c.restore();
}
function vignette(c, strength = 0.2) {
  const g = c.createRadialGradient(640, 340, 220, 640, 360, 780);
  g.addColorStop(0, "#15100c00");
  g.addColorStop(1, `rgba(21,16,12,${strength})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}
function inkCheck(c, x, y, s, p = 1) {
  const pts = [
    [-0.46, -0.03],
    [-0.12, 0.32],
    [0.56, -0.43],
  ];
  c.beginPath();
  c.moveTo(x + pts[0][0] * s, y + pts[0][1] * s);
  if (p < 0.33) {
    c.lineTo(
      mix(x + pts[0][0] * s, x + pts[1][0] * s, p / 0.33),
      mix(y + pts[0][1] * s, y + pts[1][1] * s, p / 0.33),
    );
  } else {
    c.lineTo(x + pts[1][0] * s, y + pts[1][1] * s);
    c.lineTo(
      mix(x + pts[1][0] * s, x + pts[2][0] * s, (p - 0.33) / 0.67),
      mix(y + pts[1][1] * s, y + pts[2][1] * s, (p - 0.33) / 0.67),
    );
  }
  c.lineWidth = 4.5;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = RED;
  c.stroke();
}
function paperTexture(c, w, h, seed = 0) {
  c.save();
  c.globalAlpha = 0.18;
  for (let i = 0; i < 78; i++) {
    const x = (hash(i + seed * 43) - 0.5) * (w - 12),
      y = (hash(i + 500 + seed * 17) - 0.5) * (h - 12);
    line(c, x, y, x + 1.5 + hash(i + 80) * 2, y + 0.3, "#7a715f", 0.45);
  }
  c.restore();
  const g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, "#ffffff24");
  g.addColorStop(0.5, "#ffffff00");
  g.addColorStop(1, "#4e3c2420");
  c.fillStyle = g;
  c.fillRect(-w / 2, -h / 2, w, h);
}
/** Paper projects in 3-D, with a clipped affine face for the brief mid-flip. */
function paper(
  c,
  {
    x,
    y,
    w = 210,
    h = 290,
    r = 0,
    rx = 0,
    ry = 0,
    scale = 1,
    seed = 0,
    kind = "blank",
    title = "确认方案",
    checked = 0,
    comment = 0,
    opacity = 1,
    shadow = true,
    back = false,
    number = "01",
  } = {},
) {
  if (opacity <= 0 || scale <= 0) return;
  c.save();
  c.globalAlpha *= opacity;
  c.translate(x, y);
  c.rotate(r);
  c.scale(scale, scale);
  const depth = 750,
    pts = [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2],
    ].map(([px, py]) => {
      const a = px * Math.cos(ry),
        z = -px * Math.sin(ry);
      const b = py * Math.cos(rx) - z * Math.sin(rx),
        zz = py * Math.sin(rx) + z * Math.cos(rx);
      const p = depth / (depth + zz);
      return [a * p, b * p];
    });
  if (shadow) {
    c.save();
    c.shadowColor = "#20150d55";
    c.shadowBlur = 18;
    c.shadowOffsetX = 8;
    c.shadowOffsetY = 12;
    polygon(c, pts, "#d4c8b3");
    c.restore();
  }
  polygon(c, pts, back ? "#d9ceba" : PAPER, "#8b7e695c");
  c.save();
  polygon(c, pts);
  c.clip();
  const faceScaleX = Math.max(0.015, Math.abs(Math.cos(ry))),
    faceScaleY = Math.max(0.07, Math.abs(Math.cos(rx)));
  c.scale(faceScaleX, faceScaleY);
  if (Math.cos(ry) < 0) c.scale(-1, 1);
  paperTexture(c, w, h, seed);
  const pad = Math.max(15, w * 0.095);
  if (back || Math.cos(ry) < 0) {
    line(c, -w / 2 + pad, -h * 0.22, w / 2 - pad, -h * 0.22, "#8a7b6633", 1);
    line(c, -w / 2 + pad, 0, w / 2 - pad, 0, "#8a7b6633", 1);
    line(c, -w / 2 + pad, h * 0.22, w / 2 - pad, h * 0.22, "#8a7b6633", 1);
    txt(c, "NS", 0, 0, w * 0.18, "#6d614f55", 500, "center", serif);
  } else if (kind === "chaos") {
    const short = ["先这样？", "再想想", "上次结论", "改一下", "还没定"][
      seed % 5
    ];
    txt(
      c,
      short,
      -w / 2 + pad,
      -h * 0.28,
      w * 0.12,
      "#5c5549",
      500,
      "left",
      serif,
    );
    for (let k = 0; k < 3; k++)
      line(
        c,
        -w / 2 + pad,
        -h * 0.05 + k * h * 0.11,
        w / 2 - pad * (1 + (k % 2)),
        -h * 0.05 + k * h * 0.11,
        "#968b793d",
        0.8,
      );
    if (seed % 3 === 0) {
      line(c, -w * 0.28, h * 0.18, w * 0.25, h * 0.1, RED, 1.4);
      line(c, -w * 0.26, h * 0.19, w * 0.23, h * 0.11, RED, 0.5);
    }
  } else if (kind === "decision") {
    txt(
      c,
      number,
      -w / 2 + pad,
      -h / 2 + pad,
      w * 0.055,
      "#8d806d",
      500,
      "left",
      mono,
    );
    txt(c, title, -w / 2 + pad, -h * 0.23, w * 0.105, INK, 550);
    line(
      c,
      -w / 2 + pad,
      -h * 0.115,
      w / 2 - pad,
      -h * 0.115,
      "#9f927b73",
      0.7,
    );
    c.beginPath();
    c.arc(-w * 0.32, h * 0.04, w * 0.025, 0, PI * 2);
    c.strokeStyle = "#9a8b74";
    c.lineWidth = 1;
    c.stroke();
    txt(c, "选择 A", -w * 0.25, h * 0.04, w * 0.085, INK, 500);
    if (checked > 0) inkCheck(c, -w * 0.32, h * 0.04, w * 0.082, checked);
    line(c, -w * 0.35, h * 0.21, w * 0.34, h * 0.21, "#a697805c", 0.7);
    alpha(c, 1 - comment, () =>
      txt(c, "留一句话", -w * 0.35, h * 0.28, w * 0.068, "#a09380", 400),
    );
    alpha(c, comment, () =>
      txt(
        c,
        "先把这一步做好。",
        -w * 0.35,
        h * 0.28,
        w * 0.066,
        "#735b49",
        500,
        "left",
        serif,
      ),
    );
    if (checked > 0.95) {
      txt(c, "已确认", w * 0.34, h * 0.4, w * 0.055, RED, 500, "right", serif);
    }
  } else if (kind === "result") {
    txt(
      c,
      number,
      -w / 2 + pad,
      -h * 0.36,
      w * 0.065,
      "#90816b",
      500,
      "left",
      mono,
    );
    txt(c, title, -w / 2 + pad, -h * 0.16, w * 0.12, INK, 500, "left", serif);
    inkCheck(c, w * 0.25, -h * 0.19, w * 0.17, 1);
    line(c, -w * 0.35, h * 0.03, w * 0.35, h * 0.03, "#b3a58d77", 1);
    txt(c, "选择 A", -w * 0.35, h * 0.17, w * 0.08, "#6c5c47", 500);
    txt(
      c,
      "结论已留存",
      -w * 0.35,
      h * 0.32,
      w * 0.066,
      RED,
      500,
      "left",
      serif,
    );
  } else if (kind === "hero") {
    txt(
      c,
      "NS / DECISION CARD",
      -w * 0.37,
      -h * 0.27,
      w * 0.027,
      "#8a7c64",
      500,
      "left",
      mono,
    );
    line(c, -w * 0.37, -h * 0.14, w * 0.37, -h * 0.14, "#a89a7e", 0.7);
    txt(
      c,
      "/ns-spec-cards",
      -w * 0.37,
      h * 0.015,
      w * 0.056,
      INK,
      550,
      "left",
      mono,
    );
    txt(
      c,
      "逐张拍板。",
      -w * 0.37,
      h * 0.25,
      w * 0.065,
      RED,
      500,
      "left",
      serif,
    );
    inkCheck(c, w * 0.31, h * 0.24, w * 0.1, 1);
  }
  // A bent corner and edge highlight make the paper a tangible object.
  polygon(
    c,
    [
      [w / 2 - 17, -h / 2],
      [w / 2, -h / 2 + 18],
      [w / 2 - 17, -h / 2 + 18],
    ],
    "#c9bda7",
  );
  line(c, -w / 2 + 1, -h / 2 + 1, w / 2 - 20, -h / 2 + 1, "#fff9eeab", 0.8);
  c.restore();
  c.restore();
}
function ambientCards(c, t, { sweep = 0, pressure = 1, camera = 1 } = {}) {
  // Cards are sorted by depth so the close scraps correctly occlude the actor.
  const specs = Array.from({ length: 24 }, (_, i) => ({
    i,
    z: hash(i + 12),
  })).sort((a, b) => a.z - b.z);
  for (const { i, z } of specs) {
    const entrance = part(t, i * 0.035, 0.8),
      sx = 70 + hash(i + 43) * 790,
      sy = 150 + hash(i + 77) * 530;
    const size = 0.32 + z * 0.8,
      angle = (hash(i + 19) - 0.5) * 1.25;
    const wind = part(sweep, i * 0.018, 0.72);
    const x = mix(sx + 260 * (1 - entrance), -470 - i * 23, wind),
      y = mix(sy + 80 * (1 - entrance), 70 + i * 12, wind);
    const r =
      angle + Math.sin(t * 0.6 + i) * 0.016 - pressure * 0.05 + wind * 0.8;
    const p = {
      x,
      y,
      w: 150,
      h: 214,
      r,
      rx: 0.15 + z * 0.12,
      ry: (1 - entrance) * 1.1 + wind * 0.5,
      scale: size * (0.8 + 0.2 * entrance),
      seed: i,
      kind: "chaos",
      opacity: entrance * (1 - wind * 0.7),
    };
    if (sweep > 0 && wind > 0.05 && wind < 0.9) {
      for (let k = 2; k > 0; k--)
        paper(c, {
          ...p,
          x: x + k * 32,
          opacity: (p.opacity * 0.07) / k,
          shadow: false,
        });
    }
    paper(c, p);
  }
}
function foregroundMatch(c, progress, reverse = false) {
  // An angled foreground sheet wipes the lens and carries the edit.
  const p = clamp(progress),
    x = mix(reverse ? -1000 : 2050, reverse ? 2050 : -1000, smooth(p));
  paper(c, {
    x,
    y: 365,
    w: 910,
    h: 1250,
    r: -0.53,
    ry: 0.13,
    scale: 1,
    kind: "blank",
    seed: 75,
    shadow: false,
  });
}
function broad(c, assets, t, opts = {}) {
  const zoom = opts.zoom || 1.04;
  artwork(c, opts.clean ? assets.clean || assets.wide : assets.wide, {
    zoom,
    x: opts.x || 0,
    y: opts.y || 0,
    roll: opts.roll || 0,
    brightness: opts.brightness || 1,
  });
}
function sceneOpening(c, a, t) {
  const move = part(t, 0, 2.5);
  broad(c, a, t, {
    zoom: mix(1, 1.085, move),
    x: -14 * move,
    y: 9 * move,
    brightness: 0.92,
  });
  c.save();
  c.translate(-move * 20, move * 3);
  ambientCards(c, t, { pressure: 1 });
  c.restore();
  // One close, fast paper passes through the lens in the first second.
  if (t < 1.05) {
    const p = smooth(t / 1.05);
    paper(c, {
      x: mix(1400, -380, p),
      y: mix(620, 130, p),
      w: 330,
      h: 480,
      r: mix(-0.65, 0.2, p),
      ry: mix(1.2, -0.55, p),
      scale: 1.55,
      seed: 37,
      kind: "chaos",
      opacity: 0.98,
    });
  }
}
function sceneEye(c, a, t) {
  const local = t - 2.5;
  artwork(c, a.eye, {
    zoom: mix(1.02, 1.07, smooth(local)),
    x: -local * 6,
    y: 0,
  });
  // The quiet beat carries a single question, with no animated HUD or title overlay.
  alpha(c, part(local, 0.15, 0.22), () => {
    txt(c, "还没定？", 80, 585, 31, "#ede3d2", 500, "left", serif);
  });
}
function sceneSweep(c, a, t) {
  const local = t - 3.5;
  const p = smooth(local / 2);
  broad(c, a, t, {
    zoom: mix(1.085, 1.025, p),
    x: mix(-14, 18, p),
    y: 0,
    roll: mix(-0.012, 0.025, p),
    brightness: 0.95,
  });
  ambientCards(c, 2.5 + local, {
    sweep: Math.max(0, local - 0.3),
    pressure: 1 - local / 2,
  });
  if (local < 0.75) foregroundMatch(c, local / 0.75, true);
}
function sceneHand(c, a, t) {
  const local = t - 5.5;
  const camera = {
    zoom: mix(1.035, 1.085, smooth(local / 2.5)),
    x: -local * 4,
    y: local * 3,
  };
  artwork(c, a.hand, camera);
  // Ink lives on the illustrated card itself. Reuse precisely the artwork camera,
  // then map a 300 × 420 writing surface onto its measured, slightly tilted corners.
  // The lower-right thumb is preserved: all writing stays in the upper/left region.
  c.save();
  c.translate(640 + camera.x, 360 + camera.y);
  c.scale(camera.zoom, camera.zoom);
  c.translate(-640, -360);
  c.transform(
    (719 - 423) / 300,
    (83 - 94) / 300,
    (439 - 423) / 420,
    (513 - 94) / 420,
    423,
    94,
  );
  const reveal = part(local, 0.1, 0.45),
    checked = part(local, 1, 0.6),
    comment = part(local, 1.75, 0.5);
  alpha(c, reveal, () => {
    txt(c, "01 / DECISION", 32, 38, 10, "#8b7453", 500, "left", mono);
    txt(c, "确认方案", 32, 91, 25, INK, 550);
    line(c, 32, 124, 253, 124, "#8a755470", 0.8);
    c.beginPath();
    c.arc(40, 181, 7.5, 0, PI * 2);
    c.strokeStyle = "#8f7859";
    c.lineWidth = 1.1;
    c.stroke();
    txt(c, "选择 A", 62, 181, 21, INK, 500);
    if (checked > 0) inkCheck(c, 40, 181, 25, checked);
    line(c, 33, 273, 225, 273, "#9c805661", 0.8);
    alpha(c, 1 - comment, () =>
      txt(c, "留一句话", 34, 250, 18, "#9b825e", 400),
    );
    alpha(c, comment, () =>
      txt(c, "先做好这一版。", 34, 250, 18, "#6b5138", 500, "left", serif),
    );
    alpha(c, checked, () =>
      txt(c, "已确认", 34, 351, 16, RED, 500, "left", serif),
    );
  });
  c.restore();
}
function sceneFollow(c, a, t) {
  const local = t - 8;
  const p = smooth(local / 3.5);
  broad(c, a, t, {
    zoom: 1.13,
    x: mix(100, -100, p),
    y: -20,
    roll: mix(0.025, -0.015, p),
    brightness: 0.91,
  });
  // The continuous pan follows one physical card at a time; completed cards remain
  // as objects on the desk rather than turning into a diagram or a box-list.
  for (let i = 0; i < 3; i++) {
    const start = i * 0.95,
      q = clamp((local - start) / 1.15);
    if (local < start) continue;
    const enter = ease(q / 0.43),
      fall = smooth((q - 0.35) / 0.65),
      flip = smooth((q - 0.12) / 0.65);
    const x = mix(900 - i * 45, 260 + i * 255, enter),
      y = mix(180, 485 + i * 18, fall);
    const ry = PI * (1 - flip);
    const scale = mix(0.95, 0.69, fall);
    const r = mix(-0.3, -0.16 + i * 0.14, fall);
    // Floor shadow tightens as each sheet reaches the desk.
    alpha(c, 0.18 + fall * 0.18, () => {
      c.save();
      c.translate(260 + i * 255, 585 + i * 18);
      c.scale(1, 0.12);
      c.beginPath();
      c.ellipse(0, 0, 86 * (1.3 - fall * 0.3), 47, 0, 0, 2 * PI);
      c.fillStyle = "#2d2016";
      c.fill();
      c.restore();
    });
    const spec = {
      x,
      y,
      w: 226,
      h: 305,
      r,
      rx: fall * 0.5,
      ry,
      scale,
      kind: "result",
      title: ["确认方案", "体验动线", "验收方式"][i],
      number: `0${i + 1}`,
      seed: 21 + i,
      checked: 1,
    };
    if (q > 0.1 && q < 0.68) {
      paper(c, { ...spec, x: x + 25, opacity: 0.09, shadow: false });
      paper(c, { ...spec, x: x + 12, opacity: 0.11, shadow: false });
    }
    paper(c, spec);
  }
}
function sceneResolved(c, a, t) {
  const local = t - 11.5,
    p = smooth(local / 2.5);
  broad(c, a, t, {
    zoom: mix(1.035, 1.005, p),
    x: mix(5, 0, p),
    y: 0,
    brightness: 1,
    clean: true,
  });
  // Three result sheets stay in the same world, at the left edge of the clean desk.
  for (let i = 2; i >= 0; i--)
    paper(c, {
      x: 255 + i * 82,
      y: 430 + i * 28,
      w: 192,
      h: 259,
      r: -0.18 + i * 0.12,
      rx: 0.26,
      scale: 0.83,
      kind: "result",
      title: ["确认方案", "体验动线", "验收方式"][i],
      number: `0${i + 1}`,
      seed: 31 + i,
      checked: 1,
    });
  // The displaced draft stack sits low in the corner, giving the composition air.
  for (let i = 4; i >= 0; i--)
    paper(c, {
      x: 91 + i * 5,
      y: 600 + i * 2,
      w: 166,
      h: 214,
      r: -0.31 + i * 0.015,
      rx: 1.08,
      scale: 0.7,
      kind: "chaos",
      seed: 54 + i,
      shadow: i === 4,
      opacity: 0.82,
    });
}
function sceneEnd(c, a, t) {
  const local = t - 14,
    p = smooth(local / 2);
  broad(c, a, t, {
    zoom: mix(1.005, 1.06, p),
    x: 0,
    y: 0,
    brightness: 0.83,
    clean: true,
  });
  // The final shot is an index card on a desk. Branding belongs to the object.
  paper(c, {
    x: mix(535, 545, p),
    y: mix(425, 405, p),
    w: 650,
    h: 365,
    r: mix(-0.075, -0.045, p),
    rx: 0.22,
    ry: 0.03,
    scale: 1,
    kind: "hero",
    seed: 98,
  });
}
export function renderCinematic(ctx, assets = {}, seconds = 0) {
  const t = Math.max(
    0,
    Math.min(CINEMATIC_DURATION, Number.isFinite(seconds) ? seconds : 0),
  );
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  // Handheld drift is small and continuous; typography never jitters independently.
  const dx = Math.sin(t * 0.84) * 0.8 + Math.sin(t * 1.73) * 0.35,
    dy = Math.sin(t * 0.63 + 1) * 0.6;
  ctx.translate(dx, dy);
  ctx.scale(1.003, 1.003);
  if (t < 2.5) sceneOpening(ctx, assets, t);
  else if (t < 3.5) sceneEye(ctx, assets, t);
  else if (t < 5.5) sceneSweep(ctx, assets, t);
  else if (t < 8) sceneHand(ctx, assets, t);
  else if (t < 11.5) sceneFollow(ctx, assets, t);
  else if (t < 14) sceneResolved(ctx, assets, t);
  else sceneEnd(ctx, assets, t);
  vignette(ctx, t >= 14 ? 0.28 : 0.17);
  // Film grain is anchored to the film, not re-randomized on every frame.
  ctx.save();
  ctx.globalAlpha = 0.035;
  for (let i = 0; i < 700; i++) {
    const x = hash(i + 2700) * W,
      y = hash(i + 8100) * H;
    ctx.fillStyle = i % 2 ? "#f2e7ce" : "#251d15";
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
  // Modest letterbox keeps the illustrated cinema composition; no giant captions.
  ctx.fillStyle = "#17130f";
  ctx.fillRect(0, 0, W, 22);
  ctx.fillRect(0, H - 22, W, 22);
  txt(
    ctx,
    "NS / ORIGINAL MOTION STUDY",
    35,
    11,
    8,
    "#ac9d87",
    500,
    "left",
    mono,
  );
  txt(ctx, "能力示意", 1245, 709, 8, "#ac9d87", 400, "right");
  ctx.restore();
}
