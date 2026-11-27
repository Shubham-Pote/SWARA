import tailwind from "bun-plugin-tailwind";
import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pagePaths } from "./src/lib/navigation";

const outdir = path.join(process.cwd(), "dist");
await rm(outdir, { recursive: true, force: true });

const entrypoints = [...new Bun.Glob("src/**/*.html").scanSync()];

const result = await Bun.build({
  entrypoints,
  outdir,
  plugins: [tailwind],
  minify: true,
  splitting: true,
  target: "browser",
  publicPath: "/",
  sourcemap: "linked",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    SWARA_API_BASE: JSON.stringify(process.env.BUN_PUBLIC_API_BASE || "/api"),
  },
});

for (const output of result.outputs) {
  console.log(` ${path.relative(process.cwd(), output.path)}  ${(output.size / 1024).toFixed(1)} KB`);
}

await cp("Characters", path.join(outdir, "Characters"), { recursive: true });
for (const route of Object.values(pagePaths)) {
  const folder = path.join(outdir, route.slice(1));
  await mkdir(folder, { recursive: true });
  await copyFile(path.join(outdir, "index.html"), path.join(folder, "index.html"));
}
