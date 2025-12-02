/* --------------------------
   Taxonomy matching helpers
--------------------------- */

// Your app taxonomy (copy in or import if you prefer)
const EVENT_CATEGORY = {
  music_and_concerts: {
    subcategories: [
      "pop",
      "rock",
      "jazz",
      "blues",
      "electronic/edm",
      "classical",
      "hip_hop/rap",
      "r&b/soul",
      "country/folk",
      "reggae/ska",
      "indie/alternative",
      "metal/punk",
      "k-pop/j-pop",
      "world/ethnic",
      "experimental/avant-garde",
      "ambient/chillout",
      "tribute_bands",
      "live_concert",
      "music_festival",
      "dj_set/club_night",
      "listening_session",
      "open_mic",
      "street_performance",
      "album_release/listening_party",
      "karaoke_night",
    ],
    vibe: [
      "chill_and_relaxed",
      "high-energy_and_loud",
      "intimate_and_acoustic",
      "party/dance",
    ],
    venue_type: [
      "stadium",
      "concert_hall",
      "club/lounge",
      "outdoor/park",
      "beach/boat_party",
      "rooftop",
    ],
  },
  arts_and_culture: {
    subcategories: [
      "theater/plays",
      "musicals",
      "ballet",
      "opera",
      "spoken_word/poetry",
      "classical_music_concerts",
      "art_exhibitions/gallery_openings",
      "film_screenings/short_films",
      "cultural_festivals",
      "literary_events/book_signings",
      "stand-up_comedy/improv",
      "circus/acrobatics",
      "puppetry/shadow_theater",
      "historical_reenactments",
      "traditional_dance_performances",
    ],
    vibe: [
      "refined_and_elegant",
      "creative_and_expressive",
      "intellectual_and_thought-provoking",
      "chill_and_social",
    ],
    venue_type: [
      "theater",
      "art_gallery",
      "museum",
      "cinema",
      "cultural_center",
      "outdoor_stage",
    ],
  },
  festivals: {
    subcategories: [
      "music_festivals",
      "food_and_drink_festivals",
      "wine/beer/spirits_tastings",
      "cultural/heritage_festivals",
      "film_festivals",
      "art_festivals",
      "fashion_festivals",
      "religious_festivals",
      "literature/book_festivals",
      "light/lantern_festivals",
      "street_festivals",
      "carnival/parade",
      "fireworks/pyro_festivals",
      "eco/sustainability_festivals",
      "technology/innovation_festivals",
      "lgbtq+_pride_events",
    ],
    vibe: [
      "vibrant_and_festive",
      "community_and_social",
      "cultural_and_traditional",
      "family-friendly",
      "nightlife_and_energetic",
    ],
    venue_type: [
      "outdoor/park",
      "street",
      "stadium",
      "waterfront",
      "exhibition_ground",
    ],
  },
  sports_and_fitness: {
    subcategories: [
      "football/soccer",
      "basketball",
      "volleyball",
      "baseball",
      "ice_hockey",
      "rugby",
      "cricket",
      "f1/motorsport",
      "tennis",
      "golf",
      "mma/boxing",
      "e-sports",
      "local_league_matches",
      "youth_sports",
      "friendly_games",
      "marathon",
      "half-marathon",
      "10k/5k_run",
      "trail_running",
      "obstacle_race",
      "triathlon",
      "cycling",
      "swimming",
      "rowing",
      "surfing",
      "sailing/yacht",
      "jet_ski",
      "yoga",
      "bootcamp",
      "zumba",
      "crossfit",
      "bodybuilding",
      "wellness_retreat",
      "climbing",
      "paragliding/skydiving",
      "paintball/laser_tag",
      "archery",
    ],
    vibe: [
      "competitive",
      "active_and_energetic",
      "fun_and_social",
      "wellness_and_mindful",
    ],
    venue_type: [
      "stadium",
      "sports_arena",
      "gym/studio",
      "outdoor_track",
      "beach",
      "mountain/trail",
      "waterfront",
    ],
  },
};

// TM → your categories (primary hint from TM segment)
const SEGMENT_TO_CATEGORY = {
  Music: "music_and_concerts",
  "Arts & Theatre": "arts_and_culture",
  Sports: "sports_and_fitness",
  // Festivals are often Music/Undefined; we rely on keywords too:
};

// Vibe keyword heuristics
const VIBE_KEYWORDS = {
  chill_and_relaxed: [
    /chill/i,
    /lo[- ]?fi/i,
    /relaxed/i,
    /ambient/i,
    /soothing/i,
  ],
  "high-energy_and_loud": [
    /mosh/i,
    /loud/i,
    /hardcore/i,
    /headbang/i,
    /high[- ]?energy/i,
  ],
  intimate_and_acoustic: [/intimate/i, /acoustic/i, /unplugged/i],
  "party/dance": [/party/i, /dance/i, /\bdj\b/i, /club/i, /rave/i],

  refined_and_elegant: [/black[- ]?tie/i, /gala/i, /elegant/i],
  creative_and_expressive: [/creative/i, /expressive/i, /art/i],
  "intellectual_and_thought-provoking": [
    /lecture/i,
    /talk/i,
    /panel/i,
    /debate/i,
  ],
  chill_and_social: [/social/i, /mingle/i],

  vibrant_and_festive: [/festival/i, /fest\b/i, /carnival/i, /parade/i],
  community_and_social: [/community/i, /neighbou?rhood/i],
  cultural_and_traditional: [/cultural/i, /traditional/i, /heritage/i],
  "family-friendly": /\bfamily\b|\bkids?\b|children/i,
  nightlife_and_energetic: [/nightlife/i, /club/i, /party/i, /\bdj\b/i],

  competitive: [/tournament/i, /cup\b/i, /league/i, /championship/i],
  active_and_energetic: [/workout/i, /bootcamp/i, /zumba/i, /crossfit/i],
  fun_and_social: [/social/i, /\bfun\b/i, /meetup/i],
  wellness_and_mindful: [/wellness/i, /yoga/i, /mindful/i, /retreat/i],
};

// Venue type keyword heuristics (match against venue name/address/city)
const VENUE_TYPE_KEYWORDS = {
  stadium: [/stadium/i, /arena/i, /coliseum/i, /dome/i],
  concert_hall: [/concert hall/i, /symphony/i, /philharmonic/i],
  "club/lounge": [/club\b/i, /lounge\b/i, /\bbar\b/i],
  "outdoor/park": [/park\b/i, /field\b/i, /green\b/i, /outdoor/i],
  "beach/boat_party": [/beach\b/i, /marina\b/i, /boat\b/i, /pier\b/i],
  rooftop: [/rooftop\b/i, /\broof\b/i],
  theater: [/theat(re|er)\b/i],
  art_gallery: [/gallery\b/i],
  museum: [/museum\b/i],
  cinema: [/cinema\b/i, /movie\b/i],
  cultural_center: [/cultural\b/i, /community\b/i, /(centre|center)\b/i],
  outdoor_stage: [/outdoor\b/i, /open air\b/i, /amphitheat(re|er)\b/i],
  sports_arena: [/arena\b/i, /stadium\b/i],
  "gym/studio": [/gym\b/i, /studio\b/i, /fitness\b/i],
  outdoor_track: [/track\b/i, /field\b/i],
  beach: [/beach\b/i],
  "mountain/trail": [/mountain\b/i, /trail\b/i],
  waterfront: [/waterfront\b/i, /harbo(u)?r\b/i, /marina\b/i],
  street: [/street\b/i, /\bave(nue)?\b/i],
  exhibition_ground: [/expo\b/i, /exhibition\b/i, /fairground\b/i],
};

// Build regex matchers for all your subcategory strings (best-effort)
const SUBCAT_REGEX = {};
for (const [cat, spec] of Object.entries(EVENT_CATEGORY)) {
  SUBCAT_REGEX[cat] = {};
  spec.subcategories.forEach((s) => {
    // normalize: "hip_hop/rap" => /hip hop|rap/i; underscores to spaces
    const tokens = s.replace(/_/g, " ").split("/");
    const pattern = tokens
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    SUBCAT_REGEX[cat][s] = new RegExp(`\\b(${pattern})\\b`, "i");
  });
}

// Pull text we’ll scan for matches
const eventTextBlob = (ev, venue) => {
  const names = [
    ev?.name,
    ev?.description,
    ev?.info,
    ev?.pleaseNote,
    ev?.classifications
      ?.map((c) =>
        [
          c?.segment?.name,
          c?.genre?.name,
          c?.subGenre?.name,
          c?.type?.name,
          c?.subType?.name,
        ]
          .filter(Boolean)
          .join(" ")
      )
      .join(" "),
  ]
    .filter(Boolean)
    .join(" ");

  const venueText = [
    venue?.name,
    venue?.address?.line1,
    venue?.address?.line2,
    venue?.city?.name,
  ]
    .filter(Boolean)
    .join(" ");

  return `${names} ${venueText}`;
};

// Infer category (strong hint from TM segment; otherwise keywords)
const inferCategory = (ev) => {
  const seg = ev?.classifications?.[0]?.segment?.name;
  if (seg && SEGMENT_TO_CATEGORY[seg]) return SEGMENT_TO_CATEGORY[seg];

  const txt = (ev?.name || "") + " " + (ev?.description || "");
  if (/festival|fest\b|carnival|parade/i.test(txt)) return "festivals";

  // Fallback simple hints
  if (
    /theat(re|er)|ballet|opera|gallery|museum|exhibit|poetry|film/i.test(txt)
  ) {
    return "arts_and_culture";
  }
  if (
    /\bsoccer|football|basketball|marathon|tennis|golf|league|tournament|match\b/i.test(
      txt
    )
  ) {
    return "sports_and_fitness";
  }
  if (/\bconcert|dj|band|music|gig|live\b/i.test(txt)) {
    return "music_and_concerts";
  }

  // Default: keep undefined (client can still see it)
  return undefined;
};

const inferSubcategories = (ev, category) => {
  if (!category) return [];
  const venue = ev?._embedded?.venues?.[0];
  const blob = eventTextBlob(ev, venue);
  const map = SUBCAT_REGEX[category] || {};
  const found = [];
  for (const [sub, re] of Object.entries(map)) {
    if (re.test(blob)) found.push(sub);
  }
  // De-dup + keep order; cap to a reasonable number
  return Array.from(new Set(found)).slice(0, 8);
};

const inferVibe = (ev, category) => {
  const allowed = EVENT_CATEGORY[category]?.vibe || Object.keys(VIBE_KEYWORDS);
  const txt = (ev?.name || "") + " " + (ev?.description || "");
  const matches = [];
  for (const vb of allowed) {
    const rules = VIBE_KEYWORDS[vb];
    if (!rules) continue;
    const ok = Array.isArray(rules)
      ? rules.some((re) => re.test(txt))
      : rules.test(txt);
    if (ok) matches.push(vb);
  }
  return Array.from(new Set(matches)).slice(0, 4);
};

const inferVenueType = (venue, category) => {
  if (!venue) return [];
  const allowed =
    EVENT_CATEGORY[category]?.venue_type || Object.keys(VENUE_TYPE_KEYWORDS);
  const blob = [venue?.name, venue?.address?.line1, venue?.city?.name]
    .filter(Boolean)
    .join(" ");
  const matches = [];
  for (const vt of allowed) {
    const regs = VENUE_TYPE_KEYWORDS[vt] || [];
    if (regs.some((re) => re.test(blob))) matches.push(vt);
  }
  return Array.from(new Set(matches)).slice(0, 3);
};

// Converts various TM date formats into valid JS Date objects
function toDateSafe(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Extracts and normalizes a start/end date from TM’s date structure
function resolveDate(dates, kind = "start") {
  const node = dates?.[kind];
  // Prefer full ISO datetime
  const dt = node?.dateTime ? node.dateTime.replace(/\.\d{3}Z$/, "Z") : null;
  if (dt) return toDateSafe(dt);

  // Fallback to local date/time
  const ld = node?.localDate;
  const lt = node?.localTime;
  if (ld && lt) return toDateSafe(`${ld}T${lt}Z`);
  if (ld) return toDateSafe(`${ld}T00:00:00Z`);

  return null;
}

/* --------------------------
   Address & Fee helpers
--------------------------- */

/**
 * Compose a full address string from a Ticketmaster venue node.
 * Example output:
 *   "Wembley Stadium, South Way, London, HA9 0WS, United Kingdom"
 * If you prefer to exclude the venue name from the address, remove the first push.
 */
function composeAddress(venue) {
  if (!venue) return null;

  const parts = [];

  // include venue name as part of address (toggle off if you don’t want it)
  if (venue.name) parts.push(venue.name);

  // street lines
  const line1 = venue.address?.line1;
  const line2 = venue.address?.line2;
  if (line1) parts.push(line1);
  if (line2) parts.push(line2);

  // city + region (state/province code/name)
  const city = venue.city?.name;
  const stateCode =
    venue.state?.stateCode ||
    venue.state?.code ||
    venue.stateProvince?.code ||
    venue.province?.code;
  const stateName =
    venue.state?.name || venue.stateProvince?.name || venue.province?.name;

  const cityRegion = [city, stateCode || stateName].filter(Boolean).join(", ");
  if (cityRegion) parts.push(cityRegion);

  // postal
  if (venue.postalCode) parts.push(venue.postalCode);

  // country
  const countryName = venue.country?.name;
  if (countryName) parts.push(countryName);

  // clean up ", ," etc.
  const addr = parts.join(", ").replace(/\s+,/g, ",").trim();
  return addr || null;
}

/**
 * Extract a flat fee { amount, currency } from a Ticketmaster event.
 * Ticketmaster often uses priceRanges: [{ min, max, currency }]
 * Since you only want a single amount, we pick a best-effort value:
 *   - prefer "min" if present
 *   - else "max"
 * Currency kept as-is (e.g., "USD"/"EUR"/"PLN") — convert to lowercase if you prefer.
 *
 * Returns: { amount: number, currency: string } | null
 */
function extractFee(ev) {
  const pr = ev?.priceRanges?.[0];
  if (!pr) return null;

  const currency = pr.currency || pr?.currencyCode || null;
  // Best-effort single number
  let amount = null;
  if (typeof pr.min === "number") amount = pr.min;
  else if (typeof pr.max === "number") amount = pr.max;

  if (amount == null || !currency) return null;

  // normalize currency to lowercase if you want: "usd" | "eur" | "pln"
  return { amount, currency: String(currency).toLowerCase() };
}

function parseNum(n) {
  if (n == null) return null;
  const v = typeof n === "string" ? parseFloat(n) : n;
  return Number.isFinite(v) ? v : null;
}

function isClearlyUnavailableFromDiscovery(ev) {
  // status-based
  const code = ev?.dates?.status?.code || "";
  if (/(canceled|cancelled|postponed|offsale)/i.test(code)) return true;

  // sales window — if present and we're outside it, it's likely not purchasable
  const now = Date.now();
  const start = ev?.sales?.public?.startDateTime
    ? Date.parse(ev.sales.public.startDateTime.replace(/\.\d{3}Z$/, "Z"))
    : null;
  const end = ev?.sales?.public?.endDateTime
    ? Date.parse(ev.sales.public.endDateTime.replace(/\.\d{3}Z$/, "Z"))
    : null;

  if (start && now < start) return true; // not yet on sale
  if (end && now > end) return true; // sale ended

  // event already in the past?
  const startUtc = ev?.dates?.start?.dateTime
    ? Date.parse(ev.dates.start.dateTime.replace(/\.\d{3}Z$/, "Z"))
    : ev?.dates?.start?.localDate
    ? Date.parse(`${ev.dates.start.localDate}T23:59:59Z`)
    : null;

  if (startUtc && startUtc < now) return true;

  return false;
}

function availabilityHintFromDiscovery(ev) {
  const code = ev?.dates?.status?.code || "";
  if (/(canceled|cancelled|postponed|offsale)/i.test(code))
    return "likely_unavailable";

  const now = Date.now();
  const start = ev?.sales?.public?.startDateTime
    ? Date.parse(ev.sales.public.startDateTime.replace(/\.\d{3}Z$/, "Z"))
    : null;
  const end = ev?.sales?.public?.endDateTime
    ? Date.parse(ev.sales.public.endDateTime.replace(/\.\d{3}Z$/, "Z"))
    : null;

  if (start && now < start) return "not_yet_on_sale";
  if (end && now > end) return "likely_unavailable";

  return "likely_available";
}

function formatTicketmasterEvent(ev) {
  const venue = ev?._embedded?.venues?.[0] || {};

  // Skip formatting if venue is missing (we'll filter earlier too)
  if (!venue) return null;

  // Coordinates (ensure numbers)
  const longitude = parseNum(venue?.location?.longitude);
  const latitude = parseNum(venue?.location?.latitude);

  // 🔎 Infer taxonomy fields (make sure you have inferCategory/inferSubcategories/inferVibe/inferVenueType defined)
  const category = inferCategory(ev) || null;
  const subcategories = inferSubcategories(ev, category);
  const vibe = inferVibe(ev, category);
  const venue_type = inferVenueType(venue, category);

  // Images: array of URL strings (de-duped)
  const images = Array.from(
    new Set((ev?.images ?? []).map((img) => img?.url).filter(Boolean))
  );

  // Classifications (flatten to easy-to-read strings)
  const cls = ev?.classifications?.[0] || {};
  const classifications = {
    segment: cls?.segment?.name || null,
    genre: cls?.genre?.name || null,
    subGenre: cls?.subGenre?.name || null,
    type: cls?.type?.name || null,
    subType: cls?.subType?.name || null,
    primary: !!cls?.primary,
  };

  // Sales window (public)
  const salesPublic = {
    startDateTime: ev?.sales?.public?.startDateTime
      ? ev.sales.public.startDateTime.replace(/\.\d{3}Z$/, "Z")
      : null,
    endDateTime: ev?.sales?.public?.endDateTime
      ? ev.sales.public.endDateTime.replace(/\.\d{3}Z$/, "Z")
      : null,
    startTBD: ev?.sales?.public?.startTBD ?? null,
  };

  // Dates & status
  const opening_date = resolveDate(ev?.dates, "start");
  const end_date = resolveDate(ev?.dates, "end");
  const timezone = ev?.dates?.timezone || venue?.timezone || null;
  const status = ev?.dates?.status?.code || null;

  // Venue (structured + fullAddress)
  const venueObj = {
    id: venue?.id || null,
    name: venue?.name || null,
    city: venue?.city?.name || null,
    region:
      venue?.state?.name ||
      venue?.stateProvince?.name ||
      venue?.province?.name ||
      null,
    region_code:
      venue?.state?.stateCode ||
      venue?.state?.code ||
      venue?.stateProvince?.code ||
      null,
    postalCode: venue?.postalCode || null,
    country: venue?.country?.name || null,
    country_code: venue?.country?.countryCode || null,
    address_line1: venue?.address?.line1 || null,
    address_line2: venue?.address?.line2 || null,
    timezone: venue?.timezone || null,
    coordinate: { longitude, latitude },
    fullAddress: composeAddress(venue),
  };

  // Attractions (names list for quick display; keep IDs if needed)
  const attractions = (ev?._embedded?.attractions ?? [])
    .map((a) => ({
      id: a?.id || null,
      name: a?.name || null,
      url: a?.url || null,
    }))
    .filter((a) => a.name);

  return {
    title: ev?.name ?? null,
    detail: ev?.description ?? null,

    country: venueObj.country,
    country_code: venueObj.country_code,
    region: venueObj.region,
    region_code: venueObj.region_code,
    address: venueObj.fullAddress,
    fee: extractFee(ev),
    opening_date,
    end_date,
    coordinate: { longitude, latitude },
    category,
    subcategories,
    vibe,
    venue_type,
    id: ev?.id || null,
    url: ev?.url || null,
    locale: ev?.locale || null,
    test: !!ev?.test,
    type: ev?.type || null,
    status,
    timezone,
    image: images[0] || null,
    salesPublic,
    classifications,
    promoterId: ev?.promoter?.id || null,
    venue: venueObj,
    attractions,
  };
}

module.exports = {
  formatTicketmasterEvent,
  isClearlyUnavailableFromDiscovery,
  availabilityHintFromDiscovery,
};
