const playerService = require("../services/playerService");

async function getPlayers(req, res, next) {
  try {
    const players = await playerService.getPlayers();
    res.json(players);
  } catch (error) {
    next(error);
  }
}

async function getPlayerById(req, res, next) {
  try {
    const player = await playerService.getPlayerById(req.params.id);
    res.json(player);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPlayers,
  getPlayerById,
};
