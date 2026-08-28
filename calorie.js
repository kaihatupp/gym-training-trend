// フェーズ3: 消費カロリー・摂取カロリー目安(簡易計算)・摂取カロリー実績記録
//
// 消費カロリー・摂取カロリー目安はいずれも一般的な計算式(METs法・Mifflin-St Jeor式)
// による概算であり、医学的な指導や個別の栄養指導を代替するものではない。

const MEAL_TYPES = [
  { key: "breakfast", label: "朝食" },
  { key: "lunch", label: "昼食" },
  { key: "dinner", label: "夕食" },
  { key: "snack", label: "間食" },
];

// meals: WorkoutLog.meals ( [{mealType, kcal, mealItemId?, memo?}] ) の合計kcal
function sumMealsKcal(meals) {
  if (!Array.isArray(meals) || meals.length === 0) return null;
  const withKcal = meals.filter((m) => typeof m.kcal === "number" && !Number.isNaN(m.kcal));
  if (withKcal.length === 0) return null;
  return Math.round(withKcal.reduce((sum, m) => sum + m.kcal, 0));
}

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

// 摂取カロリー目安 = 基礎代謝×1.2(生活活動分)。日々の運動による消費カロリーは
// ここには含めず、「あと何kcalまでOK」の計算側で別途上乗せする(目安の値自体は
// その日の運動量に関わらず一定にしておき、運動分の影響を分かりやすくするため)。
function estimateCalorieTargets(profile) {
  const bmr = estimateBMR(profile);
  if (bmr === null) return null;

  const maintenance = Math.round(bmr * 1.2);
  return {
    maintenance,
    loss: maintenance - 500,
    gain: maintenance + 300,
  };
}
