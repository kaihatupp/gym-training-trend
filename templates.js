// 曜日ごとの「いつものメニュー」テンプレート定義
// day: 0=日, 1=月, 2=火, ... 6=土 (Date.getDay())

const TEMPLATES = {
  monday: {
    cardio: { type: "walk", distanceKm: 5, durationMin: 60, incline: true, isRunWalkCombo: false },
    showStrength: false,
    showStretch: true,
    stretchDurationMin: 40,
  },
  default: {
    cardio: { type: "run", distanceKm: 7, durationMin: 60, incline: false, isRunWalkCombo: true },
    showStrength: true,
    showStretch: false,
    stretchDurationMin: 0,
  },
};

function getTemplateForDate(dateStr) {
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return day === 1 ? TEMPLATES.monday : TEMPLATES.default;
}
