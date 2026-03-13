const express = require("express");
const router = express.Router();
const { startVerification } = require("../../controllers/user/didit");

router.get("/create-session/:id", startVerification);

module.exports = router;
