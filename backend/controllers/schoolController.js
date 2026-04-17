const schoolService = require("../services/schoolService");

async function getSchools(req, res, next) {
  try {
    const schools = await schoolService.getSchools(req.query);
    res.json({
      success: true,
      data: schools,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function getSchoolById(req, res, next) {
  try {
    const school = await schoolService.getSchoolById(req.params.id);
    res.json({
      success: true,
      data: school,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function getSchoolPlayerSeriesSummaries(req, res, next) {
  try {
    const schoolPlayerSeries = await schoolService.getSchoolPlayerSeriesSummaries(req.params.id);
    res.json({
      success: true,
      data: schoolPlayerSeries,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function createSchool(req, res, next) {
  try {
    const school = await schoolService.createSchool(req.body);
    res.status(201).json({
      success: true,
      data: school,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function updateSchool(req, res, next) {
  try {
    const school = await schoolService.updateSchool(req.params.id, req.body);
    res.json({
      success: true,
      data: school,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteSchool(req, res, next) {
  try {
    const school = await schoolService.deleteSchool(req.params.id);
    res.json({
      success: true,
      data: school,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSchools,
  getSchoolById,
  getSchoolPlayerSeriesSummaries,
  createSchool,
  updateSchool,
  deleteSchool,
};
