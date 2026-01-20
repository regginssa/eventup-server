const Event = require("../../models/Event");
const Booking = require("../../models/Booking");
const {
  fetchFlightOffers,
  fetchAirportLocationCodeFromCoords,
  fetchHotelsList,
  fetchHotelOffers,
  fetchTransferOffers,
  fetchFlightOffersPricing,
  createFlightOrder,
  fetchFlightOrder,
  deleteFlightOrder,
  createHotelOrder,
  createTransferOrder,
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
      fetchAirportLocationCodeFromCoords(
        eventCoords.latitude,
        eventCoords.longitude
      ),
      fetchAirportLocationCodeFromCoords(
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

    const result = await fetchFlightOffers(
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

const getFlightOffersPricing = async (req, res) => {
  try {
    const { offers } = req.body;

    const pricing = await fetchFlightOffersPricing(offers);

    res.status(200).json({ ok: true, data: pricing });
  } catch (error) {
    console.error("get flights offers pricing error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const flightOrder = async (req, res) => {
  try {
    const { offers, travelers } = req.body;

    const order = await createFlightOrder(offers, travelers);

    res.status(200).json({ ok: true, data: order });
  } catch (error) {
    console.error("flight order error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const getFlightOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await fetchFlightOrder(orderId);

    res.status(200).json({ ok: true, data: order });
  } catch (error) {
    console.error("get flight order error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const cancelFlightOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await deleteFlightOrder(orderId);

    res.status(200).json({ ok: true, data: order });
  } catch (error) {
    console.error("cancel flight order error: ", error);
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
          },
        };
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

const hotelOrder = async (req, res) => {
  try {
    const { guests, travelAgent, roomAssociations, payment } = req.body;

    const order = await createHotelOrder(
      guests,
      travelAgent,
      roomAssociations,
      payment
    );

    res.status(200).json({ ok: true, data: order });
  } catch (error) {
    console.error("hotel order error: ", error);
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
      hotelCode,
      transferType,
      hotelLeaveDateTime,
      passengers,
    } = req.query;

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

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
      passengers
    );

    data.airportToHotel = airportToHotel;

    const hotelCoordinate = hotelGeoCode.split(",").map(Number);

    const hotelLocationCode = await fetchAirportLocationCodeFromCoords(
      hotelCoordinate[0],
      hotelCoordinate[1]
    );

    console.log("hotelLocationCode: ", hotelLocationCode);

    if (hotelLocationCode) {
      const {
        name,
        city,
        postalCode,
        country_code,
        address_line1,
        coordinate,
      } = event.venue;

      // Hotel to Event
      const hotelToEvent = await fetchTransferOffers(
        hotelLocationCode,
        address_line1,
        city,
        postalCode,
        country_code,
        name,
        `${coordinate.latitude},${coordinate.longitude}`,
        transferType,
        hotelLeaveDateTime,
        passengers
      );

      data.hotelToEvent = hotelToEvent;
    }

    res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error("get transfer offers error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const transferOrder = async (req, res) => {
  try {
    const {
      offerId,
      note,
      passengers,
      agency,
      payment,
      extraServices,
      corporation,
      startConnectedSegment,
      endConnectedSegment,
    } = req.body;

    const order = await createTransferOrder(
      offerId,
      note,
      passengers,
      agency,
      payment,
      extraServices,
      corporation,
      startConnectedSegment,
      endConnectedSegment
    );

    res.status(200).json({ ok: true, data: order });
  } catch (error) {
    console.error("transfer order error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const updateBooking = async (req, res) => {
  try {
  } catch (error) {}
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
  getFlightOffersPricing,
  flightOrder,
  getFlightOrder,
  cancelFlightOrder,

  getHotelOffers,
  hotelOrder,

  getTransferOffers,
  transferOrder,

  updateBooking,
  getBooking,
  getAllBookingsByUserId,
};
