const express = require("express");
const router = express.Router();
const multer = require("multer");
const controllers = require("../../controllers/user/upload");

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post("/", upload.single("file"), controllers.upload);

module.exports = router;
