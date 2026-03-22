const router = require("express").Router();
const { paymentIntent } = require("../../controllers/user/airwallex");

router.post("/payment-intent", paymentIntent.create);

module.exports = router;
