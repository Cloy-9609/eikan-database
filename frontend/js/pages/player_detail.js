import { fetchPlayerById } from "../api/playerApi.js";

async function init() {
  const player = await fetchPlayerById(1);
  console.log("player", player);
}

init();
