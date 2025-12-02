const express = require("express");
const router = express.Router();
const {
  diditWebhook,
  startVerification,
} = require("../../controllers/user/didit");

router.post("/webhook", diditWebhook);
router.get("/create-session/:id", startVerification);

module.exports = router;
