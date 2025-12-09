const express = require("express");
const router = express.Router();
const { getNearestAirports } = require("../../controllers/user/airports");

router.post("/nearest-multiple", getNearestAirports);

module.exports = router;
