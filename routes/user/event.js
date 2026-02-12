const express = require("express");
const router = express.Router();
const controllers = require("../../controllers/user/event");

router.get("/feed", controllers.getFeeds);
router.get("/all", controllers.getAllEvents);
router.get("/:id", controllers.getEvent);
router.get("/user/:userId", controllers.getEventsByUser);
router.post("/", controllers.create);
router.patch("/", controllers.update);

module.exports = router;
