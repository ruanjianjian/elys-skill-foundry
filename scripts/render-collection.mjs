import puppeteer from "puppeteer-core";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { dirname, join, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { films, WIDTH, HEIGHT } from "../collection-renderer.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifacts =
  process.env.FOUNDRY_ARTIFACT_DIR ||
  join(
    homedir(),
    "DevData/Artifacts/20261017-skills-promo/foundry/collection-v3",
  );
const selected = process.argv
  .find((arg) => arg.startsWith("--ids="))
  ?.slice(6)
  .split(",");
const chosen = selected
  ? films.filter((film) => selected.includes(film.id))
  : films;
const postersOnly = process.argv.includes("--posters-only");
if (!chosen.length || selected?.some((id) => !films.some((f) => f.id === id)))
  throw new Error("Unknown selected film");
const fps = 30;
await Promise.all(
  ["review", "videos", "chrome-collection-render-profile"].map((dir) =>
    mkdir(join(artifacts, dir), { recursive: true }),
  ),
);
await mkdir(join(root, "media/collection"), { recursive: true });
await writeFile(
  join(root, "collection-catalog.js"),
  "// Generated from motion-collection metadata.\nexport const films = " +
    JSON.stringify(films, null, 2) +
    ";\n",
);
const shell =
  '<!doctype html><meta charset="utf-8"><canvas width="1280" height="720"></canvas><script type="module">import {loadFilmAssets,renderFilm} from "/collection-renderer.js";await document.fonts.ready;const c=document.querySelector("canvas"),x=c.getContext("2d");let assets,id;window.select=async key=>{id=key;assets=await loadFilmAssets(key)};window.capture=(t,format="jpeg")=>{renderFilm(x,assets,id,t);return c.toDataURL("image/"+format,.97).split(",")[1]};window.ready=true;</script>';
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(shell);
    return;
  }
  const file = resolve(root, "." + pathname),
    extension = extname(file);
  if (
    !file.startsWith(root + sep) ||
    ![".js", ".jpg", ".png"].includes(extension)
  ) {
    response.writeHead(404).end();
    return;
  }
  try {
    const data = await readFile(file);
    response.writeHead(200, {
      "Content-Type":
        extension === ".js"
          ? "text/javascript; charset=utf-8"
          : extension === ".jpg"
            ? "image/jpeg"
            : "image/png",
    });
    response.end(data);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  userDataDir: join(artifacts, "chrome-collection-render-profile"),
  headless: true,
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
  ],
});
const manifest = [];
try {
  const page = await browser.newPage();
  await page.setViewport({
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) => console.error("Renderer:", error.message));
  await page.goto("http://127.0.0.1:" + server.address().port, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction("window.ready===true");
  for (const film of chosen) {
    await page.evaluate((id) => window.select(id), film.id);
    const reviewTimes = [
      0.8,
      film.duration * 0.23,
      film.duration * 0.46,
      film.duration * 0.68,
      film.duration * 0.88,
    ];
    for (const t of [...reviewTimes, film.posterTime]) {
      const data = await page.evaluate((t) => window.capture(t), t);
      await writeFile(
        join(artifacts, "review", film.id + "-" + t.toFixed(2) + ".jpg"),
        Buffer.from(data, "base64"),
      );
      if (t === film.posterTime)
        await writeFile(
          join(root, "media/collection", film.id + ".jpg"),
          Buffer.from(data, "base64"),
        );
    }
    console.log("Review frames ready:", film.id);
    if (postersOnly) continue;
    const path = join(artifacts, "videos", film.id + ".mp4");
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
        "mjpeg",
        "-i",
        "pipe:0",
        "-i",
        join(artifacts, "scores", film.id + ".wav"),
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-t",
        String(film.duration),
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
        "160k",
        "-movflags",
        "+faststart",
        path,
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let errors = "";
    encoder.stderr.on("data", (chunk) => {
      errors = (errors + chunk).slice(-6000);
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
    for (let frame = 0; frame < film.duration * fps; frame += 12) {
      const count = Math.min(12, film.duration * fps - frame);
      const images = await page.evaluate(
        (frame, count, fps) =>
          Array.from({ length: count }, (_, i) =>
            window.capture((frame + i) / fps),
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
    }
    encoder.stdin.end();
    await encoded;
    await copyFile(path, join(root, "media/collection", film.id + ".mp4"));
    manifest.push({
      ...film,
      width: WIDTH,
      height: HEIGHT,
      fps,
      bytes: (await readFile(path)).length,
    });
    console.log("Encoded:", film.id);
  }
  await writeFile(
    join(
      artifacts,
      selected
        ? "render-" + selected.join("_") + ".json"
        : "render-manifest.json",
    ),
    JSON.stringify(manifest, null, 2) + "\n",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
