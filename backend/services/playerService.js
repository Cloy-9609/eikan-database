const playerModel = require("../models/playerModel");

async function getPlayers() {
  return playerModel.findAll();
}

async function getPlayerById(id) {
  return playerModel.findById(id);
}

module.exports = {
  getPlayers,
  getPlayerById,
};
