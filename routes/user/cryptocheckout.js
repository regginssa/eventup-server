const router = require("express").Router();
const { webhook } = require("../../controllers/user/cryptocheckout");

router.post("/webhook", webhook);

module.exports = router;
