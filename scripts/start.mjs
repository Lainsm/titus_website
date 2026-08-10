#!/usr/bin/env node
/**
 * The start command, for whichever folder the host points at.
 *
 * This project builds with `output: "standalone"`, whose server is
 * `.next/standalone/server.js` — NOT `next start`. Pointing a hosting panel at
 * the repository root and letting it run the usual `next start` produces a
 * process that dies immediately, and a log console that shows nothing at all.
 *
 * So: run the standalone server when it exists, fall back to `next start`
 * otherwise, and say out loud which one and why. A silent failure is the
 * hardest kind to debug through someone else's dashboard.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standaloneServer = join(root, ".next", "standalone", "server.js");
const port = process.env.PORT ?? "3000";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

const banner = (lines) => {
  for (const line of lines) console.log(`[start] ${line}`);
};

/*
 * The environment is the usual reason a deployment comes up and then fails on
 * the first request, so it is reported at boot rather than discovered later.
 * Values are never printed — only whether they are present.
 *
 * The .env files are read here purely to make that report truthful: the server
 * loads its own via --env-file-if-exists, so without this the banner would
 * shout MISSING at a perfectly healthy deployment, which is worse than saying
 * nothing at all.
 */
function keysInEnvFile(file) {
  if (!existsSync(file)) return [];
  try {
    return readFileSync(file, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => line.slice(0, line.indexOf("=")).trim());
  } catch {
    return [];
  }
}

const envFiles = [join(root, ".env"), join(root, ".next", "standalone", ".env")];
const fromFiles = new Set(envFiles.flatMap(keysInEnvFile));
const present = (key) => Boolean(process.env[key]) || fromFiles.has(key);
const required = ["DATABASE_URL", "SITE_URL"];
const optional = [
  "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASSWORD",
];
const missing = required.filter((k) => !present(k));

banner([
  `node ${process.version}  (this app needs >= 20.12)`,
  `PORT=${port} HOSTNAME=${hostname}`,
  `env files found: ${envFiles.filter(existsSync).join(", ") || "none"}`,
  `env: ${required.concat(optional).map((k) => `${k}=${present(k) ? "set" : "MISSING"}`).join("  ")}`,
]);

if (missing.length) {
  banner([
    `WARNING: ${missing.join(", ")} not set. The site will start and then fail`,
    `on the first request that needs the database. Set them in the hosting`,
    `panel, or put them in a .env file next to this project's package.json.`,
  ]);
}

if (existsSync(standaloneServer)) {
  /*
   * `next build` alone produces server.js but leaves the static assets outside
   * it — the site then serves HTML with no CSS, no fonts and no images, which
   * looks like a styling bug rather than a build one. `npm run build:deploy`
   * is what copies them in.
   */
  const staticDir = join(root, ".next", "standalone", ".next", "static");
  if (!existsSync(staticDir)) {
    banner([
      `WARNING: .next/standalone/.next/static is missing, so no CSS, fonts or`,
      `images will load. The build command must be \`npm run build:deploy\`,`,
      `not \`npm run build\`.`,
    ]);
  }
  banner([`starting the standalone server: .next/standalone/server.js`]);
  // cwd matters: server.js resolves .next/static and public relative to itself.
  /*
   * Both env files are passed by absolute path, root one first.
   *
   * A relative --env-file-if-exists=.env would resolve against the standalone
   * folder only — and `next build` deletes and recreates that folder, so an
   * .env placed there is destroyed by the next deploy. The copy next to
   * package.json is the one that survives, which is why it wins here: later
   * --env-file flags do not overwrite variables already set.
   */
  const child = spawn(
    process.execPath,
    [
      `--env-file-if-exists=${join(root, ".env")}`,
      `--env-file-if-exists=${join(root, ".next", "standalone", ".env")}`,
      "server.js",
    ],
    { cwd: join(root, ".next", "standalone"), stdio: "inherit", env: process.env },
  );
  child.on("exit", (code) => process.exit(code ?? 0));
} else {
  banner([
    `no .next/standalone found — falling back to \`next start\`.`,
    `If this is production, the build command should be \`npm run build:deploy\`.`,
  ]);
  const child = spawn(
    join(root, "node_modules", ".bin", "next"),
    ["start", "-p", port, "-H", hostname],
    { cwd: root, stdio: "inherit", env: process.env },
  );
  child.on("exit", (code) => process.exit(code ?? 0));
}
