import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    const stop = (signal) => child.kill(signal);
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      process.off("SIGINT", stop);
      process.off("SIGTERM", stop);
      if (code === 0 || signal === "SIGINT" || signal === "SIGTERM") resolve();
      else reject(new Error(`The command exited with code ${code}.`));
    });
  });
}

function dependenciesInstalled() {
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  return Object.entries({ ...manifest.dependencies, ...manifest.devDependencies }).every(([name, version]) => {
    try { return JSON.parse(readFileSync(`node_modules/${name}/package.json`, "utf8")).version === version; }
    catch { return false; }
  });
}

try {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || (major === 22 && minor < 12)) {
    throw new Error("Install Node.js 22.12 or later.");
  }
  if (!dependenciesInstalled()) await run(process.execPath, [process.env.npm_execpath, "ci"]);
  process.env.SELECTRA_DATABASE_MODE = "local";
  const { setup } = await import("./seed.mjs");
  await setup({ demo: true });
  if (!process.argv.includes("--setup-only")) {
    const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
    const port = process.env.PORT || "3000";
    console.log(`Open http://localhost:${port}`);
    await run(process.execPath, [next, "dev", "--hostname", "localhost", "--port", port]);
  }
} catch (error) {
  console.error("Selectra setup failed.", error.message);
  process.exitCode = 1;
}
