const express = require("express");
const controller = require("../controllers/schoolController");

const router = express.Router();

router.get("/", controller.getSchools);
router.get("/:id/player-series", controller.getSchoolPlayerSeriesSummaries);
router.get("/:id", controller.getSchoolById);
router.post("/", controller.createSchool);
router.post("/:id/progress-year", controller.progressSchoolYear);
router.post("/:id/progress-year/undo", controller.undoSchoolYearProgression);
router.patch("/:id", controller.updateSchool);
router.delete("/:id", controller.deleteSchool);

module.exports = router;
