const mongoose = require("mongoose");

const FeeSchema = new mongoose.Schema(
  { amount: Number, currency: String },
  { _id: false }
);

const CoordinateSchema = new mongoose.Schema(
  { longitude: Number, latitude: Number },
  { _id: false }
);

const ClassificationsSchema = new mongoose.Schema(
  {
    segment: String,
    genre: String,
    subGenre: String,
    type: String,
    subType: String,
    primary: Boolean,
  },
  { _id: false }
);

// NEW: priceRanges from Discovery (simple aggregate of min/max per type)
const PriceRangeSchema = new mongoose.Schema(
  {
    type: String, // 'standard', 'vip', 'resale', etc (as reported)
    currency: String,
    min: Number,
    max: Number,
  },
  { _id: false }
);

// NEW: Offer-level details from Availability / Partner API
const OfferSchema = new mongoose.Schema(
  {
    offerId: String, // provider's identifier, if available
    name: String, // optional label (e.g., "VIP", "Standard")
    ticketType: String, // e.g. primary, resale, VIP, GA, etc.
    enabled: Boolean, // can be purchased now?
    currency: String,
    minPrice: Number, // min price for this offer (face or dynamic)
    maxPrice: Number, // max price for this offer
    faceValueMin: Number, // optional, if provided
    faceValueMax: Number,
    inventoryCount: Number, // tickets available in this offer (if provided)
    section: String, // if section-level present
    row: String, // if row-level present
    isResale: Boolean, // convenience flag if source indicates resale
    attributes: mongoose.Schema.Types.Mixed, // any extra data from API
  },
  { _id: false }
);

// NEW: Summarized availability snapshot
const AvailabilitySnapshotSchema = new mongoose.Schema(
  {
    status: String, // e.g. 'onsale', 'offsale', 'soldout' (from dates.status or availability)
    hasInventory: Boolean, // quick flag if any purchasable inventory exists
    currency: String, // primary currency for summary
    primaryMin: Number, // primary market min price (if known)
    primaryMax: Number,
    resaleMin: Number, // resale market min price (if known)
    resaleMax: Number,
    totalAvailable: Number, // if the API sends a global available count
    checkedAt: { type: Date, default: null }, // when we last refreshed availability
    source: String, // 'inventory-status', 'partner-availability', etc.
  },
  { _id: false }
);

// NEW: Door time, seatmap, limits, ticketing flags, and better sales typing
const SalesWindowSchema = new mongoose.Schema(
  {
    startDateTime: Date,
    endDateTime: Date,
    startTBD: Boolean,
    startTBA: Boolean,
  },
  { _id: false }
);

const PresaleSchema = new mongoose.Schema(
  {
    name: String,
    startDateTime: Date,
    endDateTime: Date,
  },
  { _id: false }
);

const TicketLimitSchema = new mongoose.Schema(
  {
    globalLimit: Number, // parsed from text when possible
    accessibilityLimit: Number,
    info: String, // original info text
  },
  { _id: false }
);

const SeatmapSchema = new mongoose.Schema(
  {
    staticUrl: String,
  },
  { _id: false }
);

const TicketingFlagsSchema = new mongoose.Schema(
  {
    safeTixEnabled: Boolean,
    allInclusivePricingEnabled: Boolean,
  },
  { _id: false }
);

const EventSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    kind: { type: String, enum: ["user", "ai"], default: "user" },
    fee_type: { type: String, enum: ["free", "paid"], default: "free" },
    fee: {
      amount: { type: Number, default: 0 },
      currency: { type: String, enum: ["usd", "eur", "pln"], default: "usd" },
    },

    // From Discovery
    title: String,
    detail: String, // long description (we’ll map from `info`)
    notes: String, // extra notes (we’ll map from `pleaseNote`)
    url: String,
    locale: String,
    test: Boolean,
    type: String,
    status: { type: String, index: true }, // from dates.status.code (onsale, etc)
    timezone: String,

    // Location / venue
    country: String,
    country_code: String,
    region: String,
    region_code: String,
    address: String,
    venue: mongoose.Schema.Types.Mixed, // keep flexible
    coordinate: CoordinateSchema, // lon/lat from Discovery if present
    loc: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number] }, // [lon, lat]
    },

    // Dates
    opening_date: { type: Date, index: true }, // event start
    end_date: Date, // if multi-day
    doors_time: Date, // NEW: from doorsTimes.dateTime

    // Ticket sales windows
    salesPublic: SalesWindowSchema,
    salesPresales: [PresaleSchema], // NEW: array of presales

    // Ticketing & seatmap & limits
    ticketLimit: TicketLimitSchema, // NEW: structured limits
    seatmap: SeatmapSchema, // NEW: seat map URL
    ticketing: TicketingFlagsSchema, // NEW: SafeTix, AIP

    // Classification
    classifications: ClassificationsSchema, // keep as single object for now

    // Media
    image: String, // hero image
    images: [
      // keep all, if desired
      new mongoose.Schema(
        {
          ratio: String,
          url: String,
          width: Number,
          height: Number,
          fallback: Boolean,
        },
        { _id: false }
      ),
    ],

    // Categories/tags you already use
    category: { type: String, index: true },
    subcategories: [{ type: String, index: true }],
    vibe: [{ type: String, index: true }],
    venue_type: [{ type: String, index: true }],

    // Pricing (Discovery-level)
    priceRanges: [PriceRangeSchema], // NEW: Discovery price ranges

    // Availability (Offer-level + snapshot)
    offers: [OfferSchema], // NEW: list of offers (from availability/offers API)
    availability: AvailabilitySnapshotSchema, // NEW: quick read summary for UI

    // Misc
    promoterId: String,
    attractions: [{ id: String, name: String, url: String }],

    availability_hint: { type: String, index: true },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

EventSchema.index({ loc: "2dsphere" });
EventSchema.index({ opening_date: 1, availability_hint: 1 });
EventSchema.index({ country_code: 1, category: 1 });

module.exports = mongoose.models.Event || mongoose.model("Event", EventSchema);
