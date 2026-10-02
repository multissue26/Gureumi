const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Upload-Token",
  "Cache-Control": "no-store",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function parsePrices(row) {
  if (!row) return null;
  return {
    cycleKey: row.cycle_key,
    capturedAt: row.captured_at,
    receivedAt: row.received_at ?? null,
    publishedAt: row.published_at ?? null,
    sourceId: row.source_id,
    itemCount: row.item_count,
    contentHash: row.content_hash,
    prices: JSON.parse(row.prices_json),
  };
}

async function latestCandidate(env) {
  return env.DB.prepare(`
    SELECT * FROM candidate_prices
    ORDER BY received_at DESC
    LIMIT 1
  `).first();
}

async function latestPublished(env) {
  return env.DB.prepare(`
    SELECT * FROM published_prices
    ORDER BY published_at DESC
    LIMIT 1
  `).first();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    try {
      if (path === "/" && method === "GET") {
        return json({ ok: true, service: "Dding Price API", version: "1.2.0" });
      }

      if (path === "/health" && method === "GET") {
        await env.DB.prepare("SELECT 1").first();
        return json({ ok: true, database: true });
      }

      // Minecraft mod -> latest candidate for one official price cycle.
      if (path === "/candidate" && method === "POST") {
        if (!env.UPLOAD_TOKEN) return json({ ok: false, error: "UPLOAD_TOKEN is not configured" }, 500);
        if (request.headers.get("X-Upload-Token") !== env.UPLOAD_TOKEN) {
          return json({ ok: false, error: "Unauthorized" }, 401);
        }

        const body = await request.json();
        if (!body || !body.cycleKey || !body.prices || typeof body.prices !== "object" || Array.isArray(body.prices)) {
          return json({ ok: false, error: "cycleKey and prices object are required" }, 400);
        }

        const itemCount = Object.keys(body.prices).length;
        // v1.2 requires the full regular 15 + golden 15 table. This also keeps
        // old v0.5.0 clients from replacing a complete 30-item candidate with
        // an incomplete 15-item regular-only snapshot.
        if (itemCount < 30) {
          return json({ ok: false, error: "Incomplete price table: 30 items required", itemCount, required: 30 }, 400);
        }

        const pricesJson = stableStringify(body.prices);
        const contentHash = await sha256(pricesJson);
        const capturedAt = body.capturedAt || new Date().toISOString();
        const sourceId = body.sourceId || "unknown-client";

        const sameCycle = await env.DB.prepare(`
          SELECT * FROM candidate_prices WHERE cycle_key = ? LIMIT 1
        `).bind(body.cycleKey).first();

        if (sameCycle && sameCycle.content_hash === contentHash) {
          return json({
            ok: true,
            duplicate: true,
            message: "Same cycle and same price table already received",
            candidate: parsePrices(sameCycle),
          });
        }

        // One row per official price cycle. If another mod PC confirms that cycle,
        // it replaces the candidate for that same cycle instead of growing forever.
        await env.DB.prepare(`
          INSERT OR REPLACE INTO candidate_prices
          (cycle_key, captured_at, received_at, source_id, item_count, content_hash, prices_json)
          VALUES (?, ?, datetime('now'), ?, ?, ?, ?)
        `).bind(
          body.cycleKey,
          capturedAt,
          sourceId,
          itemCount,
          contentHash,
          pricesJson,
        ).run();

        const saved = await env.DB.prepare(`
          SELECT * FROM candidate_prices WHERE cycle_key = ? LIMIT 1
        `).bind(body.cycleKey).first();

        return json({ ok: true, duplicate: false, message: "Candidate stored", candidate: parsePrices(saved) }, 201);
      }

      if (path === "/candidate" && method === "GET") {
        return json({ ok: true, candidate: parsePrices(await latestCandidate(env)) });
      }

      // Website user explicitly confirms the newest candidate for the requested cycle.
      if (path === "/publish" && method === "POST") {
        let body = {};
        try { body = await request.json(); } catch (_) {}

        let candidate;
        if (body?.cycleKey) {
          candidate = await env.DB.prepare(`
            SELECT * FROM candidate_prices WHERE cycle_key = ? LIMIT 1
          `).bind(body.cycleKey).first();
        } else {
          candidate = await latestCandidate(env);
        }

        if (!candidate) return json({ ok: false, error: "No candidate price data for this cycle" }, 404);

        const existing = await env.DB.prepare(`
          SELECT * FROM published_prices WHERE cycle_key = ? LIMIT 1
        `).bind(candidate.cycle_key).first();

        if (existing && Number(existing.item_count || 0) >= Number(candidate.item_count || 0)) {
          return json({ ok: true, updated: false, message: "This price cycle is already published and frozen", prices: parsePrices(existing) });
        }

        // Migration path from the old regular-only 15-item publication: if the
        // same cycle now has a richer 30-item candidate, upgrade that row once.
        const upgradingExistingCycle = !!existing;

        await env.DB.prepare(`
          INSERT OR REPLACE INTO published_prices
          (cycle_key, captured_at, published_at, source_id, item_count, content_hash, prices_json)
          VALUES (?, ?, datetime('now'), ?, ?, ?, ?)
        `).bind(
          candidate.cycle_key,
          candidate.captured_at,
          candidate.source_id,
          candidate.item_count,
          candidate.content_hash,
          candidate.prices_json,
        ).run();

        const published = await env.DB.prepare(`
          SELECT * FROM published_prices WHERE cycle_key = ? LIMIT 1
        `).bind(candidate.cycle_key).first();

        return json({
          ok: true,
          updated: true,
          upgraded: upgradingExistingCycle,
          message: upgradingExistingCycle ? "Published cycle upgraded with complete 30-item table" : "Candidate published",
          prices: parsePrices(published),
        });
      }

      if (path === "/prices" && method === "GET") {
        return json({ ok: true, prices: parsePrices(await latestPublished(env)) });
      }

      if (path === "/status" && method === "GET") {
        const candidate = await latestCandidate(env);
        const published = await latestPublished(env);
        return json({
          ok: true,
          hasNewCandidate: !!candidate && (!published || candidate.cycle_key !== published.cycle_key || candidate.content_hash !== published.content_hash),
          candidate: candidate ? {
            cycleKey: candidate.cycle_key,
            capturedAt: candidate.captured_at,
            receivedAt: candidate.received_at,
            itemCount: candidate.item_count,
            sourceId: candidate.source_id,
            contentHash: candidate.content_hash,
          } : null,
          published: published ? {
            cycleKey: published.cycle_key,
            capturedAt: published.captured_at,
            publishedAt: published.published_at,
            itemCount: published.item_count,
            sourceId: published.source_id,
            contentHash: published.content_hash,
          } : null,
        });
      }

      if (path === "/history" && method === "GET") {
        let limit = Number(url.searchParams.get("limit") || 40);
        if (!Number.isFinite(limit)) limit = 40;
        limit = Math.max(1, Math.min(100, Math.floor(limit)));

        const result = await env.DB.prepare(`
          SELECT * FROM published_prices
          ORDER BY published_at DESC
          LIMIT ?
        `).bind(limit).all();

        return json({ ok: true, history: (result.results || []).map(parsePrices) });
      }

      // One request for initial page load: status + current published + graph history.
      if (path === "/dashboard" && method === "GET") {
        const candidate = await latestCandidate(env);
        const published = await latestPublished(env);
        const result = await env.DB.prepare(`
          SELECT * FROM published_prices
          ORDER BY published_at DESC
          LIMIT 40
        `).all();

        return json({
          ok: true,
          status: {
            hasNewCandidate: !!candidate && (!published || candidate.cycle_key !== published.cycle_key || candidate.content_hash !== published.content_hash),
            candidate: candidate ? {
              cycleKey: candidate.cycle_key,
              capturedAt: candidate.captured_at,
              receivedAt: candidate.received_at,
              itemCount: candidate.item_count,
              sourceId: candidate.source_id,
            } : null,
            published: published ? {
              cycleKey: published.cycle_key,
              capturedAt: published.captured_at,
              publishedAt: published.published_at,
              itemCount: published.item_count,
              sourceId: published.source_id,
            } : null,
          },
          prices: parsePrices(published),
          history: (result.results || []).map(parsePrices),
        });
      }

      return json({ ok: false, error: "Not found" }, 404);
    } catch (error) {
      console.error(error);
      return json({ ok: false, error: String(error?.message || error) }, 500);
    }
  },
};
