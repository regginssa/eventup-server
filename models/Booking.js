const mongoose = require("mongoose");

const FlightBookingSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    associatedRecord: {
      reference: { type: String, required: true }, // PNR
      originSystemCode: { type: String, default: null },
    },
    validatingAirline: { type: String, required: true },
    status: { type: String, default: null },
    price: {
      total: { type: Number, default: 0 },
      currency: { type: String, required: true },
    },
    travelers: [
      {
        id: { type: String, required: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
      },
    ],
    itineraries: {
      segments: [
        {
          departure: {
            airport: { type: String, required: true },
            datetime: { type: String, required: true },
          },
          arrival: {
            airport: { type: String, required: true },
            datetime: { type: String, required: true },
          },
          marketingCarrier: { type: String, default: null },
          operatingCarrier: { type: String, default: null },
          flightNumber: { type: String, required: true },
          cabin: { type: String, required: true },
          baggage: {
            quantity: { type: Number, default: 0 },
            weight: { type: Number, default: 0 },
            unit: { type: String, default: null },
          },
        },
      ],
    },
  },
  { _id: false }
);

const HotelBookingSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    status: { type: String, required: true },
    hotel: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      image: { type: String, default: null },
    },
    checkIn: { type: String, required: true },
    checkOut: { type: String, required: true },
    rooms: [
      {
        bookingId: { type: String, required: true },
        providerCode: { type: String, required: true },
        confirmationNumber: { type: String, required: true },
        roomType: { type: String, required: true },
        rateCode: { type: String, default: null },
      },
    ],
    price: {
      total: { type: Number, default: 0 },
      currency: { type: String, required: true },
    },
    guests: [
      {
        id: { type: Number, required: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
      },
    ],
    associatedRecord: {
      reference: { type: String, required: true },
      originSystemCode: { type: String, default: null },
    },
  },
  { _id: false }
);

const AddressSchema = new mongoose.Schema(
  {
    line: { type: String, default: null },
    zip: { type: String, default: null },
    countryCode: { type: String, default: null },
    cityName: { type: String, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    uicCode: { type: String, default: null },
  },
  { _id: false }
);

const TransferBookingSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    reference: { type: String, required: true },
    status: { type: String, default: null },
    confirmationNumber: { type: String, required: true },
    transferType: { type: String, required: true },
    start: {
      dateTime: { type: String, required: true },
      locationCode: { type: String, default: null },
      address: AddressSchema,
    },
    end: {
      name: { type: String, default: null },
      googlePlaceId: { type: String, default: null },
      locationCode: { type: String, default: null },
      address: AddressSchema,
    },
    provider: {
      code: { type: String, required: true },
      name: { type: String, required: true },
      logo: { type: String, default: null },
      contacts: {
        phoneNumber: { type: String, default: null },
        email: { type: String, default: null },
      },
      vatRegistrationNumber: { type: String, default: null },
    },
    vehicle: {
      code: { type: String, required: true },
      description: { type: String, default: null },
      category: { type: String, default: null },
      seats: { type: Number, default: 0 },
      baggages: [
        {
          count: { type: Number, default: 0 },
          size: { type: String, default: null },
        },
      ],
      imageUrl: { type: String, default: null },
    },
    distance: {
      value: { type: Number, default: 0 },
      unit: { type: String, default: null },
    },
    price: {
      total: { type: Number, default: 0 },
      currency: { type: String, required: true },
    },
    cancellationRules: [
      {
        feeType: { type: String, default: null },
        feeValue: { type: String, default: null },
        metricType: { type: String, default: null },
        metricMin: { type: String, default: null },
        metricMax: { type: String, default: null },
      },
    ],

    passengers: [
      {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        phone: { type: String, default: null },
        email: { type: String, default: null },
      },
    ],
  },
  { _id: false }
);

const BillingAddressSchema = new mongoose.Schema(
  {
    line: { type: String, required: true },
    zip: { type: String, required: true },
    countryCode: { type: String, required: true },
    cityName: { type: String, required: true },
  },
  { _id: false }
);

const BillingPaymentSchema = new mongoose.Schema(
  {
    method: { type: String, required: true },
    cardNumber: { type: String, required: true },
    expiryDate: { type: String, required: true },
    holderName: { type: String, required: true },
    vendorCode: { type: String, required: true },
    cvv: { type: String, required: true },
  },
  { _id: false }
);

const BookingSchema = new mongoose.Schema({
  flight: FlightBookingSchema,
  hotel: HotelBookingSchema,
  transfer: {
    ah: TransferBookingSchema,
    he: TransferBookingSchema,
  },
  timezone: { type: String, required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  price: {
    total: { type: Number, default: 0 },
    base: { type: Number, default: 0 },
    comission: { type: Number, default: 0 },
    currency: { type: String, required: true },
  },
  billingAddress: BillingAddressSchema,
  billingPayment: BillingPaymentSchema,
});

module.exports = mongoose.model("Booking", BookingSchema);
