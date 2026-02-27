const mongoose = require("mongoose");

const PaymentStatus = {
  type: String,
  enum: ["pending", "processing", "confirmed", "failed", "cancelled"],
  default: "pending",
};

const FlightSchema = new mongoose.Schema(
  {
    // --- Identifiers ---
    orderId: { type: String, required: true, unique: true }, // Amadeus Order ID
    pnr: { type: String, required: true, index: true }, // Record Locator (e.g., "AKIL3X")
    status: { type: String, default: "CONFIRMED" },

    // --- Itinerary Summary (UX Friendly) ---
    originIata: { type: String, required: true }, // e.g., "JFK"
    destinationIata: { type: String, required: true }, // e.g., "LHR"
    departureDate: { type: Date, required: true },
    arrivalDate: { type: Date, required: true },
    airlineName: String, // Primary carrier code (e.g., "BA")
    flightNumber: String, // e.g., "BA123"
    isRoundTrip: { type: Boolean, default: false },

    // --- Passenger Summary ---
    leadPassengerName: { type: String, required: true },
    totalPassengers: Number,

    // --- Financials ---
    totalPrice: Number,
    currency: String,

    // --- Deep Data ---
    segments: Array, // Cleaned list of all flights
    travelers: Array, // Passenger details
    rawResponse: Object, // Complete Amadeus JSON

    // --- Payment Status ---
    paymentStatus: PaymentStatus,
  },
  { _id: false, timestamps: true },
);

const HotelSchema = new mongoose.Schema(
  {
    bookingReference: { type: String, required: true, unique: true }, // amadeus id
    hotelConfirmationCode: { type: String, index: true }, // The ID the hotel clerk needs
    status: {
      type: String,
      enum: ["CONFIRMED", "CANCELLED", "PENDING"],
      default: "CONFIRMED",
    },

    // --- Stay Details (UX Friendly) ---
    hotelName: { type: String, required: true },
    hotelId: String,
    checkInDate: { type: Date, required: true },
    checkOutDate: { type: Date, required: true },

    // --- Guest Info (Primary Guest) ---
    leadGuestName: { type: String, required: true },
    guestEmail: String,
    guestPhone: String,

    // --- Financials ---
    totalAmount: Number,
    currency: String,
    paymentPolicy: { type: String, enum: ["PREPAID", "GUARANTEE", "DEPOSIT"] },

    // --- Room Info ---
    roomDescription: String,
    roomQuantity: Number,

    // --- Full Metadata (The "Safety Net") ---
    rawResponse: { type: Object }, // Store the full original JSON here
    paymentStatus: PaymentStatus,
  },
  { _id: false, timestamps: true },
);

const TransferSchema = new Schema(
  {
    // --- Identifiers ---
    orderId: { type: String, required: true, unique: true }, // Amadeus id
    bookingReference: { type: String, required: true }, // Amadeus reference
    confirmationNumber: { type: String, index: true }, // Provider's confirmNbr
    status: { type: String, default: "CONFIRMED" },

    // --- Logistics (UX Friendly) ---
    transferType: { type: String, enum: ["PRIVATE", "SHARED"] },
    pickupDateTime: { type: Date, required: true },
    pickupLocation: { type: String, required: true }, // Code or Name
    dropoffLocation: { type: String, required: true }, // Name or Address line

    // --- Provider & Driver Contact ---
    providerName: { type: String, required: true },
    providerPhone: String,
    providerEmail: String,
    providerLogo: String,

    // --- Vehicle Details ---
    vehicleType: String, // e.g., "ECONOMY", "LUXURY"
    vehicleDescription: String,
    passengerCount: Number,
    baggageCount: Number,

    // --- Financials ---
    totalAmount: Number,
    currency: String,

    // --- UX Extras ---
    meetingInstructions: String, // From transfers[0].note
    rawResponse: Object,

    // --- Payment Status ---
    paymentStatus: PaymentStatus,
  },
  { _id: false, timestamps: true },
);

const OfficialTicketSchema = new mongoose.Schema(
  {
    orderId: String,
    paymentStatus: {
      type: String,
      enum: ["awaiting_payment", "pending_sync", "confirmed", "failed"],
      default: "awaiting_payment",
    },
  },
  { _id: false, timestamps: true },
);

const BillingAddressSchema = new mongoose.Schema(
  {
    line: { type: String, required: true },
    zip: { type: String, required: true },
    countryCode: { type: String, required: true },
    cityName: { type: String, required: true },
  },
  { _id: false },
);

const billingDetailsSchema = new mongoose.Schema(
  {
    method: String, // e.g., "CREDIT_CARD"
    cardType: String, // vendorCode (VI, MC, AX)
    cardLastFour: String, // Extract via: req.cardNumber.slice(-4)
    cardHolder: String,
    billingAddress: BillingAddressSchema,
  },
  { _id: false },
);

const BookingSchema = new mongoose.Schema({
  flight: FlightSchema,
  hotel: HotelSchema,
  transfer: {
    ah: TransferSchema,
    he: TransferSchema,
  },
  billingDetails: billingDetailsSchema,
  officialTicket: OfficialTicketSchema,
  communityTicket: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  price: {
    total: { type: Number, default: 0 },
    base: { type: Number, default: 0 },
    comission: { type: Number, default: 0 },
    currency: { type: String, required: true },
  },
  package: { type: String, enum: ["standard", "gold"], default: "standard" },
});

module.exports = mongoose.model("Booking", BookingSchema);
