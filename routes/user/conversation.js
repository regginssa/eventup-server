const express = require("express");
const router = express.Router();
const controllers = require("../../controllers/user/conversation");

router.get("/:userId", controllers.getUserConversations);

module.exports = router;
