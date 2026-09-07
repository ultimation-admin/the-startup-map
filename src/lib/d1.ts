/**
 * Cloudflare D1 Client
 *
 * Dual-mode: uses native D1 bindings on Cloudflare Pages (via @opennextjs/cloudflare),
 * falls back to D1 REST API for local development with `next dev`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface D1Meta {
  changes: number;
  last_row_id: number;
  rows_read: number;
  rows_written: number;
  duration: number;
}

interface D1RestResponse<T = Record<string, unknown>> {
  result: Array<{
    results: T[];
    success: boolean;
    meta: D1Meta;
  }>;
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

export interface QueryResult<T> {
  results: T[];
  meta: D1Meta;
}

export interface ExecuteResult {
  changes: number;
  lastRowId: number;
}

// ---------------------------------------------------------------------------
// Native D1 binding helpers (Cloudflare Pages runtime)
// ---------------------------------------------------------------------------

async function getNativeDb(): Promise<any | null> {
  try {
    // Use a variable to prevent webpack/turbopack from statically analyzing this import.
    // This module only exists in the Cloudflare Pages runtime.
    const moduleName = "@opennextjs/cloudflare";
    const mod = await import(/* webpackIgnore: true */ moduleName);
    const { env } = await mod.getCloudflareContext();
    if (env?.DB) return env.DB;
  } catch {
    // Not running on Cloudflare — fall through to REST API
  }
  return null;
}

// ---------------------------------------------------------------------------
// REST API fallback (local development)
// ---------------------------------------------------------------------------

function getRestConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    return null;
  }

  return {
    url: `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
    apiToken,
  };
}

async function restQuery<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  const config = getRestConfig();
  if (!config) {
    throw new Error(
      "D1 not available: neither Cloudflare bindings nor REST API credentials found. " +
      "Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, and CLOUDFLARE_D1_API_TOKEN in .env.local"
    );
  }

  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
    next: sql.trim().toUpperCase().startsWith("SELECT") ? { revalidate: 10 } : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 REST API error (${res.status}): ${text}`);
  }

  const data: D1RestResponse<T> = await res.json();
  if (!data.success || !data.result?.[0]?.success) {
    throw new Error(`D1 query failed: ${JSON.stringify(data.errors)}`);
  }

  return {
    results: data.result[0].results,
    meta: data.result[0].meta,
  };
}

async function restBatch(
  statements: Array<{ sql: string; params?: unknown[] }>
): Promise<void> {
  const config = getRestConfig();
  if (!config) {
    throw new Error("D1 REST API credentials not configured for batch operation");
  }

  // D1 REST API doesn't have a native batch endpoint,
  // so we wrap statements in a transaction via sequential calls.
  // For true atomic batches, deploy on Cloudflare Pages with native bindings.
  for (const stmt of statements) {
    await restQuery(stmt.sql, stmt.params || []);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute a SELECT query and return typed results.
 */
export async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const db = await getNativeDb();

    if (db) {
      const stmt = db.prepare(sql);
      const bound = params.length > 0 ? stmt.bind(...params) : stmt;
      const { results } = await bound.all();
      return (results || []) as T[];
    }

    const result = await restQuery<T>(sql, params);
    return result?.results || [];
  } catch (err) {
    console.warn("d1Query fallback (D1 unconfigured or query failed):", err);
    return [];
  }
}

/**
 * Execute a single SELECT and return the first row or null.
 */
export async function d1QueryFirst<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  try {
    const db = await getNativeDb();

    if (db) {
      const stmt = db.prepare(sql);
      const bound = params.length > 0 ? stmt.bind(...params) : stmt;
      return await bound.first();
    }

    const result = await restQuery<T>(sql, params);
    return result?.results?.[0] ?? null;
  } catch (err) {
    console.warn("d1QueryFirst fallback (D1 unconfigured or query failed):", err);
    return null;
  }
}

/**
 * Execute an INSERT / UPDATE / DELETE statement.
 */
export async function d1Execute(
  sql: string,
  params: unknown[] = []
): Promise<ExecuteResult> {
  try {
    const db = await getNativeDb();

    if (db) {
      const stmt = db.prepare(sql);
      const bound = params.length > 0 ? stmt.bind(...params) : stmt;
      const result = await bound.run();
      return {
        changes: result.meta?.changes || 0,
        lastRowId: result.meta?.last_row_id || 0,
      };
    }

    const result = await restQuery(sql, params);
    return {
      changes: result.meta?.changes || 0,
      lastRowId: result.meta?.last_row_id || 0,
    };
  } catch (err) {
    console.warn("d1Execute fallback (D1 unconfigured or query failed):", err);
    return { changes: 0, lastRowId: 0 };
  }
}

/**
 * Execute multiple statements atomically (single transaction on native,
 * sequential calls via REST API fallback).
 */
export async function d1Batch(
  statements: Array<{ sql: string; params?: unknown[] }>
): Promise<void> {
  try {
    const db = await getNativeDb();

    if (db) {
      const prepared = statements.map((s) => {
        const stmt = db.prepare(s.sql);
        return s.params?.length ? stmt.bind(...s.params) : stmt;
      });
      await db.batch(prepared);
      return;
    }

    await restBatch(statements);
  } catch (err) {
    console.warn("d1Batch fallback (D1 unconfigured or query failed):", err);
  }
}
