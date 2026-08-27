// フェーズ4: 連続記録日数・週次/月次サマリー・成長の横断比較

function toDateObj(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

function addDays(dateStr, n) {
  const d = toDateObj(dateStr);
  d.setDate(d.getDate() + n);
  return todayStringFromDate(d);
}

function todayStringFromDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// 月曜始まりの週(いつものトレーニングパターンが月曜起点のため)
function getWeekRange(offsetWeeks) {
  const today = toDateObj(todayString());
  const day = today.getDay(); // 0=日, 1=月, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday + offsetWeeks * 7);
  const start = todayStringFromDate(monday);
  const end = addDays(start, 6);
  return { start, end };
}

function getMonthRange(offsetMonths) {
  const today = toDateObj(todayString());
  const first = new Date(today.getFullYear(), today.getMonth() + offsetMonths, 1);
  const last = new Date(today.getFullYear(), today.getMonth() + offsetMonths + 1, 0);
  return { start: todayStringFromDate(first), end: todayStringFromDate(last) };
}

function formatRangeLabel(start, end, periodType) {
  if (periodType === "month") {
    const d = toDateObj(start);
    return `${d.getFullYear()}年${d.getMonth() + 1}月`;
  }
  return `${start} 〜 ${end}`;
}

// ---------- 連続記録日数 ----------

function computeStreaks() {
  const logs = loadLogs();
  const dateSet = new Set(logs.map((l) => l.date));

  let current = 0;
  let cursor = todayString();
  if (!dateSet.has(cursor)) {
    cursor = addDays(cursor, -1);
  }
  while (dateSet.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  const sortedDates = Array.from(dateSet).sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of sortedDates) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }

  return { current, best };
}

// ---------- 週次・月次サマリー ----------

function aggregatePeriod(start, end) {
  const logs = loadLogs().filter((l) => l.date >= start && l.date <= end);

  let totalDistanceKm = 0;
  let totalCardioMin = 0;
  let cardioDays = 0;
  let strengthDays = 0;
  let totalSets = 0;
  let stretchDays = 0;
  let totalStretchMin = 0;
  let weightSum = 0;
  let weightCount = 0;
  let totalKcal = 0;

  for (const log of logs) {
    if (log.cardio && log.cardio.durationMin) {
      totalDistanceKm += log.cardio.distanceKm || 0;
      totalCardioMin += log.cardio.durationMin || 0;
      cardioDays++;
    }
    if (log.strength && log.strength.entries && log.strength.entries.length > 0) {
      strengthDays++;
      for (const entry of log.strength.entries) {
        totalSets += entry.sets || 0;
      }
    }
    if (log.stretch && log.stretch.durationMin) {
      stretchDays++;
      totalStretchMin += log.stretch.durationMin;
    }
    if (log.bodyWeightKg !== null && log.bodyWeightKg !== undefined) {
      weightSum += log.bodyWeightKg;
      weightCount++;
    }
    const weight = log.bodyWeightKg !== null && log.bodyWeightKg !== undefined ? log.bodyWeightKg : getReferenceBodyWeightKg();
    const kcal = estimateExerciseKcal(log, weight);
    if (kcal !== null) totalKcal += kcal;
  }

  return {
    daysLogged: logs.length,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalCardioMin,
    cardioDays,
    strengthDays,
    totalSets,
    stretchDays,
    totalStretchMin,
    avgBodyWeightKg: weightCount > 0 ? Math.round((weightSum / weightCount) * 10) / 10 : null,
    totalKcal: Math.round(totalKcal),
  };
}

// ---------- 成長の横断比較 ----------

function getMachineProgress() {
  const profile = ensureProfileSeeded();
  const logs = loadLogs().slice().sort((a, b) => (a.date < b.date ? -1 : 1));

  return profile.machines
    .filter((m) => m.active)
    .map((m) => {
      let first = null;
      let last = null;
      for (const log of logs) {
        const entry = log.strength && log.strength.entries ? log.strength.entries.find((e) => e.machineId === m.id) : null;
        if (!entry || entry.weightKg === null || entry.weightKg === undefined) continue;
        if (!first) first = { date: log.date, weightKg: entry.weightKg, reps: entry.reps };
        last = { date: log.date, weightKg: entry.weightKg, reps: entry.reps };
      }
      return { machine: m, first, last };
    });
}

// ---------- 画面描画 ----------

let summaryPeriodType = "week";
let summaryOffset = 0;

function renderStreaks() {
  const { current, best } = computeStreaks();
  document.getElementById("streak-current").textContent = `${current}日`;
  document.getElementById("streak-best").textContent = `${best}日`;
}

function getCurrentSummaryRange() {
  return summaryPeriodType === "week" ? getWeekRange(summaryOffset) : getMonthRange(summaryOffset);
}

function renderPeriodSummary() {
  const { start, end } = getCurrentSummaryRange();
  document.getElementById("summary-range-label").textContent = formatRangeLabel(start, end, summaryPeriodType);
  document.getElementById("summary-next").disabled = summaryOffset >= 0;

  const stats = aggregatePeriod(start, end);
  const list = document.getElementById("summary-stats");
  const emptyEl = document.getElementById("summary-empty");

  if (stats.daysLogged === 0) {
    list.innerHTML = "";
    list.hidden = true;
    emptyEl.hidden = false;
    return;
  }
  list.hidden = false;
  emptyEl.hidden = true;

  const rows = [
    ["記録日数", `${stats.daysLogged}日`],
    ["有酸素運動", `${stats.cardioDays}日 / 合計${stats.totalDistanceKm}km・${stats.totalCardioMin}分`],
    ["筋トレ", `${stats.strengthDays}日 / 延べ${stats.totalSets}セット`],
    ["ストレッチ", `${stats.stretchDays}日 / 合計${stats.totalStretchMin}分`],
    ["平均体重", stats.avgBodyWeightKg !== null ? `${stats.avgBodyWeightKg}kg` : "-"],
    ["消費カロリー概算(合計)", `約${stats.totalKcal}kcal`],
  ];

  list.innerHTML = rows
    .map(([label, value]) => `<li><span class="summary-label">${label}</span><span class="summary-value">${value}</span></li>`)
    .join("");
}

function renderProgressTable() {
  const progress = getMachineProgress();
  const tbody = document.getElementById("progress-table-body");
  const table = document.getElementById("progress-table");
  const emptyEl = document.getElementById("progress-empty");

  const rowsWithData = progress.filter((p) => p.first);
  if (rowsWithData.length === 0) {
    table.hidden = true;
    emptyEl.hidden = false;
    return;
  }
  table.hidden = false;
  emptyEl.hidden = true;

  tbody.innerHTML = rowsWithData
    .map(({ machine, first, last }) => {
      const sameEntry = first.date === last.date;
      let deltaText = "記録1件のみ";
      if (!sameEntry) {
        const weightDelta = Math.round((last.weightKg - first.weightKg) * 10) / 10;
        const repsDelta = (last.reps ?? 0) - (first.reps ?? 0);
        const weightText = weightDelta === 0 ? "±0kg" : `${weightDelta > 0 ? "+" : ""}${weightDelta}kg`;
        const repsText = repsDelta === 0 ? "±0回" : `${repsDelta > 0 ? "+" : ""}${repsDelta}回`;
        deltaText = `${weightText} / ${repsText}`;
      }
      return `
        <tr>
          <td>${escapeAttr(machine.name)}</td>
          <td>${first.date}<br>${first.weightKg}kg×${first.reps ?? "-"}回</td>
          <td>${last.date}<br>${last.weightKg}kg×${last.reps ?? "-"}回</td>
          <td>${deltaText}</td>
        </tr>
      `;
    })
    .join("");
}

function renderSummaryView() {
  summaryOffset = 0;
  renderStreaks();
  renderPeriodSummary();
  renderProgressTable();
}

document.getElementById("summary-period-tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".selector-btn");
  if (!btn) return;
  summaryPeriodType = btn.dataset.period;
  summaryOffset = 0;
  for (const b of document.querySelectorAll("#summary-period-tabs .selector-btn")) {
    b.classList.toggle("active", b === btn);
  }
  renderPeriodSummary();
});

document.getElementById("summary-prev").addEventListener("click", () => {
  summaryOffset -= 1;
  renderPeriodSummary();
});

document.getElementById("summary-next").addEventListener("click", () => {
  if (summaryOffset >= 0) return;
  summaryOffset += 1;
  renderPeriodSummary();
});
