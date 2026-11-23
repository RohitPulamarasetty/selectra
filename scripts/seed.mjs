import { randomBytes, randomInt } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { credentialDirectory, openDatabase } from "../lib/db/engine.mjs";
import { hashPassword } from "../lib/db/password.mjs";
import { insertAccount, insertDemo, label, reviewerNames } from "./demo-seed.mjs";

function identity(name, role, seat = null) {
  const domain = (process.env.SELECTRA_DEMO_DOMAIN || "selectracampus.test").toLowerCase();
  if (!/^(?:[a-z0-9]+(?:-[a-z0-9]+)*\.)+[a-z]{2,}$/.test(domain)) throw new Error("SELECTRA_DEMO_DOMAIN must be a valid domain name.");
  return { email: `${label(name)}@${domain}`, name, role, seat };
}

async function credentials(file, people) {
  try { return JSON.parse(await readFile(file, "utf8")).accounts; }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const words = ["Aster", "Cedar", "Copper", "Harbor", "Juniper", "Orchard", "Slate", "Terrace"];
  const accounts = people.map((account) => ({
    ...account,
    password: `${words[randomInt(words.length)]}-${randomBytes(12).toString("base64url")}`,
  }));
  await writeFile(file, JSON.stringify({ accounts }, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  return accounts;
}

export async function setup({ demo = false, quiet = false } = {}) {
  const folder = credentialDirectory();
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const staffFile = join(folder, "staff-accounts.json");
  const studentFile = join(folder, "student-demo.json");
  const handle = await openDatabase({ migrate: true });
  try {
    await handle.db.transaction(async (tx) => {
      await tx.exec("select id from public.cycles where id=1 for update");
      const { rows: [state] } = await tx.query(`
        select exists(select from public.profiles where role='admin') as staff,
          exists(select from auth.demo_setup) as demo,
          exists(select from public.applications) as applications
      `);
      if (!state.staff) {
        const accounts = await credentials(staffFile, [identity("Aditi Shah", "admin"),
          ...reviewerNames.map((name, index) => identity(name, "evaluator", index + 1)),
        ]);
        for (const account of accounts) await insertAccount(tx, account, await hashPassword(account.password));
      }
      if (demo && !state.demo) {
        if (state.applications) throw new Error("Use an empty database to add the example cohort. This workspace already has applications.");
        const [account] = await credentials(studentFile, [identity("Ishan Kulkarni", "student")]);
        await insertDemo(tx, await insertAccount(tx, account, await hashPassword(account.password)));
      }
    });
    if (!quiet) {
      const files = demo ? [staffFile, studentFile] : [staffFile];
      for (const file of files) {
        try {
          await access(file);
          console.log(`Sign-in details: ${file}`);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          console.log(`Account is already provisioned. Use ${file.split(/[/\\]/).at(-1)} from the original setup.`);
        }
      }
    }
  } finally {
    await handle.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    try { process.loadEnvFile(".env.local"); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    if (process.argv.includes("--hosted")) {
      if (!process.env.DATABASE_URL || process.env.SELECTRA_DATABASE_MODE === "local") {
        throw new Error("Set DATABASE_URL to your pooled Neon URL in .env.local before running hosted setup.");
      }
      console.log(`PostgreSQL host: ${new URL(process.env.DATABASE_URL).hostname}`);
    }
    await setup({ demo: !process.argv.includes("--empty") && process.env.SELECTRA_SEED_DEMO !== "0" });
  } catch (error) {
    console.error("Selectra setup failed.", error.message);
    process.exitCode = 1;
  }
}
