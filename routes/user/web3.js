const express = require("express");
const router = express.Router();
const controllers = require("../../controllers/user/web3");

router.get("/prices", controllers.getPrices);
router.post("/checkout-url", controllers.getCheckoutUrl);
router.get("/token-prices-fee", controllers.getTokenPricesAndFee);
router.post("/create/sell-ticket-payout", controllers.createSellTicketPayout);

module.exports = router;
