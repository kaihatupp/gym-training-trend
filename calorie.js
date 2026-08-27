// フェーズ3: 消費カロリー・摂取カロリー目安・食事例(簡易計算)
//
// いずれも一般的な計算式(METs法・Mifflin-St Jeor式)による概算であり、
// 医学的な指導や個別の栄養指導を代替するものではない。

const METS = {
  walkFlat: 3.5,
  walkIncline: 4.5,
  run: 7.0,
  strength: 5.0,
  stretch: 2.3,
};

// CLAUDE.md記載の「いつものトレーニングパターン」(筋トレ通常4種目・約40分)を基準に、
// 選択したマシン数に応じて筋トレの実施時間を按分する。
const STRENGTH_DEFAULT_MACHINE_COUNT = 4;
const STRENGTH_DEFAULT_DURATION_MIN = 40;

// METs法の消費カロリー(kcal) = METs × 体重(kg) × 時間(h) × 1.05
function metsToKcal(mets, weightKg, minutes) {
  return mets * weightKg * (minutes / 60) * 1.05;
}

// draft: { cardio: {type, durationMin, incline}, strength: {entries}, stretch: {durationMin} }
function estimateExerciseKcal(draft, weightKg) {
  if (!weightKg || weightKg <= 0) return null;
  let kcal = 0;
  let hasAny = false;

  const cardio = draft.cardio;
  if (cardio && cardio.durationMin) {
    const mets = cardio.type === "walk" ? (cardio.incline ? METS.walkIncline : METS.walkFlat) : METS.run;
    kcal += metsToKcal(mets, weightKg, cardio.durationMin);
    hasAny = true;
  }

  const entryCount = draft.strength && draft.strength.entries ? draft.strength.entries.length : 0;
  if (entryCount > 0) {
    const durationMin = (entryCount / STRENGTH_DEFAULT_MACHINE_COUNT) * STRENGTH_DEFAULT_DURATION_MIN;
    kcal += metsToKcal(METS.strength, weightKg, durationMin);
    hasAny = true;
  }

  const stretch = draft.stretch;
  if (stretch && stretch.durationMin) {
    kcal += metsToKcal(METS.stretch, weightKg, stretch.durationMin);
    hasAny = true;
  }

  return hasAny ? Math.round(kcal) : null;
}

// Mifflin-St Jeor式による基礎代謝量(BMR)の概算
function estimateBMR(profile) {
  const { weightKg, heightCm, age } = profile;
  if (!weightKg || !heightCm || !age) return null;

  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (profile.gender === "male") return base + 5;
  if (profile.gender === "female") return base - 161;
  return base - 78; // 性別未回答時は男女の中間値
}

// 摂取カロリー目安 = 基礎代謝×1.2(生活活動分) + その日の運動による消費カロリー
function estimateCalorieTargets(profile, exerciseKcal) {
  const bmr = estimateBMR(profile);
  if (bmr === null) return null;

  const maintenance = Math.round(bmr * 1.2 + (exerciseKcal || 0));
  return {
    maintenance,
    loss: maintenance - 500,
    gain: maintenance + 300,
  };
}

// 献立例(参考・一般的な例)
const MEAL_EXAMPLES = [
  {
    maxKcal: 1700,
    breakfast: "ご飯(小盛り)・焼き魚・味噌汁・卵",
    lunch: "鶏むね肉と野菜のサラダ丼",
    dinner: "豆腐と野菜の鍋・ご飯少なめ",
    snack: "ヨーグルト",
  },
  {
    maxKcal: 2100,
    breakfast: "ご飯・納豆・味噌汁・焼き魚",
    lunch: "幕の内弁当程度の定食",
    dinner: "焼き魚定食(ご飯・味噌汁・野菜)",
    snack: "バナナ・ナッツ少々",
  },
  {
    maxKcal: 2500,
    breakfast: "ご飯・卵焼き・味噌汁・焼き鮭",
    lunch: "豚肉と野菜の炒め物定食",
    dinner: "肉料理中心の定食+ご飯",
    snack: "おにぎり・プロテイン",
  },
  {
    maxKcal: Infinity,
    breakfast: "ご飯大盛り・卵・納豆・味噌汁・フルーツ",
    lunch: "丼もの大盛り+副菜",
    dinner: "肉料理多め+ご飯大盛り+汁物",
    snack: "おにぎり・プロテイン・ナッツ",
  },
];

function pickMealExample(targetKcal) {
  if (!targetKcal) return null;
  return MEAL_EXAMPLES.find((bucket) => targetKcal <= bucket.maxKcal) || MEAL_EXAMPLES[MEAL_EXAMPLES.length - 1];
}
