const express = require("express");
const router = express.Router();
const controllers = require("../../controllers/user/event");

router.get("/feed", controllers.getFeeds);
router.get("/all", controllers.getAll);
router.get("/:id", controllers.get);
router.get("/user/:userId", controllers.getByUserId);
router.post("/", controllers.create);
router.patch("/:id", controllers.update);

module.exports = router;
