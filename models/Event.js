const mongoose = require("mongoose");

const TMSchema = new mongoose.Schema(
  {
    eventId: { type: String, default: null },
    url: { type: String, default: null },
    locale: { type: String, default: null },
    sales: {
      startDateTime: { type: String, default: null },
      endDateTime: { type: String, default: null },
      code: { type: String, default: null },
    },
    venueId: { type: String, default: null },
    ticketLimitInfo: { type: String, default: null },
  },
  { _id: false }
);

const DatesSchema = new mongoose.Schema(
  {
    start: {
      date: { type: String, default: null },
      time: { type: String, default: null },
    },
    end: {
      date: { type: String, default: null },
      time: { type: String, default: null },
    },
    timezone: { type: String, default: null },
  },
  { _id: false }
);

const LocationSchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
    postalCode: { type: String, default: null },
    country: {
      name: { type: String, default: null },
      code: { type: String, default: null },
    },
    city: {
      name: { type: String, default: null },
      code: { type: String, default: null },
    },
    state: {
      name: { type: String, default: null },
      code: { type: String, default: null },
    },
    address: { type: String, default: null },
    coordinate: {
      longitude: { type: Number, default: 0 },
      latitude: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const ClassificationsSchema = new mongoose.Schema(
  {
    category: { type: String, default: null },
    subcategories: [{ type: String }],
    vibe: [{ type: String }],
    venue: [{ type: String }],
  },
  { _id: false }
);

const FeeSchema = new mongoose.Schema({
  type: { type: String, enum: ["free", "paid"], default: "free" },
  amount: { type: String, default: null },
  currency: { type: String, default: "USD" },
});

const EventSchema = new mongoose.Schema({
  type: { type: String, enum: ["ai", "user"], default: "ai" },
  name: { type: String, default: null },
  description: { type: String, default: null },
  tm: TMSchema,
  dates: DatesSchema,
  location: LocationSchema,
  classifications: ClassificationsSchema,
  seatmap: { type: String, default: null },
  images: [String],
  fee: FeeSchema,
  hoster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  status: {
    type: String,
    enum: ["open", "closed", "pending", "completed", "cancelled"],
    default: "open",
  },
});

module.exports = mongoose.model("Event", EventSchema);
