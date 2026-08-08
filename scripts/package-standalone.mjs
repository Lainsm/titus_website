#!/usr/bin/env node
/**
 * `next build` with output:"standalone" leaves the static assets outside the
 * standalone folder. This copies them in, so `.next/standalone` is a complete,
 * self-contained server that can be uploaded as-is.
 *
 *   npm run build:deploy
 */
import { cpSync, existsSync } from "node:fs";

const standalone = ".next/standalone";

if (!existsSync(standalone)) {
  console.error("No .next/standalone — run `next build` first.");
  process.exit(1);
}

cpSync(".next/static", `${standalone}/.next/static`, { recursive: true });
console.log("copied .next/static");

if (existsSync("public")) {
  cpSync("public", `${standalone}/public`, { recursive: true });
  console.log("copied public/ (fonts)");
}

console.log(
  "\n.next/standalone is ready. Start it with:  node server.js\n" +
    "It reads PORT and HOSTNAME from the environment.",
);
