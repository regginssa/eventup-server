const router = require("express").Router();
const controllers = require("../../controllers/user/airwallex");

router.post("/payment-intent", controllers.createPaymentIntent);

module.exports = router;
