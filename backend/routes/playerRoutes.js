const express = require("express");
const controller = require("../controllers/playerController");

const router = express.Router();

router.post("/", controller.createPlayer);

module.exports = router;
