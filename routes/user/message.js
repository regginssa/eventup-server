const express = require("express");
const router = express.Router();
const controllers = require("../../controllers/user/message");

router.get("/:conversationId", controllers.getConversationMessages);
router.post("/:conversationId/seen", controllers.markSeen);

module.exports = router;
