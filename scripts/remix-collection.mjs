/** Master new original scores while preserving every encoded video packet. */
import { spawn } from "node:child_process";
import { readFile, writeFile, copyFile, mkdir, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import assert from "node:assert/strict";
import { films } from "../collection-catalog.js";

if (process.argv.includes("--help")) {
  console.log("FOUNDRY_ARTIFACT_DIR=/path/to/artifacts node scripts/remix-collection.mjs [--ids=skill-id,...]\nReads scores/<id>.wav and JSON; verifies and masters AAC while copying current H.264 video.");
  process.exit(0);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = resolve(
  process.env.FOUNDRY_ARTIFACT_DIR ||
    join(homedir(), "DevData/Artifacts/20261017-skills-promo/foundry/electro-v2"),
);
const selected = process.argv.find((arg) => arg.startsWith("--ids="))?.slice(6).split(",");
const chosen = selected ? films.filter((film) => selected.includes(film.id)) : films;
assert.ok(chosen.length && (!selected || selected.length === chosen.length), "Unknown film ID");
for (const dir of ["before", "remixed"]) await mkdir(join(artifacts, dir), { recursive: true });

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    child.stdout.on("data", (data) => { stdout += data; });
    child.stderr.on("data", (data) => { stderr = (stderr + data).slice(-20000); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve({ stdout, stderr }) : reject(new Error(stderr || `${command} exited ${code}`)));
  });
}
async function measure(path) {
  const { stderr } = await run("ffmpeg", ["-hide_banner", "-nostdin", "-i", path, "-vn", "-af", "loudnorm=I=-15:LRA=7:TP=-1.8:print_format=json", "-f", "null", "-"]);
  const match = stderr.match(/\{\s*"input_i"[\s\S]*?\}/g)?.at(-1);
  assert.ok(match, "Missing loudness measurement: " + path);
  const data = JSON.parse(match);
  for (const key of ["input_i", "input_tp", "input_lra", "input_thresh", "target_offset"]) assert.ok(Number.isFinite(Number(data[key])), "Non-finite " + key);
  return data;
}
async function streamHash(path, stream) {
  const { stdout } = await run("ffmpeg", ["-v", "error", "-nostdin", "-i", path, "-map", `0:${stream}:0`, "-c", "copy", "-f", "hash", "-hash", "sha256", "-"]);
  return stdout.trim().replace(/^SHA256=/, "");
}
const manifest = [];
for (const film of chosen) {
  const video = join(root, "media/collection", film.id + ".mp4");
  const before = join(artifacts, "before", film.id + ".mp4");
  try { await access(before); } catch { await copyFile(video, before); }
  const originalVideo = await streamHash(video, "v");
  assert.equal(await streamHash(before, "v"), originalVideo, "Saved source differs from current picture; choose a new artifact directory");
  const wav = join(artifacts, "scores", film.id + ".wav");
  const score = JSON.parse(await readFile(wav.replace(/\.wav$/, ".json"), "utf8"));
  assert.equal(score.genre, film.genre, "Score genre must match catalog");
  assert.equal(score.bpm, film.bpm, "Score tempo must match catalog");
  assert.ok(Math.abs(score.duration - film.duration) < 0.025, "Score duration mismatch");
  const wavProbe = JSON.parse((await run("ffprobe", ["-v", "error", "-show_format", "-of", "json", wav])).stdout);
  assert.ok(Math.abs(Number(wavProbe.format.duration) - film.duration) < 0.025, "Actual WAV duration mismatch");
  const input = await measure(wav);
  const filter = `loudnorm=I=-15:LRA=7:TP=-1.8:measured_I=${input.input_i}:measured_LRA=${input.input_lra}:measured_TP=${input.input_tp}:measured_thresh=${input.input_thresh}:offset=${input.target_offset}:linear=true`;
  const output = join(artifacts, "remixed", film.id + ".mp4");
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", before, "-i", wav, "-map", "0:v:0", "-map", "1:a:0", "-t", String(film.duration), "-c:v", "copy", "-af", filter, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", output]);
  const final = await measure(output);
  assert.ok(Math.abs(Number(final.input_i) + 15) < 0.8, "Encoded loudness outside -15 ±0.8 LUFS: " + film.id);
  assert.ok(Number(final.input_tp) <= -1, "Encoded true peak exceeds -1 dBTP: " + film.id);
  const remixedVideo = await streamHash(output, "v");
  assert.equal(remixedVideo, originalVideo, "Video packets changed");
  const originalAudio = await streamHash(before, "a");
  const remixedAudio = await streamHash(output, "a");
  assert.notEqual(remixedAudio, originalAudio, "Audio did not change");
  const probe = JSON.parse((await run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", output])).stdout);
  const a = probe.streams.find((stream) => stream.codec_type === "audio");
  const v = probe.streams.find((stream) => stream.codec_type === "video");
  assert.equal(v.width, 1280); assert.equal(v.height, 720); assert.equal(a.channels, 2); assert.equal(a.sample_rate, "48000");
  assert.ok(Math.abs(Number(probe.format.duration) - film.duration) < 0.1, "Encoded duration changed");
  assert.ok(Math.abs(Number(a.duration) - film.duration) < 0.04, "Encoded audio duration changed");
  await copyFile(output, video);
  manifest.push({ id: film.id, genre: film.genre, bpm: film.bpm, duration: Number(probe.format.duration), integratedLUFS: Number(final.input_i), truePeakDBTP: Number(final.input_tp), videoPacketSHA256: remixedVideo, originalVideoPacketSHA256: originalVideo, videoUnchanged: true, audioPacketSHA256: remixedAudio, originalAudioPacketSHA256: originalAudio, audioChanged: true, audioSampleRate: a.sample_rate, channels: a.channels, cueTimes: score.cueTimes, listeningVerified: false });
  console.log("Remixed", film.id, final.input_i + " LUFS", final.input_tp + " dBTP; video unchanged");
}
await writeFile(join(artifacts, selected ? "master-" + selected.join("_") + ".json" : "master-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
