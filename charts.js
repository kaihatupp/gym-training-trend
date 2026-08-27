// 筋トレマシンごとの重量推移グラフ(フェーズ2)

const machineTabsEl = document.getElementById("machine-tabs");
const machineTabsEmptyEl = document.getElementById("machine-tabs-empty");
const chartCanvas = document.getElementById("chart-canvas");
const chartEmptyEl = document.getElementById("chart-empty");

let selectedMachineId = null;
let chartInstance = null;

function getWeightHistory(machineId) {
  const logs = loadLogs().slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const points = [];
  for (const log of logs) {
    if (!log.strength || !log.strength.entries) continue;
    const entry = log.strength.entries.find((e) => e.machineId === machineId);
    if (!entry || entry.weightKg === null || entry.weightKg === undefined) continue;
    points.push({ date: log.date, weightKg: entry.weightKg, reps: entry.reps, sets: entry.sets });
  }
  return points;
}

function renderMachineTabs() {
  const profile = ensureProfileSeeded();
  const machines = profile.machines;
  machineTabsEl.innerHTML = "";
  machineTabsEmptyEl.hidden = machines.length > 0;

  if (machines.length === 0) {
    selectedMachineId = null;
    return;
  }

  if (!selectedMachineId || !machines.some((m) => m.id === selectedMachineId)) {
    selectedMachineId = machines[0].id;
  }

  for (const m of machines) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "selector-btn" + (m.id === selectedMachineId ? " active" : "");
    btn.dataset.machineId = m.id;
    btn.textContent = m.name;
    machineTabsEl.appendChild(btn);
  }
}

machineTabsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".selector-btn");
  if (!btn) return;
  selectedMachineId = btn.dataset.machineId;
  renderMachineTabs();
  renderChart();
});

function renderChart() {
  if (!selectedMachineId) {
    chartCanvas.hidden = true;
    chartEmptyEl.hidden = false;
    return;
  }

  const profile = ensureProfileSeeded();
  const machine = profile.machines.find((m) => m.id === selectedMachineId);
  const points = getWeightHistory(selectedMachineId);

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  if (points.length === 0) {
    chartCanvas.hidden = true;
    chartEmptyEl.hidden = false;
    return;
  }

  chartCanvas.hidden = false;
  chartEmptyEl.hidden = true;

  const datasets = [
    {
      label: machine ? `${machine.name} 重量(kg)` : "重量(kg)",
      data: points.map((p) => p.weightKg),
      borderColor: "#2f5d7d",
      backgroundColor: "#2f5d7d",
      tension: 0.2,
      spanGaps: true,
    },
  ];

  if (machine && machine.targetWeightKg !== null && machine.targetWeightKg !== undefined) {
    datasets.push({
      label: "目標重量(kg)",
      data: points.map(() => machine.targetWeightKg),
      borderColor: "#c0392b",
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
    });
  }

  chartInstance = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels: points.map((p) => p.date),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: false },
      },
    },
  });
}

function renderGraphView() {
  renderMachineTabs();
  renderChart();
}
