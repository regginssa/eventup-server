const express = require("express");
const router = express.Router();
const controllers = require("../../controllers/user/conversation");

router.get("/:userId", controllers.getUserConversations);
router.post("/", controllers.create);
router.patch("/:id", controllers.update);
router.delete("/:id/me", controllers.removeForMe);
router.delete("/:id/all", controllers.removeForAll);
module.exports = router;
