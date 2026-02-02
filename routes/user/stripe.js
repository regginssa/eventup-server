const express = require("express");
const controller = require("../../controllers/user/stripe");
const bodyParser = require("body-parser");

const router = express.Router();

router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  controller.webhook,
);
router.get("/customer-id", controller.getCustomerId);
router.get("/client-secret", controller.getClientSecret);
router.post("/save-payment-method", controller.saveStripePaymentMethod);
router.post("/payment-intent", controller.createStripePaymentIntent);
router.post("/payment-refund", controller.refundStripePaymentIntent);

module.exports = router;
