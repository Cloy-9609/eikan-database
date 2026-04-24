PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

INSERT INTO schools (
  school_code,
  name,
  prefecture,
  play_style,
  start_year,
  current_year,
  memo,
  is_archived
) VALUES (
  'A7K3M9Q2',
  'サンプル',
  '東京都',
  'three_year',
  2025,
  2025,
  'Phase1 seed data',
  0
);

INSERT INTO player_series (
  id,
  school_id,
  series_no,
  name,
  prefecture,
  player_type,
  player_type_note,
  admission_year,
  throwing_hand,
  batting_hand,
  note
) VALUES (
  1,
  1,
  1,
  'サンプル太郎',
  '東京都',
  'normal',
  NULL,
  2025,
  'right',
  'right',
  'Phase2 snapshot seed'
);

INSERT INTO players (
  player_series_id,
  school_id,
  name,
  player_type,
  player_type_note,
  total_stars,
  prefecture,
  grade,
  admission_year,
  snapshot_label,
  snapshot_note,
  main_position,
  throwing_hand,
  batting_hand,
  is_reincarnated,
  is_genius,
  velocity,
  control,
  stamina,
  trajectory,
  meat,
  power,
  run_speed,
  arm_strength,
  fielding,
  catching,
  evidence_image_path
) VALUES (
  1,
  1,
  'サンプル太郎',
  'normal',
  NULL,
  120,
  '東京都',
  2,
  2025,
  'entrance',
  NULL,
  '投手',
  'right',
  'right',
  0,
  0,
  135,
  52,
  48,
  2,
  40,
  45,
  50,
  47,
  44,
  43,
  NULL
);

INSERT INTO player_pitch_types (
  player_id,
  pitch_name,
  level,
  is_original,
  original_pitch_name
) VALUES (
  1,
  'ストレート',
  1,
  0,
  NULL
);

INSERT INTO player_special_abilities (
  player_id,
  ability_name,
  ability_category,
  rank_value
) VALUES (
  1,
  '対ピンチ',
  'pitcher_ranked',
  'B'
);

INSERT INTO player_sub_positions (
  player_id,
  position_name,
  suitability_value
) VALUES (
  1,
  '一塁手',
  'E'
);

INSERT INTO player_results (
  player_id,
  result_label,
  batting_average,
  home_runs,
  runs_batted_in,
  stolen_bases,
  earned_run_average,
  wins,
  losses,
  holds,
  saves
) VALUES (
  1,
  'summer',
  0.286,
  3,
  18,
  6,
  2.45,
  7,
  2,
  0,
  1
);

COMMIT;
