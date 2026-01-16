const express = require("express");
const router = express.Router();
const {
  // getFlightsAvailability,
  // getHotelsAvailability,
  // getTransfersAvailability,
  // getHotelDetails,
  // validateFlightFare,
  // bookingFlight,
  // ticketFlight,
  // addNewFlight,
  // fetchHotelRoomRates,
  // checkHotelRoomRates,
  // bookingHotel,
  // addNewHotel,
  getFlightOffers,
  getHotelOffers,
  updateBooking,
  getBooking,
  getAllBookingsByUserId,
  getTransferOffers,
} = require("../../controllers/user/booking");

router.get("/flight-offers", getFlightOffers);
router.get("/hotel-offers", getHotelOffers);
router.get("/transfer-offers", getTransferOffers);

// router.post("/flights-availability/:eventId", getFlightsAvailability);
// router.post("/hotels-availability/:eventId", getHotelsAvailability);

// router.post("/transfers-availability/:eventId", getTransfersAvailability);

// router.get("/hotel/:sessionId/:hotelId/:productId/:tokenId", getHotelDetails);
// router.post("/flight/validate/fare", validateFlightFare);
// router.post("/hotel/room-rates", fetchHotelRoomRates);
// router.post("/hotel/check-room-rates", checkHotelRoomRates);
// router.post("/flight", bookingFlight);
// router.post("/hotel", bookingHotel);
// router.post("/ticket/flight", ticketFlight);
// router.post("/add/flight", addNewFlight);
// router.post("/add/hotel", addNewHotel);
router.patch("/:id", updateBooking);
router.get("/:id", getBooking);
router.get("/all/:userId", getAllBookingsByUserId);

module.exports = router;
