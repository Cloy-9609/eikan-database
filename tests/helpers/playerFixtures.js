function buildSchoolPayload(overrides = {}) {
  return {
    name: `テスト栄冠${Date.now()}${Math.random().toString(16).slice(2)}`,
    prefecture: "東京都",
    play_style: "three_year",
    start_year: 2026,
    memo: "core regression fixture",
    ...overrides,
  };
}

const pitcherAbilities = {
  velocity: 146,
  control: 71,
  stamina: 65,
};

const batterAbilities = {
  trajectory: 2,
  meat: 58,
  power: 62,
  run_speed: 61,
  arm_strength: 67,
  fielding: 55,
  catching: 49,
};

function buildPitcherPayload(overrides = {}) {
  return {
    ...pitcherAbilities,
    ...overrides,
  };
}

function buildBatterPayload(overrides = {}) {
  return {
    ...batterAbilities,
    ...overrides,
  };
}

function buildPitchTypes(overrides = []) {
  const base = [
    { pitch_name: "スライダー", level: 3, is_original: 0, original_pitch_name: null },
    { pitch_name: "チェンジアップ", level: 2, is_original: 1, original_pitch_name: "栄冠チェンジ" },
  ];
  return base.map((item, index) => ({ ...item, ...(overrides[index] ?? {}) }));
}

function buildSpecialAbilities(overrides = []) {
  const base = [
    { ability_name: "ノビ", ability_category: "pitcher_ranked", rank_value: "B" },
    { ability_name: "パワーヒッター", ability_category: "batter_unranked", rank_value: null },
  ];
  return base.map((item, index) => ({ ...item, ...(overrides[index] ?? {}) }));
}

function buildSubPositions(overrides = []) {
  const base = [
    { position_name: "一塁手", suitability_value: "C", defense_value: 61 },
    { position_name: "外野手", suitability_value: "D", defense_value: 48 },
  ];
  return base.map((item, index) => ({ ...item, ...(overrides[index] ?? {}) }));
}

function buildPlayerPayload(overrides = {}) {
  return {
    school_id: overrides.school_id,
    name: "栄冠 太郎",
    player_type: "normal",
    player_type_note: null,
    total_stars: 180,
    prefecture: "東京都",
    grade: 1,
    admission_year: 2026,
    snapshot_label: "entrance",
    snapshot_note: "fixture note",
    main_position: "投手",
    throwing_hand: "right",
    batting_hand: "left",
    is_reincarnated: 0,
    is_genius: 0,
    ...buildPitcherPayload(),
    ...buildBatterPayload(),
    evidence_image_path: "/tmp/evidence.png",
    pitch_types: buildPitchTypes(),
    special_abilities: buildSpecialAbilities(),
    sub_positions: buildSubPositions(),
    ...overrides,
  };
}

function stripRelationIds(items) {
  return items.map((item) => {
    const { id, player_id, created_at, updated_at, defense_rank, ...rest } = item;
    return rest;
  });
}

module.exports = {
  buildSchoolPayload,
  buildPlayerPayload,
  buildPitcherPayload,
  buildBatterPayload,
  buildPitchTypes,
  buildSpecialAbilities,
  buildSubPositions,
  stripRelationIds,
};
