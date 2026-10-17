import * as people from "./motion-collection/people.js";
import * as machines from "./motion-collection/machines.js";
import * as stories from "./motion-collection/stories.js";
import { skills } from "./catalog.js";

export const WIDTH = 1280,
  HEIGHT = 720;
const modules = [people, machines, stories];
const entries = modules.flatMap((module) =>
  module.films.map((film) => ({ film, module })),
);
export const films = skills.map((skill) => {
  const matches = entries.filter((entry) => entry.film.id === skill.id);
  if (matches.length !== 1)
    throw new Error("Each skill needs exactly one film: " + skill.id);
  return matches[0].film;
});
function owner(id) {
  const entry = entries.find((entry) => entry.film.id === id);
  if (!entry) throw new Error("Unknown film " + id);
  return entry.module;
}
export async function loadFilmAssets(id) {
  return owner(id).loadAssets(id);
}
export function renderFilm(ctx, assets, id, seconds) {
  const film = films.find((film) => film.id === id);
  if (!film) throw new Error("Unknown film " + id);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowColor = "transparent";
  ctx.setLineDash([]);
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  owner(id).render(
    ctx,
    assets,
    id,
    Math.max(0, Math.min(film.duration - 0.001, seconds)),
  );
  ctx.restore();
}
