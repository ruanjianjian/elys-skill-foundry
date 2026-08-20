import { build } from "esbuild";

await build({
  entryPoints: ["gooey-title.jsx"],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  outfile: "gooey-title.bundle.js",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
