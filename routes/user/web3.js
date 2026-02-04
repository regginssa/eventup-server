const express = require("express");
const router = express.Router();
const controllers = require("../../controllers/user/web3");

router.get("/token-prices-fee", controllers.getTokenPricesAndFee);
router.post("/create/sell-ticket-payout", controllers.createSellTicketPayout);

module.exports = router;
