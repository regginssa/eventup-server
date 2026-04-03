const mongoose = require("mongoose");
const { Schema } = mongoose;

const BookingSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true },

    flight: {
      offer: { type: Object }, // Stores IFlightOffer
      booking: { type: Object }, // Stores IFlightBookingResponse
      status: { type: String, default: "processing" },
    },

    hotel: {
      offer: { type: Object }, // Stores IHotelOffer
      booking: { type: Object }, // Stores IHotelBookingResponse
      status: { type: String, default: "pending" },
    },

    transfer: {
      airportToHotel: {
        offer: { type: Object },
        booking: { type: Object },
        status: { type: String, default: "pending" },
      },
      hotelToEvent: {
        offer: { type: Object },
        booking: { type: Object },
        status: { type: String, default: "pending" },
      },
    },

    price: {
      totalAmount: { type: Number, required: true },
      currency: { type: String, default: "EUR" },
      breakdown: {
        flight: Number,
        hotel: Number,
        transferAirport: Number,
        transferEvent: Number,
      },
    },

    packageType: { type: String, required: true },

    paymentStatus: {
      type: String,
      enum: [
        "created",
        "pending",
        "completed",
        "failed",
        "partially_completed",
      ],
      default: "created",
    },

    ticketStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Booking", BookingSchema);
