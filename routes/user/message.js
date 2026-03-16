const express = require("express");
const router = express.Router();
const controllers = require("../../controllers/user/message");

router.get("/:conversationId", controllers.getConversationMessages);
router.patch("/seen", controllers.markSeen);

router.patch("/:id", controllers.update);
router.delete("/:id", controllers.removeOne);
router.post("/many", controllers.removeMany);

module.exports = router;
