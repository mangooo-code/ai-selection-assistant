import { build, context } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

const watching = process.argv.includes("--watch");
const common = {
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: true,
  legalComments: "none",
};

await rm("dist", { recursive: true, force: true });
await mkdir("dist/popup", { recursive: true });
await cp("public/manifest.json", "dist/manifest.json");
await cp("src/popup/index.html", "dist/popup/index.html");
await cp("src/popup/style.css", "dist/popup/style.css");

const jobs = [
  { ...common, entryPoints: ["./src/background/index.ts"], outfile: "dist/background.js" },
  { ...common, entryPoints: ["./src/content/index.ts"], outfile: "dist/content.js" },
  { ...common, entryPoints: ["./src/popup/index.ts"], outfile: "dist/popup/index.js" },
];

if (watching) {
  const contexts = await Promise.all(jobs.map((job) => context(job)));
  await Promise.all(contexts.map((item) => item.watch()));
  console.log("Watching extension source files...");
} else {
  await Promise.all(jobs.map((job) => build(job)));
  console.log("Built Chrome extension in dist/");
}
