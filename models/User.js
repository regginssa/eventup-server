const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  avatar: { type: String, default: null },
  title: { type: String, default: null },
  about: { type: String, default: null },
  location: {
    country: { type: String, default: null },
    country_code: { type: String, default: null },
    region: { type: String, default: null },
    region_code: { type: String, default: null },
    address: { type: String, default: null },
    coordinate: {
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 },
    },
  },
  account_type: {
    type: String,
    enum: ["individual", "company"],
    default: "individual",
  },
  user_type: { type: String, enum: ["user", "admin"], default: "user" },
  sign_option: {
    type: String,
    enum: ["email", "google", "apple"],
    default: "email",
  },
  google_id: { type: String, default: null },
  apple_id: { type: String, default: null },
  is_blocked: { type: Boolean, default: false },
  is_id_verified: { type: Boolean, default: false },
  kyc: {
    sessionId: { type: String, default: null },
    sessionNumber: { type: Number, default: 0 },
    sessionToken: { type: String, default: null },
    vendorData: { type: String, default: null },
    status: {
      type: String,
      enum: [
        "Not Started",
        "In Progress",
        "In Review",
        "Completed",
        "Approved",
        "Declined",
        "Expired",
        "Abandoned",
      ],
      default: "Not Started",
    },
    url: { type: String, default: null },
  },
  preferred: {
    category: { type: String, default: null },
    subcategories: [{ type: String }],
    vibe: [{ type: String }],
    venue_type: [{ type: String }],
    location: {
      type: String,
      enum: ["nearby", "city", "country", "worldwide"],
      default: "nearby",
    },
  },
  nearest_airports: [
    {
      name: String,
      city: String,
      country: String,
      iata: String,
      latitude: Number,
      longitude: Number,
      distance_km: Number,
    },
  ],
  stripe: {
    customer_id: { type: String, default: null },
    payment_methods: [
      {
        payment_method_id: { type: String, default: null },
        brand: { type: String, default: null },
        expiryMonth: { type: Number, default: 0 },
        expiryYear: { type: Number, default: 0 },
        last4: { type: Number, default: 0 },
        postalCode: { type: String, default: null },
      },
    ],
  },
});

module.exports = mongoose.model("User", UserSchema);
