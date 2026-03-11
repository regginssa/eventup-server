const router = require("express").Router();
const { verify } = require("../../controllers/user/iap");

router.post("/verify", verify);

module.exports = router;
