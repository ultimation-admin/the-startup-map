const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("Building for Cloudflare Pages using OpenNext...");
execSync("npx @opennextjs/cloudflare build --skipWranglerConfigCheck", {
  stdio: "inherit",
  env: { ...process.env, SKIP_WRANGLER_CONFIG_CHECK: "true" }
});

const openNextDir = path.join(process.cwd(), ".open-next");
const workerSrc = path.join(openNextDir, "worker.js");
const workerDest = path.join(openNextDir, "_worker.js");
const assetsDir = path.join(openNextDir, "assets");

if (fs.existsSync(workerSrc)) {
  fs.copyFileSync(workerSrc, workerDest);
  console.log("✓ Created .open-next/_worker.js for Cloudflare Pages");
} else {
  console.error("Error: .open-next/worker.js was not found");
  process.exit(1);
}

if (fs.existsSync(assetsDir)) {
  fs.cpSync(assetsDir, openNextDir, { recursive: true });
  console.log("✓ Copied static assets to .open-next root for Cloudflare Pages CDN");
}
