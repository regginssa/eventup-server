const EventModel = require("../models/Event");
const HarvestState = require("../models/HarvestState");
const {
  formatTicketmasterEvent,
  isClearlyUnavailableFromDiscovery,
  availabilityHintFromDiscovery,
} = require("../utils/tm-taxonomy");
const { canSpend, spend } = require("../utils/quota");

const API_KEY = process.env.TICKETMASTER_API_KEY;
const DISCOVER_BASE = process.env.TICKETMASTER_DISCOVER_BASE_URL;

const MAX_TM_PAGE_SIZE = 200;
const DEFAULT_MAX_PAGES_PER_RUN = 3;
const SLEEP_MS_BETWEEN_PAGES = 150;
const LOCK_TTL_MS = 60_000; // 1 min
const CURSOR_OVERLAP_SEC = 60; // 60s overlap is usually enough

/* ----------------------------
   Small utils
----------------------------- */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms, spread = 0.4) =>
  Math.max(0, ms + (Math.random() * 2 - 1) * ms * spread);

function isoUtcSeconds(d = new Date()) {
  // "YYYY-MM-DDTHH:mm:ssZ" (no millis)
  return new Date(d).toISOString().replace(/\.\d{3}Z$/, "Z");
}

function buildTmUrl({
  page = 0,
  size = 100,
  sort = "date,asc",
  startDateTime,
}) {
  const params = new URLSearchParams({
    apikey: API_KEY,
    page: String(page),
    size: String(Math.min(size, MAX_TM_PAGE_SIZE)),
    sort,
    startDateTime: startDateTime || isoUtcSeconds(),
    includeTest: "no",
    includeTBA: "no",
    includeTBD: "no",
  });
  return `${DISCOVER_BASE}?${params.toString()}`;
}

// Minimal retry w/ backoff for 429/5xx
async function fetchJsonWithRetry(url, { tries = 3, backoffMs = 400 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    const text = await res.text().catch(() => "");
    if (res.status >= 500 || res.status === 429) {
      lastErr = new Error(`TM ${res.status}: ${text}`);
      await sleep(backoffMs * (i + 1));
      continue;
    }
    throw new Error(`TM ${res.status}: ${text}`);
  }
  throw lastErr;
}

async function fetchPage({ page, size, startDateTime }) {
  const url = buildTmUrl({ page, size, startDateTime });
  const json = await fetchJsonWithRetry(url);
  const raw = json?._embedded?.events ?? [];
  const pageInfo = json?.page ?? { number: page, totalPages: page + 1 };
  return { raw, pageInfo };
}

async function upsertEvent(e) {
  const loc =
    e?.coordinate?.longitude != null && e?.coordinate?.latitude != null
      ? {
          type: "Point",
          coordinates: [e.coordinate.longitude, e.coordinate.latitude],
        }
      : undefined;

  await EventModel.updateOne(
    { id: e.id },
    {
      $set: {
        ...e,
        ...(loc ? { loc } : {}),
        lastSyncedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );
}

/* ----------------------------
   Cursor + Lock state
----------------------------- */

async function acquireLock() {
  const key = "tm_global";
  const now = Date.now();
  let doc = await HarvestState.findOne({ key });

  if (!doc) {
    // First-time init: start from "now" to avoid backfilling the world
    doc = await HarvestState.create({
      key,
      cursorIso: isoUtcSeconds(),
      lockedAt: new Date(),
      updatedAt: new Date(),
    });
    return doc;
  }

  const lockedAt = doc.lockedAt ? doc.lockedAt.getTime() : 0;
  if (lockedAt && now - lockedAt < LOCK_TTL_MS) return null; // someone else is running

  doc.lockedAt = new Date();
  doc.updatedAt = new Date();
  await doc.save();
  return doc;
}

async function releaseLock(doc, updates = {}) {
  if (!doc) return;
  Object.assign(doc, updates);
  doc.lockedAt = null;
  doc.updatedAt = new Date();
  await doc.save();
}

async function loadCursor() {
  const key = "tm_global";
  const doc = await HarvestState.findOne({ key });
  return doc?.cursorIso || isoUtcSeconds();
}

async function saveCursor(cursorIso) {
  const key = "tm_global";
  await HarvestState.updateOne(
    { key },
    { $set: { cursorIso, updatedAt: new Date() } },
    { upsert: true }
  );
}

/** Move the cursor forward to the latest opening_date seen, keeping some overlap */
function computeNextCursor(prevCursorIso, formattedBatch) {
  const dates = formattedBatch
    .map((e) => (e.opening_date ? e.opening_date.getTime() : null))
    .filter((v) => v != null);
  if (dates.length === 0) return prevCursorIso;

  const maxMs = Math.max(...dates);
  const overlapped = maxMs - CURSOR_OVERLAP_SEC * 1000;
  const nextMs = Math.max(new Date(prevCursorIso).getTime(), overlapped);
  return isoUtcSeconds(new Date(nextMs));
}

/* ----------------------------
   Quota helpers
----------------------------- */

async function safeDiscoveryCall(doCall) {
  if (!canSpend("discovery", 1))
    return { skipped: true, raw: [], pageInfo: { number: 0, totalPages: 0 } };
  const res = await doCall();
  spend("discovery", 1);
  return res;
}

/* ----------------------------
   Public: runGlobalHarvest
----------------------------- */

async function runGlobalHarvest({
  pageSize = 200,
  maxPages = DEFAULT_MAX_PAGES_PER_RUN,
} = {}) {
  // Acquire lock so only one runner works at a time
  const lockDoc = await acquireLock();
  if (!lockDoc) {
    return { locked: true, scanned: 0, upserts: 0 };
  }

  try {
    const cursorIso = await loadCursor();
    let nextCursor = cursorIso;

    let upserts = 0;
    let scanned = 0;
    let page = 0;

    while (page < maxPages) {
      // Quota gate for every page call
      const { raw, pageInfo, skipped } = await safeDiscoveryCall(() =>
        fetchPage({ page, size: pageSize, startDateTime: cursorIso })
      );

      if (skipped) {
        break; // Out of discovery budget
      }

      if (!raw || raw.length === 0) break;

      scanned += raw.length;

      // Filter → Format → Coords
      const buyable = raw.filter((e) => !isClearlyUnavailableFromDiscovery(e));
      const formatted = buyable
        .map((ev) => {
          const base = formatTicketmasterEvent(ev);
          if (!base) return null;
          return {
            ...base,
            availability_hint: availabilityHintFromDiscovery(ev),
          };
        })
        .filter(Boolean);

      const withCoords = formatted.filter(
        (e) => e.coordinate?.longitude != null && e.coordinate?.latitude != null
      );

      for (const ev of withCoords) {
        await upsertEvent(ev);
        upserts++;
      }

      // Move the cursor forward based on batch we just ingested
      nextCursor = computeNextCursor(nextCursor, withCoords);

      page++;
      const totalPages = pageInfo?.totalPages ?? page;
      if (page >= totalPages) break;

      // Early stop if little signal (saves calls)
      if (withCoords.length < 10) break;

      // Pacing
      await sleep(jitter(SLEEP_MS_BETWEEN_PAGES, 0.5));
    }

    // Save cursor
    if (nextCursor !== cursorIso) {
      await saveCursor(nextCursor);
    }

    return { locked: false, scanned, upserts, cursor: nextCursor };
  } catch (error) {
    console.error(error);
  } finally {
    await releaseLock(lockDoc);
  }
}

module.exports = { runGlobalHarvest };
