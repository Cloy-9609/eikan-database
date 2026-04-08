const schoolModel = require("../models/schoolModel");

async function getSchools() {
  return schoolModel.findAll();
}

async function getSchoolById(id) {
  return schoolModel.findById(id);
}

module.exports = {
  getSchools,
  getSchoolById,
};
