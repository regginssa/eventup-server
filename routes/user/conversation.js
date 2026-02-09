const express = require("express");
const router = express.Router();
const controllers = require("../../controllers/user/conversation");

router.get("/:userId", controllers.getUserConversations);
router.delete("/:id", controllers.removeOne);

module.exports = router;
