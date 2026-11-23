import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setup } from "./seed.mjs";
import { credentialDirectory } from "../lib/db/engine.mjs";

const folder = await mkdtemp(join(tmpdir(), "selectra-browser-test-"));
process.env.SELECTRA_DATA_DIR = folder;
if (process.env.SELECTRA_TEST_DATABASE_URL) {
  const target = new URL(process.env.SELECTRA_TEST_DATABASE_URL);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || !target.pathname.startsWith("/selectra_test_")) {
    throw new Error("Browser tests need a disposable local database named selectra_test_*.");
  }
  process.env.DATABASE_URL = process.env.SELECTRA_TEST_DATABASE_URL;
  delete process.env.SELECTRA_DATABASE_MODE;
} else {
  process.env.SELECTRA_DATABASE_MODE = "local";
}
process.env.SELECTRA_TEST_DATA_DIR = credentialDirectory();
try {
  await setup({ demo: true, quiet: true });
  const child = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)], { stdio: "inherit" });
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  process.exitCode = code ?? 1;
} finally {
  await rm(folder, { recursive: true, force: true });
}
