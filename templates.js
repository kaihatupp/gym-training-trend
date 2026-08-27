// 曜日ごとの「いつものメニュー」テンプレート定義
// day: 0=日, 1=月, 2=火, ... 6=土 (Date.getDay())
//
// 有酸素運動の距離・時間・傾斜有無はプロフィール画面の「有酸素運動」設定値を使う。
// ここでは曜日ごとに「どちらを使うか」「筋トレ・ストレッチを出すか」だけを決める。

const TEMPLATES = {
  monday: {
    cardioType: "walk",
    showStrength: false,
    showStretch: true,
    stretchDurationMin: 40,
  },
  default: {
    cardioType: "run",
    showStrength: true,
    showStretch: false,
    stretchDurationMin: 0,
  },
};

function getTemplateForDate(dateStr) {
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return day === 1 ? TEMPLATES.monday : TEMPLATES.default;
}
