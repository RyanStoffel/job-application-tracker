// Minimal esbuild-based build script. No heavy bundler/framework needed for
// an extension this size — three entry points bundled to plain JS, plus a
// couple of static files copied into dist/.
import * as esbuild from "esbuild";
import { mkdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes("--watch");

const entryPoints = [
  { in: "src/content/linkedin-detector.ts", out: "content/linkedin-detector" },
  { in: "src/content/cross-site-toast.ts", out: "content/cross-site-toast" },
  { in: "src/background/sync.ts", out: "background/sync" },
  { in: "src/popup/popup.ts", out: "popup/popup" },
];

const staticFiles = [
  ["manifest.json", "manifest.json"],
  ["src/popup/popup.html", "popup/popup.html"],
];

function copyStaticFiles() {
  for (const [src, dest] of staticFiles) {
    const destPath = `dist/${dest}`;
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(src, destPath);
  }
}

const buildOptions = {
  entryPoints,
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: ["chrome109", "firefox115"],
  sourcemap: true,
  logLevel: "info",
  define: {
    "process.env.NODE_ENV": watch ? '"development"' : '"production"',
  },
};

if (existsSync("dist")) {
  rmSync("dist", { recursive: true, force: true });
}
mkdirSync("dist", { recursive: true });

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  copyStaticFiles();
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(buildOptions);
  copyStaticFiles();
  console.log("Build complete -> extension/dist");
}
