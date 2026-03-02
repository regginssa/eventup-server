const router = require("express").Router();
const controllers = require("../../controllers/user/flight");

router.get("/", controllers.get);
router.post("/", controllers.book);

module.exports = router;
