const express = require("express");
const controller = require("../../controllers/user/stripe");

const router = express.Router();

router.get("/customer-id", controller.getCustomerId);
router.get("/client-secret", controller.getClientSecret);
router.post("/save-payment-method", controller.saveStripePaymentMethod);
router.post("/payment-intent", controller.createStripePaymentIntent);
router.post(
  "/capture-payment-intent",
  controller.createStripeCapturePaymentIntent,
);
router.post("/payment-refund", controller.refundStripePaymentIntent);

module.exports = router;
