const router = require("express").Router();
const { createPaymentIntents } = require("../../controllers/user/duffel");

router.post("/payment-intents", createPaymentIntents);

module.exports = router;
