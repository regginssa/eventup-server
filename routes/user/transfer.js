const router = require("express").Router();
const controllers = require("../../controllers/user/transfer");

router.post("/search", controllers.get);
router.post("/book", controllers.book);

module.exports = router;
