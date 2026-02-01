const express = require("express");
const router = express.Router();
const controller = require("../../controllers/user/event");

router.get("/feed", controller.getFeeds);
router.get("/all", controller.getAllEvents);
router.get("/:id", controller.getEvent);
router.get("/user/:userId", controller.getEventsByUser);
router.post("/create", controller.createEvent);

module.exports = router;
