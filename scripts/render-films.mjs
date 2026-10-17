import puppeteer from "puppeteer-core";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { skills } from "../catalog.js";
import { FILM_DURATION, FILM_WIDTH, FILM_HEIGHT } from "../film-renderer.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifacts =
  process.env.FOUNDRY_ARTIFACT_DIR ||
  join(homedir(), "DevData/Artifacts/20261017-skills-promo/foundry");
const fps = 30;
const posterOnly = process.argv.includes("--posters-only");
const chosenId = process.argv
  .find((arg) => arg.startsWith("--skill="))
  ?.slice(8);
const chosen = chosenId
  ? skills.filter((skill) => skill.id === chosenId)
  : skills;
if (!chosen.length) throw new Error("Unknown skill");
await Promise.all(
  ["media/films", "media/posters"].map((path) =>
    mkdir(join(root, path), { recursive: true }),
  ),
);
await Promise.all(
  ["review", "videos", "chrome-render-profile"].map((path) =>
    mkdir(join(artifacts, path), { recursive: true }),
  ),
);
const beat = join(artifacts, "beat.wav");
if (!existsSync(beat)) {
  const result = spawnSync(
    "python3",
    [join(root, "scripts/make-beat.py"), "--out", beat],
    { encoding: "utf8" },
  );
  if (result.status !== 0)
    throw new Error(result.stderr || "Beat generation failed");
  process.stdout.write(result.stdout);
}
const shell =
  '<!doctype html><meta charset="utf-8"><canvas width="1280" height="720"></canvas><script type="module">import {skills} from "/catalog.js";import {renderFilm} from "/film-renderer.js";await document.fonts.ready;const canvas=document.querySelector("canvas");const ctx=canvas.getContext("2d");window.capture=(id,t,format="png")=>{renderFilm(ctx,skills.find(s=>s.id===id),t);return canvas.toDataURL("image/"+format,.92).split(",")[1]};window.ready=true;</script>';
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(shell);
    return;
  }
  if (pathname === "/catalog.js" || pathname === "/film-renderer.js") {
    response.writeHead(200, {
      "Content-Type": "text/javascript; charset=utf-8",
    });
    response.end(await readFile(join(root, pathname.slice(1))));
    return;
  }
  response.writeHead(404);
  response.end();
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  userDataDir: join(artifacts, "chrome-render-profile"),
  headless: true,
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
  ],
});
const outputs = [];
try {
  const page = await browser.newPage();
  await page.setViewport({
    width: FILM_WIDTH,
    height: FILM_HEIGHT,
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) => {
    console.error("Canvas error:", error.message);
  });
  await page.goto("http://127.0.0.1:" + server.address().port, {
    waitUntil: "networkidle0",
  });
  await page.waitForFunction("window.ready === true");
  for (const skill of chosen) {
    const poster = await page.evaluate(
      (id) => window.capture(id, 8.6, "jpeg"),
      skill.id,
    );
    await writeFile(
      join(root, "media/posters", skill.id + ".jpg"),
      Buffer.from(poster, "base64"),
    );
    for (const time of [1.5, 4.5, 7.5, 10.2]) {
      const frame = await page.evaluate(
        (id, t) => window.capture(id, t, "jpeg"),
        skill.id,
        time,
      );
      await writeFile(
        join(artifacts, "review", skill.id + "-" + time + ".jpg"),
        Buffer.from(frame, "base64"),
      );
    }
    console.log("Poster + 4 beat frames:", skill.id);
    if (posterOnly) continue;
    const output = join(artifacts, "videos", skill.id + ".mp4");
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
        beat,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-t",
        String(FILM_DURATION),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "22",
        "-pix_fmt",
        "yuv420p",
        "-threads",
        "2",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        output,
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
          : reject(new Error(errors || "ffmpeg exited " + code)),
      );
    });
    // Register rejection immediately; report it after the frame producer closes.
    encoded.catch(() => {});
    for (let frame = 0; frame < FILM_DURATION * fps; frame += 15) {
      const count = Math.min(15, FILM_DURATION * fps - frame);
      const batch = await page.evaluate(
        (id, start, count, fps) =>
          Array.from({ length: count }, (_, index) =>
            window.capture(id, (start + index) / fps),
          ),
        skill.id,
        frame,
        count,
        fps,
      );
      for (const data of batch)
        await new Promise((resolve, reject) =>
          encoder.stdin.write(Buffer.from(data, "base64"), (error) =>
            error ? reject(error) : resolve(),
          ),
        );
      if (frame && frame % 120 === 0)
        console.log("  rendered", skill.id, frame / fps + "s");
    }
    encoder.stdin.end();
    await encoded;
    await copyFile(output, join(root, "media/films", skill.id + ".mp4"));
    const bytes = await readFile(output);
    outputs.push({
      id: skill.id,
      duration: FILM_DURATION,
      fps,
      width: FILM_WIDTH,
      height: FILM_HEIGHT,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
    console.log(
      "Encoded:",
      skill.id,
      (bytes.length / 1024 / 1024).toFixed(2) + " MiB",
    );
  }
  if (!posterOnly)
    await writeFile(
      join(
        artifacts,
        chosenId ? chosenId + "-render-manifest.json" : "render-manifest.json",
      ),
      JSON.stringify(outputs, null, 2) + "\n",
    );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
