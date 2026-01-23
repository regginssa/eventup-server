const express = require("express");
const router = express.Router();
const {
  getFeeds,
  getAllEvents,
  getEvent,
  createEvent,
  getEventsByUser,
} = require("../../controllers/user/event");

router.get("/feed", getFeeds);
router.get("/all", getAllEvents);
router.get("/:id", getEvent);
router.get("/user/:userId", getEventsByUser);

router.post("/create", createEvent);

module.exports = router;
