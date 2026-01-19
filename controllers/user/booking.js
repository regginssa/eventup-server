const Event = require("../../models/Event");
const Booking = require("../../models/Booking");
const {
  fetchFlightOfferSearch,
  fetchLocationCodeFromCoords,
  fetchHotelsList,
  fetchHotelOffers,
  fetchTransferOffers,
  fetchPointOfInterest,
} = require("../../services/amadeus");

//----------------- Flight Booking Engine -----------------
const getFlightOffers = async (req, res) => {
  try {
    const {
      type,
      eventId,
      originLocationCoordsLatitude,
      originLocationCoordsLongitude,
      departureDate,
      adults,
    } = req.query;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const { coordinate: eventCoords } = event;

    // Get location codes from coordinates using Amadeus API
    // This will return airport/city IATA codes that Amadeus accepts
    const [destinationLocationCode, originLocationCode] = await Promise.all([
      fetchLocationCodeFromCoords(eventCoords.latitude, eventCoords.longitude),
      fetchLocationCodeFromCoords(
        originLocationCoordsLatitude,
        originLocationCoordsLongitude
      ),
    ]);

    if (!destinationLocationCode) {
      return res.status(400).json({
        ok: false,
        message: "Could not determine destination location code",
      });
    }

    if (!originLocationCode) {
      return res.status(400).json({
        ok: false,
        message: "Could not determine origin location code",
      });
    }

    const result = await fetchFlightOfferSearch(
      type,
      originLocationCode,
      destinationLocationCode,
      departureDate,
      adults
    );

    res.status(200).json({
      ok: true,
      data: result,
    });
  } catch (error) {
    console.error("get flights offer search error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

//----------------- Hotel Booking Engine -----------------
const getHotelOffers = async (req, res) => {
  try {
    const { eventId, checkInDate, checkOutDate, adults, roomQuantity, type } =
      req.query;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const { coordinate: eventCoords } = event;

    const list = await fetchHotelsList(
      eventCoords.latitude,
      eventCoords.longitude,
      checkInDate,
      checkOutDate,
      adults,
      roomQuantity
    );

    if (list.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "No hotels found",
      });
    }

    // Sort hotels by distance.value in ascending order and select the closest 5
    // Amadeus API returns hotelId, not id
    const hotelIds = list
      .sort((a, b) => a.distance.value - b.distance.value)
      .slice(0, 10)
      .map((hotel) => hotel.hotelId)
      .filter((id) => id) // Filter out any undefined/null values
      .join(",");

    if (hotelIds.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "No hotels found",
      });
    }

    const offers = await fetchHotelOffers(
      hotelIds,
      checkInDate,
      checkOutDate,
      adults,
      roomQuantity,
      "USD",
      type
    );

    if (offers.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "No hotel offers found",
      });
    }

    const mappedOffers = offers.map((offer) => {
      let hotel = list.find((h) => h.hotelId === offer.hotel.hotelId);

      if (hotel) {
        return {
          ...offer,
          hotel: {
            ...offer.hotel,
            address: hotel.address,
          }
        }
      }
    });

    console.log("mapped offers length: ", mappedOffers.length, mappedOffers[0]);

    let data = [];

    if (type == "standard") {
      data = mappedOffers
        .slice()
        .sort(
          (a, b) =>
            parseFloat(a.offers[0].price.total) -
            parseFloat(b.offers[0].price.total)
        );
    } else {
      data = mappedOffers
        .filter((o) => o.offers[0].rating >= 4)
        .sort(
          (a, b) =>
            parseFloat(b.offers[0].price.total) -
            parseFloat(a.offers[0].price.total)
        );
    }

    res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error("get hotel offers error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

//----------------- Transfer Booking Engine -----------------
const getTransferOffers = async (req, res) => {
  try {
    const {
      eventId,
      airportCode,
      airportLeaveDateTime,
      hotelAddressLine,
      hotelCityName,
      hotelZipCode,
      hotelCountryCode,
      hotelName,
      hotelGeoCode,
      transferType,
      hotelLeaveDateTime,
      passengers,
    } = req.query;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const { coordinate: eventCoords } = event;

    let data = {
      airportToHotel: [],
      hotelToEvent: [],
    };

    // Airport to Hotel
    const airportToHotel = await fetchTransferOffers(
      airportCode,
      hotelAddressLine,
      hotelCityName,
      hotelZipCode,
      hotelCountryCode,
      hotelName,
      hotelGeoCode,
      transferType,
      airportLeaveDateTime,
      passengers,
    );

    data.airportToHotel = airportToHotel;

    console.log("airportToHotel: ", airportToHotel);

    res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error("get transfer offers error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const updateBooking = async (req, res) => {
  try {
  } catch (error) { }
};

const getBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    res.status(200).json({ ok: true, data: booking });
  } catch (error) {
    console.error("get booking error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const getAllBookingsByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const bookings = await Booking.find({ userId }).populate({
      path: "eventId",
      as: "event",
    });

    res.status(200).json({ ok: true, data: bookings });
  } catch (error) {
    console.error("get all bookings by user id error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

module.exports = {
  getFlightOffers,
  getHotelOffers,
  getTransferOffers,
  updateBooking,
  getBooking,
  getAllBookingsByUserId,
};
