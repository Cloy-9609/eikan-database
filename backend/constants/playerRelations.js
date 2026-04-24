const PLAYER_POSITION_OPTIONS = ["投手", "捕手", "一塁手", "二塁手", "三塁手", "遊撃手", "外野手"];

const SPECIAL_ABILITY_CATEGORIES = [
  { value: "pitcher_ranked", label: "投手青特（ランクあり）", usesRank: true },
  { value: "pitcher_unranked", label: "投手青特（一般）", usesRank: false },
  { value: "batter_ranked", label: "野手青特（ランクあり）", usesRank: true },
  { value: "batter_unranked", label: "野手青特（一般）", usesRank: false },
  { value: "green", label: "緑特", usesRank: false },
];

const ALLOWED_ABILITY_CATEGORIES = SPECIAL_ABILITY_CATEGORIES.map(({ value }) => value);

const SPECIAL_ABILITY_SUGGESTIONS = [
  "対ピンチ",
  "打たれ強さ",
  "ノビ",
  "キレ○",
  "クイック",
  "回復",
  "対左打者",
  "奪三振",
  "逃げ球",
  "重い球",
  "牽制○",
  "リリース○",
  "チャンス",
  "対左投手",
  "盗塁",
  "走塁",
  "送球",
  "守備職人",
  "流し打ち",
  "固め打ち",
  "粘り打ち",
  "アベレージヒッター",
  "パワーヒッター",
  "広角打法",
  "初球○",
  "満塁男",
  "サヨナラ男",
  "ヘッドスライディング",
  "人気者",
  "ムード○",
  "選球眼",
  "積極打法",
  "慎重打法",
  "積極守備",
  "慎重守備",
  "強振多用",
  "ミート多用",
];

const PITCH_TYPE_SUGGESTIONS = [
  "ストレート",
  "ツーシーム",
  "カットボール",
  "スライダー",
  "Hスライダー",
  "Vスライダー",
  "スイーパー",
  "カーブ",
  "スローカーブ",
  "ドロップ",
  "ナックルカーブ",
  "フォーク",
  "パーム",
  "SFF",
  "チェンジアップ",
  "シンカー",
  "Hシンカー",
  "シュート",
  "スクリュー",
  "スラーブ",
  "ナックル",
];

const SUB_POSITION_SUITABILITY_SUGGESTIONS = ["S", "A", "B", "C", "D", "E", "F", "G"];

function buildRelationOptionsResponse() {
  return {
    specialAbilityCategories: SPECIAL_ABILITY_CATEGORIES,
    specialAbilitySuggestions: SPECIAL_ABILITY_SUGGESTIONS,
    pitchTypeSuggestions: PITCH_TYPE_SUGGESTIONS,
    subPositionOptions: PLAYER_POSITION_OPTIONS,
    subPositionSuitabilitySuggestions: SUB_POSITION_SUITABILITY_SUGGESTIONS,
  };
}

module.exports = {
  PLAYER_POSITION_OPTIONS,
  SPECIAL_ABILITY_CATEGORIES,
  ALLOWED_ABILITY_CATEGORIES,
  SPECIAL_ABILITY_SUGGESTIONS,
  PITCH_TYPE_SUGGESTIONS,
  SUB_POSITION_SUITABILITY_SUGGESTIONS,
  buildRelationOptionsResponse,
};
