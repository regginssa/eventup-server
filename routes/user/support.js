const router = require("express").Router();
const controllers = require("../../controllers/user/support");

router.post("/send-message", controllers.sendMessageToSupport);

module.exports = router;
