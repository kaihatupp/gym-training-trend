const LOGS_KEY = "gymWorkoutLogs";
const PROFILE_KEY = "gymUserProfile";

const DEFAULT_MACHINES = [
  { name: "アブドミナル", currentWeightKg: 75 },
  { name: "チェストプレス", currentWeightKg: 47 },
  { name: "レッグプレス", currentWeightKg: 145 },
  { name: "ペクトラルフライ", currentWeightKg: 54 },
];

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ---------- プロフィール(マシン)の読み書き ----------

function loadProfile() {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.machines) ? parsed : null;
  } catch {
    return null;
  }
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function ensureProfileSeeded() {
  let profile = loadProfile();
  if (!profile) {
    profile = {
      machines: DEFAULT_MACHINES.map((m) => ({
        id: makeId(),
        name: m.name,
        currentWeightKg: m.currentWeightKg,
        defaultReps: 15,
        defaultSets: 3,
        active: true,
        targetWeightKg: null,
        targetReps: null,
      })),
    };
    saveProfile(profile);
  }
  return profile;
}

function getActiveMachines() {
  return ensureProfileSeeded().machines.filter((m) => m.active);
}

// ---------- トレーニング記録の読み書き ----------

function loadLogs() {
  const raw = localStorage.getItem(LOGS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLogs(logs) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

function findLog(date) {
  return loadLogs().find((l) => l.date === date) || null;
}

function upsertLog(newLog) {
  const logs = loadLogs();
  const index = logs.findIndex((l) => l.date === newLog.date);
  if (index >= 0) {
    newLog.id = logs[index].id;
    newLog.createdAt = logs[index].createdAt;
    logs[index] = newLog;
  } else {
    logs.push(newLog);
  }
  logs.sort((a, b) => (a.date < b.date ? 1 : -1));
  saveLogs(logs);
  return logs;
}

function deleteLog(date) {
  const logs = loadLogs().filter((l) => l.date !== date);
  saveLogs(logs);
  return logs;
}

// ---------- 共通ユーティリティ ----------

function todayString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isMonday(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getDay() === 1;
}

function getNumberOrNull(el) {
  const value = el.value;
  return value === "" ? null : Number(value);
}

function attachAutoDecimalInput(el) {
  let buffer = "";

  function format() {
    if (buffer === "") return "";
    if (buffer.length <= 2) {
      return `${parseInt(buffer, 10)}.0`;
    }
    const intPart = buffer.slice(0, -1);
    const decPart = buffer.slice(-1);
    return `${parseInt(intPart, 10)}.${decPart}`;
  }

  el.addEventListener("focus", () => {
    buffer = "";
  });

  el.addEventListener("beforeinput", (e) => {
    if (e.inputType === "insertText" && e.data && /^[0-9]+$/.test(e.data)) {
      e.preventDefault();
      buffer = (buffer + e.data).slice(0, 4);
      el.value = format();
    } else if (e.inputType === "deleteContentBackward" || e.inputType === "deleteContentForward") {
      e.preventDefault();
      buffer = buffer.slice(0, -1);
      el.value = format();
    } else {
      e.preventDefault();
    }
  });

  el.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    buffer = text.replace(/[^0-9]/g, "").slice(0, 4);
    el.value = format();
  });

  el._resetAutoDecimalBuffer = () => {
    buffer = "";
  };
}

function setTextFieldValue(el, value) {
  el.value = value === null || value === undefined ? "" : String(value);
  if (el._resetAutoDecimalBuffer) el._resetAutoDecimalBuffer();
}

// ---------- タブ切り替え ----------

const tabBar = document.getElementById("main-tabs");
const views = {
  home: document.getElementById("view-home"),
  list: document.getElementById("view-list"),
  graph: document.getElementById("view-graph"),
  profile: document.getElementById("view-profile"),
};

tabBar.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;
  showView(btn.dataset.view);
});

function showView(name) {
  for (const btn of tabBar.querySelectorAll(".tab-btn")) {
    btn.classList.toggle("active", btn.dataset.view === name);
  }
  for (const key of Object.keys(views)) {
    views[key].classList.toggle("active", key === name);
  }
  if (name === "home") {
    populateFormForDate(dateInput.value);
  } else if (name === "list") {
    renderLogsList();
  } else if (name === "graph") {
    if (typeof renderGraphView === "function") renderGraphView();
  } else if (name === "profile") {
    renderMachinesList();
  }
}

// ---------- プロフィール画面 ----------

const machinesList = document.getElementById("machines-list");
const machineForm = document.getElementById("machine-form");

function renderMachinesList() {
  const profile = ensureProfileSeeded();
  machinesList.innerHTML = "";

  if (profile.machines.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "マシンが登録されていません";
    machinesList.appendChild(li);
    return;
  }

  for (const m of profile.machines) {
    const li = document.createElement("li");
    li.dataset.id = m.id;
    li.innerHTML = `
      <div class="field">
        <input type="text" class="m-name" value="${escapeAttr(m.name)}">
      </div>
      <div class="field-row">
        <div class="field">
          <label>重量(kg)</label>
          <input type="number" class="m-weight" step="0.5" min="0" value="${m.currentWeightKg ?? ""}">
        </div>
        <div class="field">
          <label>回数</label>
          <input type="number" class="m-reps" step="1" min="0" value="${m.defaultReps ?? ""}">
        </div>
        <div class="field">
          <label>セット数</label>
          <input type="number" class="m-sets" step="1" min="0" value="${m.defaultSets ?? ""}">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>目標重量(kg)</label>
          <input type="number" class="m-target-weight" step="0.5" min="0" value="${m.targetWeightKg ?? ""}" placeholder="任意">
        </div>
        <div class="field">
          <label>目標回数</label>
          <input type="number" class="m-target-reps" step="1" min="0" value="${m.targetReps ?? ""}" placeholder="任意">
        </div>
      </div>
      <div class="machine-row-footer">
        <label class="checkbox-label">
          <input type="checkbox" class="m-active" ${m.active ? "checked" : ""}> 使用中
        </label>
        <button type="button" class="delete-btn m-delete">削除</button>
      </div>
    `;
    machinesList.appendChild(li);
  }
}

function escapeAttr(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

machinesList.addEventListener("change", (e) => {
  const li = e.target.closest("li[data-id]");
  if (!li) return;
  const profile = ensureProfileSeeded();
  const machine = profile.machines.find((m) => m.id === li.dataset.id);
  if (!machine) return;

  if (e.target.classList.contains("m-name")) {
    machine.name = e.target.value.trim() || machine.name;
  } else if (e.target.classList.contains("m-weight")) {
    machine.currentWeightKg = getNumberOrNull(e.target);
  } else if (e.target.classList.contains("m-reps")) {
    machine.defaultReps = getNumberOrNull(e.target);
  } else if (e.target.classList.contains("m-sets")) {
    machine.defaultSets = getNumberOrNull(e.target);
  } else if (e.target.classList.contains("m-target-weight")) {
    machine.targetWeightKg = getNumberOrNull(e.target);
  } else if (e.target.classList.contains("m-target-reps")) {
    machine.targetReps = getNumberOrNull(e.target);
  } else if (e.target.classList.contains("m-active")) {
    machine.active = e.target.checked;
  } else {
    return;
  }
  saveProfile(profile);
});

machinesList.addEventListener("click", (e) => {
  const deleteBtn = e.target.closest(".m-delete");
  if (!deleteBtn) return;
  const li = deleteBtn.closest("li[data-id]");
  if (!li) return;
  const profile = ensureProfileSeeded();
  const machine = profile.machines.find((m) => m.id === li.dataset.id);
  if (!machine) return;
  if (!confirm(`「${machine.name}」を削除しますか?`)) return;
  profile.machines = profile.machines.filter((m) => m.id !== li.dataset.id);
  saveProfile(profile);
  renderMachinesList();
});

machineForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("machineName");
  const weightInput = document.getElementById("machineWeight");
  const repsInput = document.getElementById("machineReps");
  const setsInput = document.getElementById("machineSets");
  const targetWeightInput = document.getElementById("machineTargetWeight");
  const targetRepsInput = document.getElementById("machineTargetReps");

  const name = nameInput.value.trim();
  if (!name) {
    alert("マシン名を入力してください");
    return;
  }

  const profile = ensureProfileSeeded();
  profile.machines.push({
    id: makeId(),
    name,
    currentWeightKg: getNumberOrNull(weightInput),
    defaultReps: getNumberOrNull(repsInput) ?? 15,
    defaultSets: getNumberOrNull(setsInput) ?? 3,
    active: true,
    targetWeightKg: getNumberOrNull(targetWeightInput),
    targetReps: getNumberOrNull(targetRepsInput),
  });
  saveProfile(profile);

  machineForm.reset();
  repsInput.value = 15;
  setsInput.value = 3;
  renderMachinesList();
});

// ---------- 今日の記録画面 ----------

const form = document.getElementById("record-form");
const dateInput = document.getElementById("date");
const bodyWeightInput = document.getElementById("bodyWeight");
const distanceKmInput = document.getElementById("distanceKm");
const durationMinInput = document.getElementById("durationMin");
const inclineInput = document.getElementById("incline");
const isRunWalkComboInput = document.getElementById("isRunWalkCombo");
const stretchGroup = document.getElementById("stretch-group");
const stretchDurationInput = document.getElementById("stretchDuration");
const memoInput = document.getElementById("memo");
const strengthMachinesEl = document.getElementById("strength-machines");
const strengthEmptyEl = document.getElementById("strength-empty");

attachAutoDecimalInput(bodyWeightInput);

function setCardioType(type) {
  for (const radio of form.querySelectorAll('input[name="cardioType"]')) {
    radio.checked = radio.value === type;
  }
}

function getCardioType() {
  const checked = form.querySelector('input[name="cardioType"]:checked');
  return checked ? checked.value : "run";
}

function renderStrengthMachines(existingEntries) {
  const machines = getActiveMachines();
  strengthMachinesEl.innerHTML = "";
  strengthEmptyEl.hidden = machines.length > 0;

  const entriesById = {};
  if (existingEntries) {
    for (const entry of existingEntries) {
      entriesById[entry.machineId] = entry;
    }
  }

  const templ = getTemplateForDate(dateInput.value);
  const defaultChecked = !existingEntries && templ.showStrength;

  for (const m of machines) {
    const entry = entriesById[m.id];
    const checked = existingEntries ? Boolean(entry) : defaultChecked;
    const weight = entry ? entry.weightKg : m.currentWeightKg;
    const reps = entry ? entry.reps : m.defaultReps;
    const sets = entry ? entry.sets : m.defaultSets;

    const row = document.createElement("div");
    row.className = "strength-row";
    row.dataset.machineId = m.id;
    row.innerHTML = `
      <label class="checkbox-label strength-check">
        <input type="checkbox" class="s-checked" ${checked ? "checked" : ""}> ${escapeAttr(m.name)}
      </label>
      <div class="field-row strength-inputs">
        <div class="field">
          <label>重量(kg)</label>
          <input type="number" class="s-weight" step="0.5" min="0" value="${weight ?? ""}">
        </div>
        <div class="field">
          <label>回数</label>
          <input type="number" class="s-reps" step="1" min="0" value="${reps ?? ""}">
        </div>
        <div class="field">
          <label>セット数</label>
          <input type="number" class="s-sets" step="1" min="0" value="${sets ?? ""}">
        </div>
      </div>
    `;
    strengthMachinesEl.appendChild(row);
  }
}

function populateFormForDate(date) {
  const existing = findLog(date);
  const templ = getTemplateForDate(date);

  if (existing) {
    setTextFieldValue(bodyWeightInput, existing.bodyWeightKg !== null && existing.bodyWeightKg !== undefined ? existing.bodyWeightKg.toFixed(1) : "");
    setCardioType(existing.cardio.type);
    distanceKmInput.value = existing.cardio.distanceKm ?? "";
    durationMinInput.value = existing.cardio.durationMin ?? "";
    inclineInput.checked = Boolean(existing.cardio.incline);
    isRunWalkComboInput.checked = Boolean(existing.cardio.isRunWalkCombo);
    stretchDurationInput.value = existing.stretch && existing.stretch.durationMin !== null ? existing.stretch.durationMin : "";
    memoInput.value = existing.memo || "";
    renderStrengthMachines(existing.strength ? existing.strength.entries : []);
  } else {
    setTextFieldValue(bodyWeightInput, "");
    setCardioType(templ.cardio.type);
    distanceKmInput.value = templ.cardio.distanceKm;
    durationMinInput.value = templ.cardio.durationMin;
    inclineInput.checked = templ.cardio.incline;
    isRunWalkComboInput.checked = templ.cardio.isRunWalkCombo;
    stretchDurationInput.value = templ.showStretch ? templ.stretchDurationMin : "";
    memoInput.value = "";
    renderStrengthMachines(null);
  }

  stretchGroup.hidden = !isMonday(date);
}

dateInput.addEventListener("change", () => {
  populateFormForDate(dateInput.value);
});

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const date = dateInput.value;
  if (!date) {
    showSaveMessage("日付を入力してください");
    return;
  }

  const strengthEntries = [];
  for (const row of strengthMachinesEl.querySelectorAll(".strength-row")) {
    const checked = row.querySelector(".s-checked").checked;
    if (!checked) continue;
    strengthEntries.push({
      machineId: row.dataset.machineId,
      weightKg: getNumberOrNull(row.querySelector(".s-weight")),
      reps: getNumberOrNull(row.querySelector(".s-reps")),
      sets: getNumberOrNull(row.querySelector(".s-sets")),
    });
  }

  const now = new Date().toISOString();
  const newLog = {
    id: makeId(),
    date,
    bodyWeightKg: getNumberOrNull(bodyWeightInput),
    cardio: {
      type: getCardioType(),
      distanceKm: getNumberOrNull(distanceKmInput),
      durationMin: getNumberOrNull(durationMinInput),
      incline: inclineInput.checked,
      isRunWalkCombo: isRunWalkComboInput.checked,
    },
    strength: { entries: strengthEntries },
    stretch: { durationMin: getNumberOrNull(stretchDurationInput) },
    memo: memoInput.value.trim(),
    createdAt: now,
    updatedAt: now,
  };

  upsertLog(newLog);
  showSaveMessage("保存しました");
  dateInput.value = todayString();
  populateFormForDate(dateInput.value);
});

let saveMessageTimer = null;
function showSaveMessage(text) {
  const el = document.getElementById("save-message");
  el.textContent = text;
  clearTimeout(saveMessageTimer);
  saveMessageTimer = setTimeout(() => {
    el.textContent = "";
  }, 2000);
}

// ---------- 記録一覧画面 ----------

const recordsList = document.getElementById("records-list");
const recordsToggle = document.getElementById("records-toggle");
const RECORDS_PAGE_SIZE = 14;
let recordsExpanded = false;

function machineName(machineId) {
  const profile = ensureProfileSeeded();
  const machine = profile.machines.find((m) => m.id === machineId);
  return machine ? machine.name : "(削除済みマシン)";
}

function summarizeLog(log) {
  const parts = [];
  if (log.bodyWeightKg !== null && log.bodyWeightKg !== undefined) {
    parts.push(`体重 ${log.bodyWeightKg}kg`);
  }
  if (log.cardio && (log.cardio.distanceKm || log.cardio.durationMin)) {
    const typeLabel = log.cardio.type === "walk" ? "ウォーキング" : "ランニング";
    const distance = log.cardio.distanceKm !== null && log.cardio.distanceKm !== undefined ? `${log.cardio.distanceKm}km` : "-";
    const duration = log.cardio.durationMin !== null && log.cardio.durationMin !== undefined ? `${log.cardio.durationMin}分` : "-";
    parts.push(`${typeLabel} ${distance}/${duration}${log.cardio.incline ? "(傾斜)" : ""}`);
  }
  if (log.strength && log.strength.entries && log.strength.entries.length > 0) {
    const names = log.strength.entries.map((e) => machineName(e.machineId)).join("・");
    parts.push(`筋トレ: ${names}`);
  }
  if (log.stretch && log.stretch.durationMin) {
    parts.push(`ストレッチ ${log.stretch.durationMin}分`);
  }
  return parts.length > 0 ? parts.join(" / ") : "記録なし";
}

function renderLogsList() {
  const logs = loadLogs();
  recordsList.innerHTML = "";

  if (logs.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "記録がまだありません";
    recordsList.appendChild(li);
    recordsToggle.hidden = true;
    return;
  }

  const visible = recordsExpanded ? logs : logs.slice(0, RECORDS_PAGE_SIZE);

  for (const log of visible) {
    const li = document.createElement("li");
    li.dataset.date = log.date;
    li.innerHTML = `
      <div class="record-row-main">
        <div>
          <div class="record-date">${log.date}</div>
          <div class="record-summary">${summarizeLog(log)}</div>
        </div>
        <button type="button" class="delete-btn record-delete">削除</button>
      </div>
    `;
    recordsList.appendChild(li);
  }

  if (logs.length > RECORDS_PAGE_SIZE) {
    recordsToggle.hidden = false;
    recordsToggle.textContent = recordsExpanded ? "閉じる" : `もっと見る(全${logs.length}件)`;
  } else {
    recordsToggle.hidden = true;
  }
}

recordsToggle.addEventListener("click", () => {
  recordsExpanded = !recordsExpanded;
  renderLogsList();
});

recordsList.addEventListener("click", (e) => {
  const deleteBtn = e.target.closest(".record-delete");
  if (deleteBtn) {
    const li = deleteBtn.closest("li[data-date]");
    if (!li) return;
    if (!confirm(`${li.dataset.date}の記録を削除しますか?`)) return;
    deleteLog(li.dataset.date);
    renderLogsList();
    return;
  }

  const li = e.target.closest("li[data-date]");
  if (!li) return;
  dateInput.value = li.dataset.date;
  showView("home");
});

// ---------- 初期化 ----------

ensureProfileSeeded();
dateInput.value = todayString();
populateFormForDate(dateInput.value);
