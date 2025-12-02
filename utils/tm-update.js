const Event = require("../models/Event");

// ---------- Utility parsers ----------
const toDate = (v) => (v ? new Date(v) : undefined);

// Try to parse "There is a global limit of 8 tickets..." → 8
const parseGlobalLimit = (info) => {
  if (!info || typeof info !== "string") return undefined;
  const m = info.match(/(\d+)\s*ticket/i);
  return m ? Number(m[1]) : undefined;
};

// ---------- Discovery mapper ----------
function applyDiscoveryFields(eventDoc, discovery) {
  // Basic
  eventDoc.id = discovery.id || eventDoc.id;
  eventDoc.title = discovery.name ?? eventDoc.title;
  eventDoc.url = discovery.url ?? eventDoc.url;
  eventDoc.locale = discovery.locale ?? eventDoc.locale;
  eventDoc.test = discovery.test ?? eventDoc.test;
  eventDoc.type = discovery.type ?? eventDoc.type;

  // Status / timezone
  eventDoc.status = discovery?.dates?.status?.code ?? eventDoc.status;
  eventDoc.timezone = discovery?.dates?.timezone ?? eventDoc.timezone;

  // Description
  eventDoc.detail = discovery?.info ?? eventDoc.detail;
  eventDoc.notes = discovery?.pleaseNote ?? eventDoc.notes;

  // Images
  if (Array.isArray(discovery.images)) {
    eventDoc.images = discovery.images;
    const hero =
      discovery.images.find((img) => img.ratio === "16_9") ||
      discovery.images[0];
    if (hero?.url) eventDoc.image = hero.url;
  }

  // Seatmap
  if (discovery?.seatmap?.staticUrl) {
    eventDoc.seatmap = { staticUrl: discovery.seatmap.staticUrl };
  }

  // Ticketing flags
  eventDoc.ticketing = {
    safeTixEnabled: !!discovery?.ticketing?.safeTix?.enabled,
    allInclusivePricingEnabled:
      !!discovery?.ticketing?.allInclusivePricing?.enabled,
  };

  // Limits
  const globalLimit = parseGlobalLimit(discovery?.ticketLimit?.info);
  const accessibilityLimit = discovery?.accessibility?.ticketLimit;
  eventDoc.ticketLimit = {
    globalLimit,
    accessibilityLimit,
    info: discovery?.ticketLimit?.info,
  };

  // Dates
  eventDoc.opening_date =
    toDate(discovery?.dates?.start?.dateTime) || eventDoc.opening_date;
  eventDoc.end_date = undefined;
  eventDoc.doors_time =
    toDate(discovery?.doorsTimes?.dateTime) || eventDoc.doors_time;

  // Sales windows
  eventDoc.salesPublic = {
    startDateTime: toDate(discovery?.sales?.public?.startDateTime),
    endDateTime: toDate(discovery?.sales?.public?.endDateTime),
    startTBD: !!discovery?.sales?.public?.startTBD,
    startTBA: !!discovery?.sales?.public?.startTBA,
  };

  if (Array.isArray(discovery?.sales?.presales)) {
    eventDoc.salesPresales = discovery.sales.presales.map((p) => ({
      name: p.name,
      startDateTime: toDate(p.startDateTime),
      endDateTime: toDate(p.endDateTime),
    }));
  }

  // Classifications
  const cls = Array.isArray(discovery.classifications)
    ? discovery.classifications[0]
    : null;
  if (cls) {
    eventDoc.classifications = {
      primary: !!cls.primary,
      segment: cls.segment?.name,
      genre: cls.genre?.name,
      subGenre: cls.subGenre?.name,
      type: cls.type?.name,
      subType: cls.subType?.name,
    };
  }

  // Price ranges
  if (Array.isArray(discovery.priceRanges)) {
    eventDoc.priceRanges = discovery.priceRanges.map((r) => ({
      type: r.type,
      currency: r.currency,
      min: r.min,
      max: r.max,
    }));
  }

  eventDoc.lastSyncedAt = new Date();
}

// ---------- Availability / Offers mapper ----------
function applyAvailabilityFields(eventDoc, availability) {
  let offers = [];

  if (Array.isArray(availability?.offers)) {
    offers = availability.offers.map((o) => ({
      offerId: o.id || o.offerId,
      name: o.name,
      ticketType: o.ticketType || o.type,
      enabled: !!o.enabled,
      currency: o.currency,
      minPrice: o.minPrice ?? o.priceMin ?? o.faceValueMin,
      maxPrice: o.maxPrice ?? o.priceMax ?? o.faceValueMax,
      faceValueMin: o.faceValueMin,
      faceValueMax: o.faceValueMax,
      inventoryCount: o.inventoryCount ?? o.quantity ?? o.available,
      section: o.section,
      row: o.row,
      isResale: !!o.isResale || o.ticketType === "resale",
      attributes: o.attributes || o.meta || undefined,
    }));
  }

  const primaryMin =
    availability?.priceRanges?.primary?.min ??
    availability?.primaryMin ??
    minFromOffers(offers, (o) => !o.isResale);
  const primaryMax =
    availability?.priceRanges?.primary?.max ??
    availability?.primaryMax ??
    maxFromOffers(offers, (o) => !o.isResale);
  const resaleMin =
    availability?.priceRanges?.resale?.min ??
    availability?.resaleMin ??
    minFromOffers(offers, (o) => o.isResale);
  const resaleMax =
    availability?.priceRanges?.resale?.max ??
    availability?.resaleMax ??
    maxFromOffers(offers, (o) => o.isResale);

  const currency =
    availability?.currency ||
    availability?.priceRanges?.currency ||
    firstCurrency(offers);

  const status =
    availability?.status ||
    availability?.eventStatus ||
    eventDoc.status ||
    undefined;

  const totalAvailable =
    availability?.totalAvailable ??
    (Array.isArray(offers)
      ? offers.reduce((sum, o) => sum + (Number(o.inventoryCount) || 0), 0)
      : undefined);

  const hasInventory =
    typeof totalAvailable === "number"
      ? totalAvailable > 0
      : offers.some(
          (o) => o.enabled && (o.inventoryCount == null || o.inventoryCount > 0)
        );

  eventDoc.offers = offers;
  eventDoc.availability = {
    status,
    hasInventory,
    currency,
    primaryMin: toNumberOrUndefined(primaryMin),
    primaryMax: toNumberOrUndefined(primaryMax),
    resaleMin: toNumberOrUndefined(resaleMin),
    resaleMax: toNumberOrUndefined(resaleMax),
    totalAvailable: toNumberOrUndefined(totalAvailable),
    checkedAt: new Date(),
    source: availability?.source || availability?.__source,
  };

  eventDoc.lastSyncedAt = new Date();
}

// ---------- Helpers ----------
const toNumberOrUndefined = (v) =>
  v == null ? undefined : Number.isNaN(Number(v)) ? undefined : Number(v);

function firstCurrency(offers) {
  const o = Array.isArray(offers) ? offers.find((x) => x?.currency) : null;
  return o?.currency;
}
function minFromOffers(offers, predicate) {
  let min = undefined;
  for (const o of offers || []) {
    if (predicate && !predicate(o)) continue;
    const val = Number(o.minPrice ?? o.faceValueMin);
    if (!Number.isFinite(val)) continue;
    if (min == null || val < min) min = val;
  }
  return min;
}
function maxFromOffers(offers, predicate) {
  let max = undefined;
  for (const o of offers || []) {
    if (predicate && !predicate(o)) continue;
    const val = Number(o.maxPrice ?? o.faceValueMax);
    if (!Number.isFinite(val)) continue;
    if (max == null || val > max) max = val;
  }
  return max;
}

// ---------- Upsert & update ----------
async function upsertEventFromDiscovery(discovery) {
  const eventId = discovery.id;
  if (!eventId) return null;

  let doc = await Event.findOne({ id: eventId });
  if (!doc) doc = new Event({ id: eventId });

  applyDiscoveryFields(doc, discovery);
  await doc.save();
  return doc.toObject();
}

async function updateEventAvailability(eventId, availability) {
  const doc = await Event.findOne({ id: eventId });
  if (!doc) throw new Error(`Event ${eventId} not found`);

  applyAvailabilityFields(doc, availability);
  await doc.save();
  return doc.toObject();
}

module.exports = {
  upsertEventFromDiscovery,
  updateEventAvailability,
  applyDiscoveryFields,
  applyAvailabilityFields,
};
