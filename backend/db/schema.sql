PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

DROP TABLE IF EXISTS player_results;
DROP TABLE IF EXISTS player_sub_positions;
DROP TABLE IF EXISTS player_special_abilities;
DROP TABLE IF EXISTS player_pitch_types;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS school_year_progress_log_players;
DROP TABLE IF EXISTS school_year_progress_logs;
DROP TABLE IF EXISTS player_series;
DROP TABLE IF EXISTS schools;

CREATE TABLE schools (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  prefecture TEXT,
  play_style TEXT NOT NULL CHECK (play_style IN ('three_year', 'continuous')),
  start_year INTEGER,
  current_year INTEGER,
  memo TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE player_series (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL,
  series_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  prefecture TEXT NOT NULL,
  player_type TEXT NOT NULL CHECK (player_type IN ('normal', 'genius', 'reincarnated')),
  player_type_note TEXT,
  admission_year INTEGER NOT NULL,
  school_grade INTEGER NOT NULL DEFAULT 1 CHECK (school_grade BETWEEN 1 AND 3),
  roster_status TEXT NOT NULL DEFAULT 'active' CHECK (roster_status IN ('active', 'graduated')),
  throwing_hand TEXT NOT NULL CHECK (throwing_hand IN ('right', 'left')),
  batting_hand TEXT NOT NULL CHECK (batting_hand IN ('right', 'left', 'both')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (school_id, series_no),
  FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE school_year_progress_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL,
  previous_year INTEGER NOT NULL,
  current_year INTEGER NOT NULL,
  snapshots_created INTEGER NOT NULL DEFAULT 0 CHECK (snapshots_created >= 0),
  is_undo_available INTEGER NOT NULL DEFAULT 1 CHECK (is_undo_available IN (0, 1)),
  undone_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE school_year_progress_log_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  log_id INTEGER NOT NULL,
  player_series_id INTEGER NOT NULL,
  before_school_grade INTEGER NOT NULL CHECK (before_school_grade BETWEEN 1 AND 3),
  before_roster_status TEXT NOT NULL CHECK (before_roster_status IN ('active', 'graduated')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (log_id, player_series_id),
  FOREIGN KEY (log_id) REFERENCES school_year_progress_logs(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (player_series_id) REFERENCES player_series(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_series_id INTEGER NOT NULL,
  school_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  player_type TEXT NOT NULL CHECK (player_type IN ('normal', 'genius', 'reincarnated')),
  player_type_note TEXT,
  total_stars INTEGER NOT NULL DEFAULT 0 CHECK (total_stars >= 0),
  prefecture TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 3),
  admission_year INTEGER NOT NULL,
  snapshot_label TEXT NOT NULL CHECK (
    snapshot_label IN (
      'entrance',
      'y1_summer',
      'y1_autumn',
      'y1_spring',
      'y2_summer',
      'y2_autumn',
      'y2_spring',
      'y3_summer',
      'graduation',
      'post_tournament'
    )
  ),
  snapshot_note TEXT,
  main_position TEXT NOT NULL,
  throwing_hand TEXT NOT NULL CHECK (throwing_hand IN ('right', 'left')),
  batting_hand TEXT NOT NULL CHECK (batting_hand IN ('right', 'left', 'both')),
  is_reincarnated INTEGER NOT NULL DEFAULT 0 CHECK (is_reincarnated IN (0, 1)),
  is_genius INTEGER NOT NULL DEFAULT 0 CHECK (is_genius IN (0, 1)),
  velocity INTEGER CHECK (velocity >= 0),
  control INTEGER CHECK (control >= 0),
  stamina INTEGER CHECK (stamina >= 0),
  trajectory INTEGER CHECK (trajectory >= 0),
  meat INTEGER CHECK (meat >= 0),
  power INTEGER CHECK (power >= 0),
  run_speed INTEGER CHECK (run_speed >= 0),
  arm_strength INTEGER CHECK (arm_strength >= 0),
  fielding INTEGER CHECK (fielding >= 0),
  catching INTEGER CHECK (catching >= 0),
  evidence_image_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_series_id) REFERENCES player_series(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE player_pitch_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  pitch_name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  is_original INTEGER NOT NULL DEFAULT 0 CHECK (is_original IN (0, 1)),
  original_pitch_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE player_special_abilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  ability_name TEXT NOT NULL,
  ability_category TEXT NOT NULL CHECK (
    ability_category IN (
      'pitcher_ranked',
      'pitcher_unranked',
      'batter_ranked',
      'batter_unranked',
      'green'
    )
  ),
  rank_value TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE player_sub_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  position_name TEXT NOT NULL,
  suitability_value TEXT NOT NULL,
  defense_value INTEGER CHECK (defense_value IS NULL OR defense_value BETWEEN 0 AND 100),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE player_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  result_label TEXT NOT NULL CHECK (result_label IN ('summer', 'autumn', 'other')),
  batting_average REAL,
  home_runs INTEGER,
  runs_batted_in INTEGER,
  stolen_bases INTEGER,
  earned_run_average REAL,
  wins INTEGER,
  losses INTEGER,
  holds INTEGER,
  saves INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_schools_is_archived ON schools(is_archived);
CREATE INDEX idx_player_series_school_id ON player_series(school_id);
CREATE INDEX idx_school_year_progress_logs_school_undo
  ON school_year_progress_logs(school_id, is_undo_available, undone_at, id);
CREATE INDEX idx_school_year_progress_log_players_log_id ON school_year_progress_log_players(log_id);
CREATE INDEX idx_school_year_progress_log_players_player_series_id
  ON school_year_progress_log_players(player_series_id);
CREATE INDEX idx_players_school_id ON players(school_id);
CREATE INDEX idx_players_player_series_id ON players(player_series_id);
CREATE INDEX idx_players_player_type ON players(player_type);
CREATE INDEX idx_players_admission_year ON players(admission_year);
CREATE UNIQUE INDEX idx_players_series_snapshot_unique ON players(player_series_id, snapshot_label);
CREATE INDEX idx_player_pitch_types_player_id ON player_pitch_types(player_id);
CREATE INDEX idx_player_special_abilities_player_id ON player_special_abilities(player_id);
CREATE INDEX idx_player_sub_positions_player_id ON player_sub_positions(player_id);
CREATE INDEX idx_player_results_player_id ON player_results(player_id);

COMMIT;
