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
} = require("../../services/travelopro");
const { formatDate } = require("../../utils/format");

const getStandardFlightsAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { departureDate, adults, childs, infants } = req.body.flight;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, message: "Unauthorized" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ ok: false, message: "Event not found" });
    }

    const airportOrigins = user.nearest_airports;
    if (!airportOrigins || airportOrigins.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "No nearest airports found for user",
      });
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

    let flights = [];
    let flightSessionId = null;

    // Find the cheapest flight among all nearest airports
    for (const airportOrigin of airportOrigins) {
      const result = await fetchFlightAvailability(
        "standard",
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

    let cheapestFlight = null;

    if (flights.length > 0) {
      cheapestFlight = getCheapestFlight(flights);
    }

    res.status(200).json({
      ok: true,
      data: {
        session_id: flightSessionId,
        availabilities: flights,
        recommend: cheapestFlight,
      },
    });
  } catch (error) {
    console.error("get standard flight availability error: ", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
};

const getStandardHotelsAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { occupancy, checkin, checkout } = req.body;

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

const getStandardTransfersAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { ahTransfer, heTransfer } = req.body;

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
      const {
        airportCode,
        adults,
        childs,
        infants,
        hotel,
        arrivalDate,
        departureDate,
      } = ahTransfer;

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
            departureDate,
            "price-low-high"
          );

          console.log("Event coords: ", event.coordinate);
          console.log("user nearest airports: ", user.nearest_airports);

          console.log("destination airport: ", airportCoords);

          console.log(
            "event hotel coords: ",
            hotelDetail.latitude,
            hotelDetail.longitude
          );
          console.log("airport - hotel transfer result: ", result);
        }
      }
    }

    if (heTransfer) {
      const { hotel, adults, childs, infants, departureDate, arrivalDate } =
        heTransfer;

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
          departureDate,
          "price-low-high"
        );

        console.log("hotel - event transfer result: ", result);
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

    console.log("trip details: ", result);

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

module.exports = {
  getStandardFlightsAvailability,
  getStandardHotelsAvailability,
  getStandardTransfersAvailability,
  getHotelDetails,
  validateFlightFare,
  bookingFlight,
  ticketFlight,
  addNewFlight,
};
