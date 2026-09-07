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
  // Create _worker.js as an ESM wrapper around worker.js with error logging
  const wrapperCode = `import worker from "./worker.js";

export default {
  async fetch(request, env, ctx) {
    try {
      return await worker.fetch(request, env, ctx);
    } catch (err) {
      console.error("Cloudflare Pages Worker Exception:", err);
      return new Response(
        "Application Error (500)\\n\\n" +
        "Message: " + (err && err.message ? err.message : String(err)) + "\\n\\n" +
        "Stack:\\n" + (err && err.stack ? err.stack : "No stack trace"),
        {
          status: 500,
          headers: { "content-type": "text/plain; charset=utf-8" }
        }
      );
    }
  }
};
`;
  fs.writeFileSync(workerDest, wrapperCode);
  console.log("✓ Created .open-next/_worker.js wrapper for Cloudflare Pages");
} else {
  console.error("Error: .open-next/worker.js was not found");
  process.exit(1);
}

if (fs.existsSync(assetsDir)) {
  fs.cpSync(assetsDir, openNextDir, { recursive: true });
  console.log("✓ Copied static assets to .open-next root for Cloudflare Pages CDN");
}
