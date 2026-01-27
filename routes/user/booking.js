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
  hotelOrder,
  transferOrder,
  getHotelOfferPricing,
  createBooking,
} = require("../../controllers/user/booking");

// ------------ Flight Booking Engine ------------
router.get("/flight-offers", getFlightOffers);
router.post("/flight-offers-pricing", getFlightOffersPricing);
router.post("/flight-order", flightOrder);
router.get("/flight-order/:orderId", getFlightOrder);
router.delete("/flight-order/:orderId", cancelFlightOrder);

// ------------ Hotel Booking Engine ------------
router.get("/hotel-offers", getHotelOffers);
router.get("/hotel-offer-pricing/:offerId", getHotelOfferPricing);
router.post("/hotel-order", hotelOrder);

// ------------ Transfer Booking Engine ------------
router.get("/transfer-offers", getTransferOffers);
router.post("/transfer-order", transferOrder);

// ------------ Booking Engine ------------
router.get("/:id", getBooking);
router.get("/all/:userId", getAllBookingsByUserId);
router.post("/create", createBooking);
router.patch("/:id", updateBooking);

module.exports = router;
