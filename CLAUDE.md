# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

「Gym Training Trend」は、毎朝のジムトレーニング(有酸素運動・筋トレ・ストレッチ)を記録するための個人利用向けPWA(Progressive Web App)です。まだコードは存在せず、このリポジトリはこれから`/gym-training-trend-app-dev`フォルダでゼロから開発を始める初期状態です。

姉妹アプリ「VITALtrend」(`taiju-app-dev`フォルダ、体重・体脂肪・血圧を記録するアプリ)と技術構成・運用方針を統一している。将来的にVITALtrendの体重・体脂肪データと連携したいという構想がある(まだ未実装)。

## 開発方針・設計制約

- **技術構成: プレーンなHTML / CSS / 素のJavaScript(フレームワーク・npm・ビルドツール不使用)。** VITALtrendや他の姉妹アプリ(kintai/kougeisha/pures/tokumei/yotuya-app-dev)と同じ方式に統一する。
- **データ保存: ブラウザの`localStorage`のみ。サーバー・データベースは一切使用しない。**
- **⚠️ 設計制約: 完全ブラウザ完結・データ送信一切なし。** このアプリは意図的にオフラインファースト/ブラウザ完結型であり、体重・筋トレ記録などのユーザーデータをサーバーへ送信することは絶対に行わない。
  - `fetch`/`XMLHttpRequest`/`WebSocket`など、ユーザーデータを外部に送信するネットワークI/Oを追加しない。
  - 静的ライブラリの読み込み(例: 将来Chart.jsを`lib/`配下に同梱する場合)は例外として許容するが、CDN経由での読み込みは避け、VITALtrend同様ファイル同梱でオフライン動作を保つ。
  - サーバー送信が必要になる機能を頼まれた場合は、実装前にこの制約との矛盾を指摘すること。
- PWA対応: `manifest.json` + Service Worker(`sw.js`)によるオフラインキャッシュ(VITALtrendの構成を踏襲)
- 公開: Publicリポジトリ + GitHub Pagesでホスティング(データはlocalStorageのみでサーバー送信がないため、コード公開に実害はない)

## 開発の進め方(小さく作って大きく育てる)

最初からすべての機能を作らず、フェーズを分けて育てていく方針。

- **フェーズ1(まずここから)**: 記録の入力・保存・一覧表示・編集・削除のみ。グラフ、カロリー計算、目標設定はまだ実装しない。
- フェーズ2: 筋トレ種目ごとの重量推移グラフ(Chart.js導入)、目標重量・レップ数の設定
- フェーズ3: 消費カロリーの概算表示(体重+METs値による簡易計算)、摂取カロリー目安、食事例の提示
- フェーズ4: 週次・月次サマリー、連続記録日数、成長の横断比較ダッシュボード
- フェーズ5以降(構想): VITALtrendとのデータ連携

## いつものトレーニングパターン(テンプレートの元データ)

- 月曜日: ウォーキング約5km・1時間(傾斜あり) + ストレッチ約40分
- 火〜日曜日: ランニング(ウォーキングとランニングの組み合わせ)7km・1時間 + 筋トレマシン(登録済みリストから選択、通常4種目・各15回×3セット)約40分

曜日ごとに「いつものメニュー」をテンプレートとして持ち、記録画面を開くとその日のテンプレートが自動表示され、実施有無や数値だけ入力すれば済むようにする。

## 筋トレマシンの管理方針

- プロフィール画面で1箇所管理。マシンは初回にまとめて登録しておく。
- ウエイト(ピン差し)は基本的に変わらないため、重量はマシンごとにプロフィール側で保持し、変更があった時だけ編集する(毎日入力し直さない)。
- 日によって使うマシンの組み合わせが変わることがあるため、毎日の記録時は登録済みマシンのリストから、その日使った種目を選択する形にする。

### 初期登録マシン(2026-08-26時点)

デフォルトは15回×3セット。

| マシン名 | 初期重量 |
| --- | --- |
| アブドミナル | 75kg |
| チェストプレス | 47kg |
| レッグプレス | 145kg |
| ペクトラルフライ | 54kg |

## 体重の入力

毎日、記録画面で体重を入力する(将来VITALtrendと連携予定)。

## 記録の編集・削除

一覧画面から、過去の記録を編集・削除の両方できるようにする。

## データモデル(案)

```js
// プロフィール(1箇所で管理、初回登録・変更時のみ編集)
// MachineProfile: { id, name, currentWeightKg, defaultReps(=15), defaultSets(=3), active }
// UserProfile: { machines: MachineProfile[] }

// 個別の記録
// StrengthLogEntry: { machineId, weightKg, reps, sets }
// WorkoutLog: {
//   id, date(YYYY-MM-DD),
//   bodyWeightKg,                         // その日の体重
//   cardio: { type('walk'|'run'), distanceKm, durationMin, incline, isRunWalkCombo },
//   strength: { entries: StrengthLogEntry[] },
//   stretch: { durationMin },
//   memo, createdAt, updatedAt
// }
```

## フェーズ1の画面構成

1. **プロフィール画面**: 筋トレマシンの登録・編集(名前、現在の重量、デフォルト回数・セット数、使用中フラグ)。初期データは上記4種目。
2. **今日の記録画面(ホーム)**: 曜日に応じたテンプレートを自動表示。体重、有酸素運動(距離・時間・傾斜有無)、筋トレ(登録済みマシンから選択、重量はプロフィール値が自動入力・上書き可)、ストレッチ(月曜のみ)を入力して保存。
3. **記録一覧画面**: 日付順に過去の記録を一覧表示。タップして詳細確認・編集・削除。

## ファイル構成(想定)

```
gym-training-trend-app-dev/
├── CLAUDE.md            # このファイル
├── index.html            # 画面構成(ホーム・プロフィール・一覧)
├── style.css              # スタイル
├── app.js                  # 入力フォーム・保存処理
├── templates.js            # 曜日ごとのテンプレート定義
├── manifest.json           # PWA設定(アプリ名・アイコン)
├── sw.js                    # Service Worker(オフラインキャッシュ)
├── pwa.js                   # Service Worker登録処理
├── icons/                   # ホーム画面用アイコン各種
└── gym-training-trend-app-dev起動.bat  # Claude Code起動用
```

将来グラフ機能(フェーズ2)を追加する際は`charts.js`、カロリー計算(フェーズ3)は`calorie.js`のように、機能ごとにファイルを分ける方針(VITALtrendに準拠)。

## 個人情報保護の運用ルール

齋藤オフィスの他アプリと同様、開発相談時に実在の個人データをそのまま貼り付けない。ただし本アプリはユーザー本人のトレーニング記録(体重・重量など)を扱う個人利用アプリであり、データは常にブラウザ内に留まりサーバーへは一切送信されない。

## 関連する既存アプリ

- **VITALtrend**(`taiju-app-dev`フォルダ、公開URL: https://kaihatupp.github.io/health-tracker-app/): 体重・体脂肪率・血圧・脈拍を記録するPWA。技術構成(プレーンHTML/CSS/JS、Chart.js同梱、localStorage、PWA)は本アプリの土台としてそのまま踏襲する。将来的に体重・体脂肪データの連携を検討中(未実装)。

## 未決定・要検討事項

- VITALtrendとのデータ連携方式(ファイル経由か、共通のバックエンドを持つか等は将来フェーズで検討)
- 実際にGitHubリポジトリ`gym-training-trend`を作成し、GitHub Pagesで公開する作業(まだ未実施)
