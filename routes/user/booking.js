const express = require("express");
const router = express.Router();
const {
  getStandardHotelsAvailability,
  getStandardFlightsAvailability,
  getStandardTransfersAvailability,
  getHotelDetails,
  validateFlightFare,
  bookingFlight,
  ticketFlight,
  addNewFlight,
  fetchHotelRoomRates,
  checkHotelRoomRates,
  bookingHotel,
  addNewHotel,
  updateBooking,
  getBooking,
} = require("../../controllers/user/booking");

router.post(
  "/standard-package/flights-availability/:eventId",
  getStandardFlightsAvailability
);
router.post(
  "/standard-package/hotels-availability/:eventId",
  getStandardHotelsAvailability
);

router.post(
  "/standard-package/transfers-availability/:eventId",
  getStandardTransfersAvailability
);

router.get("/hotel/:sessionId/:hotelId/:productId/:tokenId", getHotelDetails);
router.post("/flight/validate/fare", validateFlightFare);
router.post("/hotel/room-rates", fetchHotelRoomRates);
router.post("/hotel/check-room-rates", checkHotelRoomRates);
router.post("/flight", bookingFlight);
router.post("/hotel", bookingHotel);
router.post("/ticket/flight", ticketFlight);
router.post("/add/flight", addNewFlight);
router.post("/add/hotel", addNewHotel);
router.patch("/:id", updateBooking);
router.get("/:id", getBooking);

module.exports = router;
