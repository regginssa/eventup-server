const express = require("express");
const router = express.Router();
const {
  getFeeds,
  getAllEvents,
  getEvent,
  createEvent,
} = require("../../controllers/user/event");

router.get("/feed", getFeeds);
router.get("/all", getAllEvents);
router.get("/:id", getEvent);

router.post("/create", createEvent);

module.exports = router;
