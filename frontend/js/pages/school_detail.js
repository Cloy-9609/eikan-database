import { fetchSchoolById } from "../api/schoolApi.js";

async function init() {
  const school = await fetchSchoolById(1);
  console.log("school", school);
}

init();
