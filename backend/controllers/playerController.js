const playerService = require("../services/playerService");

async function getPlayers(req, res, next) {
  try {
    const players = await playerService.getPlayers(req.query);
    res.json({
      success: true,
      data: players,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function getPlayerById(req, res, next) {
  try {
    const player = await playerService.getPlayerById(req.params.id);
    res.json({
      success: true,
      data: player,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function createPlayer(req, res, next) {
  try {
    const player = await playerService.createPlayer(req.body);
    res.status(201).json({
      success: true,
      data: player,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPlayers,
  getPlayerById,
  createPlayer,
};
