// 記録データのバックアップ(エクスポート・インポート)

const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");

exportBtn.addEventListener("click", () => {
  const payload = {
    type: "gym-training-trend-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    logs: loadLogs(),
    profile: ensureProfileSeeded(),
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `gym-training-trend-backup-${todayString()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

importBtn.addEventListener("click", () => {
  importFile.click();
});

function isValidImportedLog(l) {
  return l && typeof l === "object" && typeof l.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(l.date);
}

function sanitizeImportedLog(l) {
  const num = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : null);
  const cardio = l.cardio && typeof l.cardio === "object" ? l.cardio : {};
  const strength = l.strength && typeof l.strength === "object" ? l.strength : {};
  const entries = Array.isArray(strength.entries) ? strength.entries : [];
  const stretch = l.stretch && typeof l.stretch === "object" ? l.stretch : {};

  return {
    id: typeof l.id === "string" ? l.id : makeId(),
    date: l.date,
    bodyWeightKg: num(l.bodyWeightKg),
    cardio: {
      type: cardio.type === "walk" ? "walk" : "run",
      distanceKm: num(cardio.distanceKm),
      durationMin: num(cardio.durationMin),
      incline: Boolean(cardio.incline),
      isRunWalkCombo: Boolean(cardio.isRunWalkCombo),
    },
    strength: {
      entries: entries
        .filter((e) => e && typeof e.machineId === "string")
        .map((e) => ({
          machineId: e.machineId,
          weightKg: num(e.weightKg),
          reps: num(e.reps),
          sets: num(e.sets),
        })),
    },
    stretch: { durationMin: num(stretch.durationMin) },
    memo: typeof l.memo === "string" ? l.memo : "",
    createdAt: typeof l.createdAt === "string" ? l.createdAt : new Date().toISOString(),
    updatedAt: typeof l.updatedAt === "string" ? l.updatedAt : new Date().toISOString(),
  };
}

function isValidImportedProfile(p) {
  return p && typeof p === "object" && Array.isArray(p.machines);
}

importFile.addEventListener("change", () => {
  const file = importFile.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(reader.result);
    } catch {
      alert("ファイルの読み込みに失敗しました。正しいバックアップファイルか確認してください。");
      importFile.value = "";
      return;
    }

    const rawLogs = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.logs) ? parsed.logs : null;
    if (!rawLogs) {
      alert("ファイルの形式が正しくありません。");
      importFile.value = "";
      return;
    }

    const incomingLogs = rawLogs.filter(isValidImportedLog).map(sanitizeImportedLog);
    if (incomingLogs.length === 0) {
      alert("有効な記録が見つかりませんでした。");
      importFile.value = "";
      return;
    }

    const incomingProfile = !Array.isArray(parsed) && isValidImportedProfile(parsed.profile) ? parsed.profile : null;

    const overlapCount = incomingLogs.filter((l) => findLog(l.date)).length;
    const profileNote = incomingProfile ? "\n(マシン・プロフィール設定も復元されます)" : "";
    const message =
      (overlapCount > 0
        ? `${incomingLogs.length}件の記録を読み込みます。うち${overlapCount}件は既存の同じ日付のデータを上書きします。よろしいですか？`
        : `${incomingLogs.length}件の記録を読み込みます。よろしいですか？`) + profileNote;

    if (!confirm(message)) {
      importFile.value = "";
      return;
    }

    const logs = loadLogs();
    for (const log of incomingLogs) {
      const index = logs.findIndex((l) => l.date === log.date);
      if (index >= 0) {
        logs[index] = log;
      } else {
        logs.push(log);
      }
    }
    logs.sort((a, b) => (a.date < b.date ? 1 : -1));
    saveLogs(logs);

    if (incomingProfile) {
      saveProfile(incomingProfile);
    }

    renderLogsList();
    populateFormForDate(dateInput.value);
    if (typeof renderGraphView === "function") {
      renderGraphView();
    }

    alert(`${incomingLogs.length}件の記録を復元しました。`);
    importFile.value = "";
  };
  reader.readAsText(file);
});
