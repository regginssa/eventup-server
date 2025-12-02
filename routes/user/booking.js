const express = require("express");
const router = express.Router();
const {
  getStandardHotelsAvailability,
  getStandardFlightsAvailability,
  getStandardTransfersAvailability,
  getHotelDetails,
  validateFlightFare,
  bookingFlight,
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
router.post("/flight", bookingFlight);

module.exports = router;
