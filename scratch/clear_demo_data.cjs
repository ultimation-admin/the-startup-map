const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value.trim();
    }
  });
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN;

if (!accountId || !databaseId || !apiToken) {
  console.error("Missing Cloudflare D1 credentials in .env.local");
  process.exit(1);
}

const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

async function d1Execute(sql, params = []) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`D1 query failed: ${JSON.stringify(data.errors)}`);
  }
  return data.result[0].results;
}

async function main() {
  console.log("=== REMOVING DEMO LISTINGS AND DEMO COMMUNITIES FROM D1 ===");

  // 1. Delete demo listings (IDs matching blr-%, del-%, mum-%, hyd-%, pne-%, che-%)
  const deleteListingsResult = await d1Execute(`
    DELETE FROM listings 
    WHERE id LIKE 'blr-%' 
       OR id LIKE 'del-%' 
       OR id LIKE 'mum-%' 
       OR id LIKE 'hyd-%' 
       OR id LIKE 'pne-%' 
       OR id LIKE 'che-%'
  `);
  console.log("Deleted demo listings.");

  // 2. Delete demo communities (funding, genai, green-tech, saas, startups)
  const deleteCommunitiesResult = await d1Execute(`
    DELETE FROM communities
  `);
  console.log("Deleted demo communities.");

  // 3. Inspect remaining listings and communities
  const remainingListings = await d1Execute("SELECT id, name, type, city, review_state FROM listings");
  console.log("REMAINING LISTINGS IN DB:", remainingListings);

  const remainingCommunities = await d1Execute("SELECT * FROM communities");
  console.log("REMAINING COMMUNITIES IN DB:", remainingCommunities);

  console.log("=== COMPLETED DEMO DATA REMOVAL ===");
}

main().catch(err => {
  console.error("Error clearing demo data:", err);
  process.exit(1);
});
