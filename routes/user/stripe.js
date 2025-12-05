const express = require("express");
const {
  getCustomerId,
  getClientSecret,
  saveStripePaymentMethod,
  createStripePaymentIntent,
  refundStripePaymentIntent,
} = require("../../controllers/user/stripe");

const router = express.Router();

router.get("/customer-id", getCustomerId);
router.get("/client-secret", getClientSecret);
router.post("/save-payment-method", saveStripePaymentMethod);
router.post("/payment-intent", createStripePaymentIntent);
router.post("/payment-refund", refundStripePaymentIntent);

module.exports = router;
