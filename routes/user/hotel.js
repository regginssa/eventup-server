const router = require("express").Router();
const controllers = require("../../controllers/user/hotel");

router.get("/", controllers.get);
router.get("/checkrates", controllers.checkRates);
router.post("/", controllers.book);

module.exports = router;
