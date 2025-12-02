const express = require("express");
const {
  getCustomerId,
  getClientSecret,
  saveStripePaymentMethod,
} = require("../../controllers/user/stripe");

const router = express.Router();

router.get("/customer-id", getCustomerId);
router.get("/client-secret", getClientSecret);
router.post("/save-payment-method", saveStripePaymentMethod);

module.exports = router;
