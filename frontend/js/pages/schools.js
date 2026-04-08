import { fetchSchools } from "../api/schoolApi.js";

async function init() {
  const schools = await fetchSchools();
  console.log("schools", schools);
}

init();
