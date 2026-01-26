const mongoose = require("mongoose");

const FlightBookingSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  airline: { type: String, required: true },
  departure: {
    airport: { type: String, required: true },
    datetime: { type: String, required: true },
  },
  arrival: {
    airport: { type: String, required: true },
    datetime: { type: String, required: true },
  },
  class: { type: String, enum: ["standard", "gold"], required: true },
  confirmationCode: { type: String, required: true },
}, {_id: false});

const HotelBookingSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  hotel: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String, default: null },
  },
  rooms: [
    {
      description: { type: String, required: true },
      type: { type: String, required: true },
    },
  ],
  checkIn: { type: String, required: true },
  checkOut: { type: String, required: true },
  providerCode: { type: String, default: null },
  confirmationCode: { type: String, required: true },
}, {_id: false});

const AddressSchema = new mongoose.Schema({
      line: { type: String, default: null },
      zip: { type: String, default: null },
      countryCode: { type: String, default: null },
      cityName: { type: String, default: null },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      uicCode: { type: String, default: null },
}, {_id: false})


const TransferBookingSchema = new mongoose.Schema({
  orderId: { type: String, required: true },
  type: { type: String, required: true },
  start: {
    locationCode: { type: String, required: true },
    datetime: { type: String, required: true },
  },
  end: {
    googlePlaceId: { type: String, default: null },
    name: { type: String, default: null },
    locationCode: { type: String, default: null },
    address: AddressSchema,
  },
  provider: {
    name: { type: String, required: true },
    logo: { type: String, required: true },
    contacts: {
      phoneNumber: { type: String, default: null },
      email: { type: String, default: null },
    },
    vatRegistrationNumber: { type: String, default: null },
  },
  vehicle: {
    description: { type: String, required: true },
    seats: { type: Number, required: true },
    baggages: [
      {
        count: { type: Number, required: true },
        size: { type: String, required: true },
      },
    ],
    image: { type: String, default: null },
  },
  distance: {
    value: { type: Number, required: true },
    unit: { type: String, required: true },
  },
}, {_id: false});

const BillingAddressSchema = new mongoose.Schema({
  line: { type: String, required: true },
  zip: { type: String, required: true },
  countryCode: { type: String, required: true },
  cityName: { type: String, required: true },
}, {_id: false});
const BillingPaymentSchema = new mongoose.Schema({
  method: { type: String, required: true },
  cardNumber: { type: String, required: true },
  expiryDate: { type: String, required: true },
  holderName: { type: String, required: true },
  vendorCode: { type: String, required: true },
  cvv: { type: String, required: true },
}, {_id: false});

const BookingSchema = new mongoose.Schema({
  flight: FlightBookingSchema,
  hotel: HotelBookingSchema,
  transfer: {
    ah:  TransferBookingSchema,
    he:  TransferBookingSchema
  },
  timezone: { type: String, required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  price: {
    total: { type: Number, required: true },
    base: { type: Number, required: true },
    comission: { type: Number, required: true },
    currency: { type: String, required: true },
  },
  billingAddress: BillingAddressSchema,
  billingPayment: BillingPaymentSchema,
});

module.exports = mongoose.model("Booking", BookingSchema);
