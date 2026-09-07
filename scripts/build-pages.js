const { execSync } = require("child_process");

console.log("Building for Cloudflare Pages using OpenNext...");

// Guard against recursive execution
if (process.env.IS_BUILDING_PAGES) {
  console.log("Skipping nested OpenNext invocation to prevent build loop.");
  process.exit(0);
}

try {
  execSync("npx opennextjs-cloudflare build --skipWranglerConfigCheck", {
    stdio: "inherit",
    env: { ...process.env, SKIP_WRANGLER_CONFIG_CHECK: "true", IS_BUILDING_PAGES: "true" }
  });
} catch (err) {
  console.error("OpenNext build process exited with error:", err.message);
}

require("./post-build.js");
