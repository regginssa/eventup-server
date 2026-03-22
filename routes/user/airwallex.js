const router = require("express").Router();
const { customer, paymentIntent } = require("../../controllers/user/airwallex");

router.post("/customer", customer.create);
router.post("/payment-intent", paymentIntent.create);

module.exports = router;
