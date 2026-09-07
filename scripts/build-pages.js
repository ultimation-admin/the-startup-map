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
const assetsDir = path.join(openNextDir, "assets");

if (fs.existsSync(workerSrc)) {
  let workerContent = fs.readFileSync(workerSrc, "utf8");

  // Top-level polyfill for process and process.env
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

  // Inject env binding into fetch handler
  const fetchRegex = /async\s+fetch\s*\(\s*([a-zA-Z0-9_$]+)\s*,\s*([a-zA-Z0-9_$]+)\s*,\s*([a-zA-Z0-9_$]+)\s*\)\s*\{/;
  if (fetchRegex.test(workerContent)) {
    workerContent = workerContent.replace(
      fetchRegex,
      `async fetch($1, $2, $3) {
        if ($2) { try { Object.assign(globalThis.process.env, $2); } catch (e) {} }`
    );
    console.log("✓ Injected environment variable sync into Cloudflare Worker fetch handler");
  } else {
    console.warn("! Warning: Could not match fetch(request, env, ctx) signature in worker.js");
  }

  const finalWorkerCode = polyfill + "\n" + workerContent;

  // Save _worker.js in .open-next root
  fs.writeFileSync(path.join(openNextDir, "_worker.js"), finalWorkerCode);

  // Save _worker.js in .open-next/assets root as well
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(assetsDir, "_worker.js"), finalWorkerCode);

  console.log("✓ Generated _worker.js in both .open-next and .open-next/assets");
} else {
  console.error("Error: .open-next/worker.js was not found");
  process.exit(1);
}

if (fs.existsSync(assetsDir)) {
  // Sync assets into .open-next root so static files are accessible at both levels
  fs.cpSync(assetsDir, openNextDir, { recursive: true, force: true });
  console.log("✓ Synchronized static assets across Cloudflare Pages output directories");
}
