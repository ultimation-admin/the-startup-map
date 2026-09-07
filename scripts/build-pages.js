const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("Building for Cloudflare Pages using OpenNext...");
execSync("npx opennextjs-cloudflare build --skipWranglerConfigCheck", {
  stdio: "inherit",
  env: { ...process.env, SKIP_WRANGLER_CONFIG_CHECK: "true" }
});

const openNextDir = path.join(process.cwd(), ".open-next");
const workerSrc = path.join(openNextDir, "worker.js");
const workerDest = path.join(openNextDir, "_worker.js");
const assetsDir = path.join(openNextDir, "assets");

if (fs.existsSync(workerSrc)) {
  const workerContent = fs.readFileSync(workerSrc, "utf8");

  const polyfill = `// Top-level process polyfill for Cloudflare Pages
if (typeof globalThis.process === "undefined") {
  globalThis.process = {
    env: { NODE_ENV: "production" },
    cwd: () => "/",
    nextTick: (cb, ...args) => setTimeout(() => cb(...args), 0),
  };
} else if (!globalThis.process.env) {
  globalThis.process.env = { NODE_ENV: "production" };
}
`;

  fs.writeFileSync(workerDest, polyfill + "\n" + workerContent);
  console.log("✓ Created .open-next/_worker.js from worker.js with top-level process polyfill");
} else {
  console.error("Error: .open-next/worker.js was not found");
  process.exit(1);
}

if (fs.existsSync(assetsDir)) {
  fs.cpSync(assetsDir, openNextDir, { recursive: true, force: true });
  console.log("✓ Merged static assets directly into .open-next root for Cloudflare Pages CDN");
}
