#!/usr/bin/env node
/**
 * `next build` with output:"standalone" leaves the static assets outside the
 * standalone folder, and copies this repo's package.json scripts in verbatim —
 * so its `start` is `next start`, which is not how a standalone build runs.
 *
 * This makes `.next/standalone` a complete, self-contained deployment: static
 * assets and public files copied in, the migration tooling alongside, and a
 * package.json whose `start` actually starts the thing.
 *
 *   npm run build:deploy
 */
import { cpSync, existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const standalone = ".next/standalone";

if (!existsSync(standalone)) {
  console.error("No .next/standalone — run `next build` first.");
  process.exit(1);
}

cpSync(".next/static", `${standalone}/.next/static`, { recursive: true });
console.log("copied .next/static");

if (existsSync("public")) {
  cpSync("public", `${standalone}/public`, { recursive: true });
  console.log("copied public/ (fonts, portrait, icons)");
}

/*
 * The migrations and the admin-creation script have to be runnable on the
 * server — that is the whole of the "first run" procedure — and they are not
 * part of the Next build, so they get copied in by hand.
 */
mkdirSync(`${standalone}/scripts`, { recursive: true });
cpSync("db", `${standalone}/db`, { recursive: true });
for (const file of ["db-connect.mjs", "migrate.mjs", "create-admin.mjs", "seed.mjs"]) {
  if (existsSync(`scripts/${file}`)) {
    cpSync(`scripts/${file}`, `${standalone}/scripts/${file}`);
  }
}
console.log("copied db/migrations and the migrate/admin scripts");

/*
 * `--env-file-if-exists=.env` is the important part. Environment variables set
 * in a hosting dashboard are the better channel, but not every panel exposes
 * arbitrary ones, and this app needs about ten. Reading a .env sitting next to
 * server.js works either way: real environment variables still win, because
 * Node does not let the file overwrite what is already set.
 */
const pkgPath = `${standalone}/package.json`;
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.scripts = {
  start: "node --env-file-if-exists=.env server.js",
  "db:migrate": "node --env-file-if-exists=.env scripts/migrate.mjs",
  "admin:create": "node --env-file-if-exists=.env scripts/create-admin.mjs",
};
delete pkg.devDependencies;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log("rewrote package.json scripts for standalone");

console.log(
  [
    "",
    ".next/standalone is a complete deployment. Upload its contents, then:",
    "",
    "  start command   npm start          (node --env-file-if-exists=.env server.js)",
    "  first run       npm run db:migrate",
    "                  npm run admin:create -- you@example.ch \"Your Name\"",
    "",
    "It listens on PORT and HOSTNAME. Set the rest of the environment either in",
    "the hosting panel or in a .env file placed next to server.js — never commit",
    "that file.",
    "",
  ].join("\n"),
);
