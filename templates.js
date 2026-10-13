// 曜日ごとの「いつものメニュー」テンプレート定義
// day: 0=日, 1=月, 2=火, ... 6=土 (Date.getDay())
//
// 有酸素運動の距離・時間・傾斜有無はプロフィール画面の「有酸素運動」設定値を使う。
// ここでは曜日ごとの「デフォルト」だけを決める。画面上ではいつでも自由に上書きできる
// (例: 有酸素運動のタイプ切替、ストレッチの「実施した」チェック)。
// showStretch は「ストレッチを表示するか」ではなく「『実施した』チェックをデフォルトで
// ONにするか」の意味(ストレッチ欄自体は全曜日で表示する)。

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
    stretchDurationMin: 40,
  },
};

function getTemplateForDate(dateStr) {
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return day === 1 ? TEMPLATES.monday : TEMPLATES.default;
}
