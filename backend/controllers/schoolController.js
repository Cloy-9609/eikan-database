const schoolService = require("../services/schoolService");

async function getSchools(req, res, next) {
  try {
    const schools = await schoolService.getSchools();
    res.json(schools);
  } catch (error) {
    next(error);
  }
}

async function getSchoolById(req, res, next) {
  try {
    const school = await schoolService.getSchoolById(req.params.id);
    res.json(school);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSchools,
  getSchoolById,
};
