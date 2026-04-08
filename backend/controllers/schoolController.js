const schoolService = require("../services/schoolService");

async function getSchools(req, res, next) {
  try {
    const schools = await schoolService.getSchools();
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
  createSchool,
  updateSchool,
  deleteSchool,
};
