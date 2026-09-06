const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres:Ultimation%40tony-stark-2501@db.lqyrucxlaercpedejlzp.supabase.co:5432/postgres';

async function main() {
  console.log("Connecting to live Supabase Postgres DB...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected successfully to Supabase DB!");

    const sqlPath = path.join(__dirname, '../supabase_schema.sql');
    console.log("Reading SQL file from:", sqlPath);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Executing Supabase Database Schema Migration...");
    await client.query(sql);
    console.log("SCHEMA MIGRATION SUCCESSFUL! Tables, RLS, & Triggers Created!");
  } catch (err) {
    console.error("Migration error:", err.message);
  } finally {
    await client.end();
  }
}

main();
