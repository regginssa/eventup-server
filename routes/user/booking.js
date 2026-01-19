const express = require("express");
const router = express.Router();
const {
  getFlightOffers,
  getHotelOffers,
  updateBooking,
  getBooking,
  getAllBookingsByUserId,
  getTransferOffers,
  getFlightOffersPricing,
  flightOrder,
  getFlightOrder,
  cancelFlightOrder,
} = require("../../controllers/user/booking");


// ------------ Flight Booking Engine ------------
router.get("/flight-offers", getFlightOffers);
router.post("/flight-offers-pricing", getFlightOffersPricing);
router.post("/flight-order", flightOrder);
router.get("/flight-order/:orderId", getFlightOrder);
router.delete("/flight-order/:orderId", cancelFlightOrder);

// ------------ Hotel Booking Engine ------------
router.get("/hotel-offers", getHotelOffers);

// ------------ Transfer Booking Engine ------------
router.get("/transfer-offers", getTransferOffers);

// ------------ Booking Engine ------------
router.patch("/:id", updateBooking);
router.get("/:id", getBooking);
router.get("/all/:userId", getAllBookingsByUserId);

module.exports = router;
