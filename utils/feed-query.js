const EventModel = require("../models/Event");

/**
 * User.preferred schema:
 * preferred: {
 *   category: String|null,
 *   subcategories: [String],
 *   vibe: [String],
 *   venue_type: [String],
 *   location: "nearby" | "city" | "country" | "worldwide"
 * }
 *
 * Event schema notes: events have `region` (no city); geo index on `loc`.
 */

// Distance buckets (meters)
const RAD10 = 10_000;
const RAD25 = 25_000;
const RAD50 = 50_000;

/** Base time/availability filter: only future, non-cancelled events. */
function baseMatch(now = new Date()) {
  return {
    status: { $nin: ["canceled", "cancelled", "postponed", "offsale"] },
    // opening_date: { $gte: now },
  };
}

/**
 * Single-pass ranked search:
 * - Start from ALL base-matching events (no early return).
 * - Compute preference booleans (category/subs/vibe/venue).
 * - Compute match tier (1..8; 1 is best).
 * - Compute locationScore (nearby/country + region==userCity boost when mode === "city").
 * - totalScore = (9 - tier) + locationScore.
 * - Sort by totalScore desc, distance asc (when present), opening_date asc, lastSyncedAt desc.
 * - IMPORTANT: we DO NOT $project at the end → no fields are dropped.
 */
async function findPersonalizedEvents({ user, page = 1, limit = 20 }) {
  const now = new Date();
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  // Preferred (from user.preferred)
  const preferred = user?.preferred || {};
  const prefCategory = preferred.category ?? null;
  const prefSubs = Array.isArray(preferred.subcategories)
    ? preferred.subcategories
    : [];
  const prefVibe = Array.isArray(preferred.vibe) ? preferred.vibe : [];
  const prefVenue = Array.isArray(preferred.venue_type)
    ? preferred.venue_type
    : [];
  const mode = preferred.location || "nearby";

  // Runtime location
  const { longitude, latitude } = user?.location?.coordinate || {};
  const userCC = user?.location?.country_code || null;

  // In "city" mode, we compare the user's chosen "city" string to event.region
  const userCityName = user?.location?.city || user?.location?.region || null;
  const userCityLC = userCityName ? String(userCityName).toLowerCase() : null;

  // ⭐ Base match
  const matchBase = baseMatch(now);

  // ⭐🔥 New: remove past events
  matchBase.opening_date = { $gte: now };

  const pipeline = [];

  // ---- $geoNear if nearby mode ----
  if (mode === "nearby" && longitude != null && latitude != null) {
    pipeline.push({
      $geoNear: {
        key: "loc",
        near: { type: "Point", coordinates: [longitude, latitude] },
        distanceField: "distance",
        spherical: true,
        query: matchBase, // includes opening_date >= now
      },
    });
  } else {
    // Normal match
    pipeline.push({ $match: matchBase });
  }

  pipeline.push(
    // Normalize core fields
    {
      $addFields: {
        _category: "$category",
        _subs: { $ifNull: ["$subcategories", []] },
        _vibe: { $ifNull: ["$vibe", []] },
        _venue: { $ifNull: ["$venue_type", []] },
        _region: { $ifNull: ["$region", ""] },
      },
    },

    // Preference matches
    {
      $addFields: {
        match_category: prefCategory
          ? { $eq: ["$_category", prefCategory] }
          : false,

        pref_subs: prefSubs,
        subs_overlap: {
          $gt: [{ $size: { $setIntersection: ["$_subs", prefSubs] } }, 0],
        },
        subs_equal: prefSubs.length
          ? { $setEquals: ["$_subs", prefSubs] }
          : false,
        subs_superset: prefSubs.length
          ? { $setIsSubset: [prefSubs, "$_subs"] }
          : false,

        pref_vibe: prefVibe,
        vibe_overlap: {
          $gt: [{ $size: { $setIntersection: ["$_vibe", prefVibe] } }, 0],
        },
        vibe_equal: prefVibe.length
          ? { $setEquals: ["$_vibe", prefVibe] }
          : false,

        pref_venue: prefVenue,
        venue_overlap: {
          $gt: [{ $size: { $setIntersection: ["$_venue", prefVenue] } }, 0],
        },
        venue_equal: prefVenue.length
          ? { $setEquals: ["$_venue", prefVenue] }
          : false,
      },
    },

    // Region normalization
    {
      $addFields: {
        region_lc: { $toLower: "$_region" },
        locationLabel: {
          $trim: {
            input: {
              $cond: [{ $ne: ["$_region", ""] }, "$_region", ""],
            },
          },
        },
      },
    },

    // Base location scoring
    {
      $addFields: {
        baseLocationScore: (() => {
          if (mode === "nearby" && longitude != null && latitude != null) {
            return {
              $switch: {
                branches: [
                  { case: { $lte: ["$distance", RAD10] }, then: 3 },
                  { case: { $lte: ["$distance", RAD25] }, then: 2 },
                  { case: { $lte: ["$distance", RAD50] }, then: 1 },
                ],
                default: 0,
              },
            };
          }
          if (mode === "country" && userCC) {
            return { $cond: [{ $eq: ["$country_code", userCC] }, 2, 0] };
          }
          return 0;
        })(),
      },
    },

    // City mode scoring
    {
      $addFields: {
        preferredRegionMatch: userCityLC
          ? { $eq: ["$region_lc", userCityLC] }
          : false,

        locationScore: {
          $add: [
            "$baseLocationScore",
            mode === "city" && userCityLC
              ? { $cond: ["$preferredRegionMatch", 3, 0] }
              : 0,
          ],
        },
      },
    },

    // Tier scoring
    {
      $addFields: {
        subs_exactish: {
          $cond: [
            { $gt: [{ $size: "$pref_subs" }, 0] },
            { $or: ["$subs_equal", "$subs_superset"] },
            false,
          ],
        },
        matchTier: {
          $switch: {
            branches: [
              // Tier 1
              {
                case: {
                  $and: [
                    "$match_category",
                    "$subs_exactish",
                    "$vibe_equal",
                    "$venue_equal",
                  ],
                },
                then: 1,
              },
              // Tier 2
              {
                case: {
                  $and: [
                    "$match_category",
                    "$subs_exactish",
                    { $or: ["$vibe_overlap", "$venue_overlap"] },
                  ],
                },
                then: 2,
              },
              // Tier 3
              {
                case: {
                  $and: [
                    "$match_category",
                    "$subs_overlap",
                    { $or: ["$vibe_equal", "$venue_equal"] },
                  ],
                },
                then: 3,
              },
              // Tier 4
              {
                case: { $and: ["$match_category", "$subs_overlap"] },
                then: 4,
              },
              // Tier 5
              { case: "$match_category", then: 5 },
              // Tier 6
              {
                case: {
                  $or: ["$subs_overlap", "$vibe_overlap", "$venue_overlap"],
                },
                then: 6,
              },
              // Tier 7
              { case: { $gt: ["$locationScore", 0] }, then: 7 },
            ],
            default: 8,
          },
        },
      },
    },

    // Final scoring
    {
      $addFields: {
        tierBase: { $subtract: [9, "$matchTier"] },
        totalScore: {
          $add: [{ $subtract: [9, "$matchTier"] }, "$locationScore"],
        },
      },
    },
    {
      $sort: {
        totalScore: -1,
        distance: 1,
        opening_date: 1,
        lastSyncedAt: -1,
        _id: 1,
      },
    },

    { $skip: skip },
    { $limit: safeLimit }
  );

  const [items, total] = await Promise.all([
    EventModel.aggregate(pipeline).allowDiskUse(true),
    EventModel.countDocuments(matchBase),
  ]);

  const minTier = items.length
    ? Math.min(...items.map((e) => e.matchTier ?? 8))
    : null;

  return {
    items,
    total,
    tierUsed: minTier,
    radiusUsed: null,
  };
}

module.exports = {
  RAD10,
  RAD25,
  RAD50,
  baseMatch,
  findPersonalizedEvents,
};
