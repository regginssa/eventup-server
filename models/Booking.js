const mongoose = require("mongoose");
const { Schema } = mongoose;

const FareSchema = new Schema(
  {
    Amount: { type: String, required: true },
    CurrencyCode: { type: String, required: true },
    DecimalPlaces: { type: Number, required: true },
  },
  { _id: false }
);

/* ---- Extra Services ---- */
const ExtraServiceSchema = new Schema(
  {
    NameNumber: { type: Number, required: true }, // Passenger RPH
    Behavior: String,
    CheckInType: String,
    Description: String,
    IsMandatory: Boolean,
    ServiceCost: FareSchema,
    ServiceId: String,
    Type: String,
  },
  { _id: false }
);

/* ---- Booking Notes ---- */
const BookingNoteSchema = new Schema(
  {
    NoteDetails: String,
    CreatedOn: String,
  },
  { _id: false }
);

/* ---- Passenger Details ---- */
const CustomerInfoSchema = new Schema({
  PassengerType: { type: String, required: true }, // ADT / CHD / INF
  PassengerTitle: String,
  PassengerFirstName: String,
  PassengerLastName: String,
  PassportNumber: String,
  ItemRPH: Number, // E-ticket serial number
  eTicketNumber: String,
  DateOfBirth: String,
  EmailAddress: String,
  Gender: String,
  PassengerNationality: String,
  PhoneNumber: String,
  PostCode: String,
});

/* ---- Fare Breakdown by Passenger Type ---- */
const PaxFareBreakdownSchema = new Schema(
  {
    PassengerTypeQuantity: {
      Code: String,
      Quantity: Number,
    },
    TripDetailsPassengerFare: {
      EquiFare: FareSchema,
      ServiceTax: FareSchema,
      Tax: FareSchema,
      TotalFare: FareSchema,
    },
  },
  { _id: false }
);

/* ---- Flight Segment ---- */
const ReservationItemSchema = new Schema(
  {
    AirEquipmentType: String,
    AirlinePNR: String,
    ArrivalAirportLocationCode: String,
    ArrivalDateTime: String,
    ArrivalTerminal: String,
    Baggage: String,
    CabinClassText: String,
    DepartureAirportLocationCode: String,
    DepartureDateTime: String,
    DepartureTerminal: String,
    FlightNumber: String,
    ItemRPH: Number,
    JourneyDuration: String,
    MarketingAirlineCode: String,
    NumberInParty: Number,
    OperatingAirlineCode: String,
    ResBookDesigCode: String,
    StopQuantity: Number,
  },
  { _id: false }
);

/* ---- Itinerary Info ---- */
const ItineraryInfoSchema = new Schema(
  {
    CustomerInfos: [{ CustomerInfo: CustomerInfoSchema }],
    ItineraryPricing: {
      EquiFare: FareSchema,
      ServiceTax: FareSchema,
      Tax: FareSchema,
      TotalFare: FareSchema,
    },
    ReservationItems: [{ ReservationItem: ReservationItemSchema }],
    TripDetailsPTC_FareBreakdowns: [
      { TripDetailsPTC_FareBreakdown: PaxFareBreakdownSchema },
    ],
    ExtraServices: {
      Services: [{ Service: ExtraServiceSchema }],
    },
    BookingNotes: [BookingNoteSchema],
  },
  { _id: false }
);

/* ---- Travel Itinerary ---- */
const TravelItinerarySchema = new Schema(
  {
    BookingStatus: String,
    CrossBorderIndicator: Boolean,
    Destination: String,
    FareType: String,
    IsCommissionable: Boolean,
    IsMOFare: Boolean,
    Origin: String,
    TicketStatus: String,
    UniqueID: String,
    ItineraryInfo: ItineraryInfoSchema,
  },
  { _id: false }
);

/* ---- Main Schema ---- */
const TripDetailsSchema = new Schema(
  {
    Success: { type: Boolean, required: true },
    Target: { type: String, required: true },
    TravelItinerary: TravelItinerarySchema,
    sessionId: { type: String, default: null },
    fareSourceCode: { type: String, default: null },
    tktTimeLimit: { type: Date, default: Date.now },
  },
  { _id: false, timestamps: true }
);

// hotel
const PaxDetailsSchema = new Schema(
  {
    name: [String],
  },
  { _id: false }
);

const RoomSchema = new Schema(
  {
    name: { type: String },
    description: { type: String },
    boardType: { type: String }, // raw value: "BED AND BREAKFAST|t|ROOM ONLY"
    paxDetails: PaxDetailsSchema,
  },
  { _id: false }
);

const HotelBookingDetailsSchema = new Schema(
  {
    hotelId: { type: String, required: true },
    hotelName: { type: String },
    address: { type: String },
    latitude: { type: String },
    longitude: { type: String },
    postalCode: { type: String },
    email: { type: String },
    phone: { type: String },
    image: { type: String, default: null },
    city: { type: String },
    country: { type: String },
    rating: { type: String },

    checkIn: { type: Date },
    checkOut: { type: Date },
    days: { type: Number },

    currency: { type: String },
    NetPrice: { type: Number },
    fareType: { type: String },
    cancellationPolicy: { type: String },

    cancelReferenceNum: { type: String, default: null },
    customerEmail: { type: String, default: null },
    customerPhone: { type: String },

    bookingDateTime: { type: Date },

    rooms: [RoomSchema],
  },
  { _id: false }
);

const HotelSchema = new Schema(
  {
    roomBookDetails: HotelBookingDetailsSchema,
    supplierConfirmationNum: String,
    referenceNum: String,
    clientRefNum: String,
    productId: String,
    sessionId: String,
  },
  { _id: false, timestamps: true }
);

const BookingSchema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event",
    required: true,
  },
  type: { type: String, enum: ["standard", "gold"], default: "standard" },
  flight: TripDetailsSchema,
  hotel: HotelSchema,
});

module.exports = mongoose.model("Booking", BookingSchema);
