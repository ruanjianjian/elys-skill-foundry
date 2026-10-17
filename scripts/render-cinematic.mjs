import puppeteer from "puppeteer-core";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { CINEMATIC_DURATION, WIDTH, HEIGHT } from "../cinematic-renderer.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifacts =
  process.env.FOUNDRY_ARTIFACT_DIR ||
  join(homedir(), "DevData/Artifacts/20261017-skills-promo/foundry");
const output = join(artifacts, "cinematic");
const fps = 30;
const posterOnly = process.argv.includes("--posters-only");
await Promise.all(
  [output, join(root, "media/pilots")].map((path) =>
    mkdir(path, { recursive: true }),
  ),
);
const shell =
  '<!doctype html><meta charset="utf-8"><canvas width="1280" height="720"></canvas><script type="module">import {renderCinematic,loadCinematicAssets} from "/cinematic-renderer.js";await document.fonts.ready;const assets=await loadCinematicAssets();const c=document.querySelector("canvas");const x=c.getContext("2d");window.capture=(t,format="png")=>{renderCinematic(x,assets,t);return c.toDataURL("image/"+format,.94).split(",")[1]};window.ready=true;</script>';
const server = createServer(async (request, response) => {
  const path = new URL(request.url, "http://localhost").pathname;
  if (path === "/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(shell);
    return;
  }
  const allowed = [
    "/cinematic-renderer.js",
    "/media/cinematic-art/wide.jpg",
    "/media/cinematic-art/eye.jpg",
    "/media/cinematic-art/hand.jpg",
    "/media/cinematic-art/clean.jpg",
  ];
  if (allowed.includes(path)) {
    try {
      const data = await readFile(join(root, path.slice(1)));
      response.writeHead(200, {
        "Content-Type": path.endsWith(".js")
          ? "text/javascript; charset=utf-8"
          : "image/jpeg",
      });
      response.end(data);
    } catch {
      response.writeHead(404);
      response.end();
    }
  } else {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  userDataDir: join(artifacts, "chrome-cinematic-render-profile"),
  headless: true,
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
  ],
});
try {
  const page = await browser.newPage();
  await page.setViewport({
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) => console.error(error.message));
  await page.goto("http://127.0.0.1:" + server.address().port, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction("window.ready === true");
  for (const t of [0.8, 2, 3, 4.8, 6.8, 8.8, 10.5, 12.5, 14.8]) {
    const data = await page.evaluate((t) => window.capture(t, "jpeg"), t);
    await writeFile(
      join(output, "frame-" + t + ".jpg"),
      Buffer.from(data, "base64"),
    );
    if (t === 6.8)
      await writeFile(
        join(root, "media/pilots/ns-spec-cards.jpg"),
        Buffer.from(data, "base64"),
      );
  }
  console.log("Cinematic review frames ready");
  if (!posterOnly) {
    const path = join(output, "ns-spec-cards.mp4");
    const encoder = spawn(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "image2pipe",
        "-framerate",
        String(fps),
        "-vcodec",
        "png",
        "-i",
        "pipe:0",
        "-i",
        join(output, "score.wav"),
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-t",
        String(CINEMATIC_DURATION),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "21",
        "-pix_fmt",
        "yuv420p",
        "-threads",
        "2",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-movflags",
        "+faststart",
        path,
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let errors = "";
    encoder.stderr.on("data", (chunk) => {
      errors = (errors + chunk).slice(-5000);
    });
    const encoded = new Promise((resolve, reject) => {
      encoder.on("error", reject);
      encoder.on("close", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(errors || "Encoder exited " + code)),
      );
    });
    encoded.catch(() => {});
    for (let frame = 0; frame < CINEMATIC_DURATION * fps; frame += 12) {
      const count = Math.min(12, CINEMATIC_DURATION * fps - frame);
      const images = await page.evaluate(
        (frame, count, fps) =>
          Array.from({ length: count }, (_, index) =>
            window.capture((frame + index) / fps),
          ),
        frame,
        count,
        fps,
      );
      for (const image of images)
        await new Promise((resolve, reject) =>
          encoder.stdin.write(Buffer.from(image, "base64"), (error) =>
            error ? reject(error) : resolve(),
          ),
        );
      if (frame % 120 === 0) console.log("Rendered", frame / fps, "sec");
    }
    encoder.stdin.end();
    await encoded;
    await copyFile(path, join(root, "media/pilots/ns-spec-cards.mp4"));
    await writeFile(
      join(output, "manifest.json"),
      JSON.stringify(
        {
          duration: CINEMATIC_DURATION,
          width: WIDTH,
          height: HEIGHT,
          fps,
          bytes: (await readFile(path)).length,
          generatedAt: new Date().toISOString(),
        },
        null,
        2,
      ) + "\n",
    );
    console.log("Cinematic pilot encoded");
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
