const express = require("express");
const router = express.Router();
const {
  updateUserNearestAirports,
} = require("../../controllers/user/airports");

router.patch("/multiple", updateUserNearestAirports);

module.exports = router;
