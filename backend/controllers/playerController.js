const playerService = require("../services/playerService");

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
  createPlayer,
};
