const express = require("express");
const controller = require("../controllers/playerController");

const router = express.Router();

router.get("/:id", controller.getPlayerSeriesById);
router.post("/:id/snapshots", controller.addSnapshotToSeries);

module.exports = router;
