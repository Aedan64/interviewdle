import { build } from "esbuild";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

await mkdir("work", { recursive: true });
const directory = await mkdtemp(resolve("work", "tests-"));
try {
  const files = ["tests/local-grader.test.ts", "tests/careers.test.ts"];
  await build({ entryPoints: files, bundle: true, platform: "node", format: "cjs", packages: "external", outdir: directory, outExtension: { ".js": ".cjs" } });
  const result = spawnSync(process.execPath, ["--test", ...files.map((file) => resolve(directory, file.split("/").pop().replace(/\.ts$/, ".cjs")))], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally { await rm(directory, { recursive: true, force: true }); }
