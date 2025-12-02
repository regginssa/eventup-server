const express = require("express");
const router = express.Router();
const {
  getFeeds,
  getAllEvents,
  getEvent,
} = require("../../controllers/user/event");

router.get("/feed", getFeeds);
router.get("/all", getAllEvents);
router.get("/:id", getEvent);

module.exports = router;
