const User = require("../../models/User");
const Event = require("../../models/Event");
const Booking = require("../../models/Booking");
const {
  findNearestAirport,
  getAirportByIATA,
} = require("../../utils/airports");
const {
  fetchFlightAvailability,
  fetchHotelAvailability,
  getCheapestFlight,
  getCheapestMidRangeHotel,
  fetchTransfersAvailability,
  fetchHotelDetails,
  validateFlightFareMethod,
  flightBookingMethod,
  flightTicketOrderMethod,
  fetchFlightTripDetails,
  fetchRoomRates,
  checkRoomRates,
  hotelBookingMethod,
  fetchHotelBookingDetails,
  getMostExpensiveFlight,
} = require("../../services/travelopro");
const { formatDate } = require("../../utils/format");

const getFlightsAvailability = async (req, res) => {
  try {
    const { eventId } = req.params;
    const {
      departureDate,
      adults,
      childs,
      infants,
      airports: airportOrigins,
      packageType,
    } = req.body.flight;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const { coordinate: eventCoords } = event;
    const airportDestination = findNearestAirport(
      eventCoords.latitude,
      eventCoords.longitude
    );

    if (!airportDestination) {
      return res.status(400).json({
        ok: false,
        message: "Could not determine nearest destination airport",
      });
    }

    console.log("package type: ", packageType);

    let flights = [];
    let flightSessionId = null;

    // Find the cheapest flight among all nearest airports
    for (const airportOrigin of airportOrigins) {
      const result = await fetchFlightAvailability(
        packageType,
        airportOrigin.iata,
        airportDestination.iata,
        formatDate(new Date(departureDate)),
        adults,
        childs,
        infants,
        "USD"
      );

      flights = result.flights;
      flightSessionId = result.session_id;

      if (flights.length > 0) break;

      // 🔹 Delay 300–800 ms between calls (adjust as needed)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 500 + 300)
      );
    }

    let recommend = null;

    if (flights.length > 0) {
      if (packageType === "standard") {
        recommend = getCheapestFlight(flights);
      } else {
        recommend = getMostExpensiveFlight(flights);
      }
    }

    res.status(200).json({
      ok: true,
      data: {
        session_id: flightSessionId,
        availabilities: flights,
        recommend,
      },
    });
  } catch (error) {
    console.error("get standard flight availability error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const getHotelsAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { occupancy, checkin, checkout, packageType } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: "Unauthorized" });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const { coordinate: eventCoords } = event;

    const hotelResult = await fetchHotelAvailability(
      "USD",
      user.location.country_code,
      formatDate(new Date(checkin)),
      formatDate(new Date(checkout)),
      eventCoords.latitude,
      eventCoords.longitude,
      event.venue.city,
      event.venue.country,
      20,
      30,
      occupancy
    );

    let cheapestHotel = null;
    const hotels = hotelResult.hotels;
    const hotelSessionId = hotelResult.session_id;

    if (hotels.length > 0) {
      cheapestHotel = getCheapestMidRangeHotel(hotels);
    }

    res.status(200).json({
      ok: true,
      data: {
        session_id: hotelSessionId,
        availabilities: hotels,
        recommend: cheapestHotel,
      },
      transportation: null,
    });
  } catch (error) {
    console.error("get standard hotels availability error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const getTransfersAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { ahTransfer, heTransfer, packageType } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: "Unauthorized" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    let data = null;

    if (ahTransfer) {
      const { airportCode, adults, childs, infants, hotel, arrivalDate } =
        ahTransfer;

      const airportCoords = getAirportByIATA(airportCode);

      if (airportCoords) {
        const hotelDetail = await fetchHotelDetails(hotel);

        if (hotelDetail) {
          const result = await fetchTransfersAvailability(
            "USD",
            adults,
            childs,
            infants,
            airportCoords.latitude,
            airportCoords.longitude,
            hotelDetail.latitude,
            hotelDetail.longitude,
            arrivalDate,
            "AP",
            "AC",
            "price-low-high"
          );
          data = { ah: result };
        }
      }
    }

    if (heTransfer) {
      const {
        hotel,
        adults,
        childs,
        infants,
        arrivalDate,
        pickupDate,
        pickupTime,
      } = heTransfer;

      const hotelDetail = await fetchHotelDetails(hotel);

      if (hotelDetail) {
        const result = await fetchTransfersAvailability(
          "USD",
          adults,
          childs,
          infants,
          hotelDetail.latitude,
          hotelDetail.longitude,
          event.coordinate.latitude,
          event.coordinate.longitude,
          arrivalDate,
          "AC",
          "AC",
          "price-low-high",
          pickupDate,
          pickupTime
        );

        data = { ...data, he: result };
      }
    }

    res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error("get standard transfers availability error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const getHotelDetails = async (req, res) => {
  try {
    const { sessionId, hotelId, productId, tokenId } = req.params;

    const result = await fetchHotelDetails({
      sessionId,
      hotelId,
      productId,
      tokenId,
    });

    res.status(200).json({ ok: true, data: result });
  } catch (error) {
    console.error("get hotel details error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const validateFlightFare = async (req, res) => {
  try {
    const { session_id, fare_source_code } = req.body;

    const result = await validateFlightFareMethod(session_id, fare_source_code);

    if (!result) {
      return res
        .status(400)
        .json({ ok: false, message: "Your Flight is not available" });
    }

    res.status(200).json({ ok: true, data: result });
  } catch (error) {
    console.error("validate flight fare method: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const fetchHotelRoomRates = async (req, res) => {
  const { sessionId, productId, tokenId, hotelId } = req.body;

  const result = await fetchRoomRates(sessionId, productId, tokenId, hotelId);

  if (!result) {
    return res
      .status(400)
      .json({ ok: false, message: "Failed to fetch room rates" });
  }

  res.status(200).json({ ok: true, data: result });
};

const checkHotelRoomRates = async (req, res) => {
  try {
    const { sessionId, productId, tokenId, rateBasisId } = req.body;

    const result = await checkRoomRates(
      sessionId,
      productId,
      tokenId,
      rateBasisId
    );

    if (!result) {
      return res
        .status(500)
        .json({ ok: false, message: "Failed to fetch room rates" });
    }

    res.status(200).json({ ok: true, data: result });
  } catch (error) {
    console.error("check hotel room rates error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

// booking controllers ----------------------------------------------------------------
const bookingFlight = async (req, res) => {
  try {
    const { payload } = req.body;
    const result = await flightBookingMethod(payload);
    res.status(200).json({ ok: true, data: result });
  } catch (error) {
    console.error("booking flight error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const bookingHotel = async (req, res) => {
  try {
    const { payload } = req.body;

    const result = await hotelBookingMethod(payload);

    res.status(200).json({ ok: true, data: result });
  } catch (error) {
    console.error("booking hotel error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

// Ticket controllers ------------------------------------------------------------------
const ticketFlight = async (req, res) => {
  try {
    const { uniqueId } = req.body;

    const result = await flightTicketOrderMethod(uniqueId);

    res.status(200).json({ ok: true, data: result });
  } catch (error) {
    console.error("ticket flight error: ", error);
    res.status(500).json({ ok: false, message: "Interal server error" });
  }
};

const addNewFlight = async (req, res) => {
  try {
    const {
      sessionId,
      uniqueId,
      fareSourceCode,
      tktTimeLimit,
      userId,
      eventId,
    } = req.body;

    const result = await fetchFlightTripDetails(uniqueId);

    if (!result) {
      return res.status(400).json({ ok: false, message: result });
    }

    const newBooking = await Booking.create({
      flight: {
        ...result,
        sessionId,
        fareSourceCode,
        tktTimeLimit,
      },
      userId,
      eventId,
    });

    res.status(200).json({ ok: true, data: newBooking });
  } catch (error) {
    console.error("add new flight error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const addNewHotel = async (req, res) => {
  try {
    const {
      supplierConfirmationNum,
      referenceNum,
      sessionId,
      userId,
      eventId,
      type,
      bookingId,
    } = req.body;

    const result = await fetchHotelBookingDetails(
      supplierConfirmationNum,
      referenceNum
    );

    if (!result) {
      return res
        .status(400)
        .json({ ok: false, message: "Booking information is incorrect" });
    }

    if (bookingId) {
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        return res
          .status(404)
          .json({ ok: false, message: "Booking data not found" });
      }

      booking.hotel = {
        ...result,
        sessionId,
      };

      await booking.save();

      return res.status(200).json({ ok: true, data: booking });
    }

    const newBooking = await Booking.create({
      hotel: {
        ...result,
        sessionId,
      },
      userId,
      eventId,
      type,
    });

    res.status(200).json({ ok: true, data: newBooking });
  } catch (error) {
    console.error("add new hotel error: ", error);
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

module.exports = {
  getFlightsAvailability,
  getHotelsAvailability,
  getTransfersAvailability,
  getHotelDetails,
  validateFlightFare,
  fetchHotelRoomRates,
  checkHotelRoomRates,
  bookingFlight,
  bookingHotel,
  ticketFlight,
  addNewFlight,
  addNewHotel,
  updateBooking,
  getBooking,
};
