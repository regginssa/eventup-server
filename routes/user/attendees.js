const express = require("express");
const router = express.Router();
const controllers = require("../../controllers/user/attendees");

router.get("/event/:eventId", controllers.getByEventId);
router.post("/", controllers.create);

module.exports = router;
