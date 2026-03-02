const router = require("express").Router();
const controllers = require("../../controllers/user/flights");

router.get("/", controllers.get);
router.post("/", controllers.book);

module.exports = router;
