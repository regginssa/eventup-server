const mongoose = require("mongoose");

const KycSchema = new mongoose.Schema(
  {
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
  { _id: false },
);

const PreferredSchema = new mongoose.Schema(
  {
    category: { type: String, default: null },
    subcategories: [{ type: String }],
    vibe: [{ type: String }],
    venueType: [{ type: String }],
    location: {
      type: String,
      enum: ["nearby", "city", "country", "worldwide"],
      default: "nearby",
    },
  },
  { _id: false },
);

const StripePaymentMethodSchema = new mongoose.Schema(
  {
    id: { type: String, default: null },
    brand: { type: String, default: null },
    expiryMonth: { type: Number, default: 0 },
    expiryYear: { type: Number, default: 0 },
    last4: { type: Number, default: 0 },
    postalCode: { type: String, default: null },
  },
  { _id: false },
);

const StripeSchema = new mongoose.Schema(
  {
    customerId: { type: String, default: null },
    paymentMethods: [StripePaymentMethodSchema],
  },
  { _id: false },
);

const LocationSchema = new mongoose.Schema(
  {
    country: {
      name: { type: String, default: null },
      code: { type: String, default: null },
    },
    region: {
      name: { type: String, default: null },
      code: { type: String, default: null },
    },
    city: {
      name: { type: String, default: null },
      code: { type: String, default: null },
    },
    address: { type: String, default: null },
    coordinate: {
      latitude: { type: Number, default: 0 },
      longitude: { type: Number, default: 0 },
    },
  },
  { _id: false },
);

const OtpSchema = new mongoose.Schema({
  code: { type: String, default: null },
  expiresAt: { type: Date, default: Date.now },
});

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    avatar: { type: String, default: null },
    title: { type: String, default: null },
    description: { type: String, default: null },
    rate: { type: Number, default: 0 },
    location: LocationSchema,
    accountType: {
      type: String,
      enum: ["individual", "company"],
      default: "individual",
    },
    userType: { type: String, enum: ["user", "admin"], default: "user" },
    signOption: {
      type: String,
      enum: ["email", "google", "apple"],
      default: "email",
    },
    gender: { type: String, enum: ["mr", "ms"], default: "mr" },
    birthday: { type: String },
    phone: { type: String },
    googleId: { type: String, default: null },
    appleId: { type: String, default: null },
    blocked: { type: Boolean, default: false },
    idVerified: { type: Boolean, default: false },
    kyc: KycSchema,
    preferred: PreferredSchema,
    stripe: StripeSchema,
    tickets: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Ticket", default: null },
    ],
    subscription: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscription",
        default: "698344ad855e2bb5feee2bb0",
      },
      startedAt: { type: String, default: null },
    },
    status: { type: String, enum: ["online", "offline"], default: "online" },
    otp: OtpSchema,
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

UserSchema.pre("save", function (next) {
  if (this.tickets && this.tickets.length > 15) {
    return next(new Error("A user cannot have more than 15 tickets."));
  }
  next();
});

module.exports = mongoose.model("User", UserSchema);
