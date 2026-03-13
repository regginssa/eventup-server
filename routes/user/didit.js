const express = require("express");
const router = express.Router();
const { startVerification } = require("../../controllers/user/didit");

router.post("/create-session", startVerification);

module.exports = router;
