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

async function getPlayerRelationOptions(req, res, next) {
  try {
    const relationOptions = await playerService.getPlayerRelationOptions();
    res.json({
      success: true,
      data: relationOptions,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function getPlayerDetailById(req, res, next) {
  try {
    const playerDetail = await playerService.getPlayerDetailByPlayerId(req.params.id, req.query);
    res.json({
      success: true,
      data: playerDetail,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function getPlayerSeriesById(req, res, next) {
  try {
    const playerSeries = await playerService.getPlayerSeriesById(req.params.id, req.query);
    res.json({
      success: true,
      data: playerSeries,
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

async function addSnapshotToSeries(req, res, next) {
  try {
    const snapshot = await playerService.addSnapshotToSeries(req.params.id, req.body);
    res.status(201).json({
      success: true,
      data: snapshot,
      error: null,
    });
  } catch (error) {
    next(error);
  }
}

async function updatePlayer(req, res, next) {
  try {
    const player = await playerService.updatePlayer(req.params.id, req.body);
    res.json({
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
  getPlayerRelationOptions,
  getPlayerDetailById,
  getPlayerSeriesById,
  createPlayer,
  addSnapshotToSeries,
  updatePlayer,
};
