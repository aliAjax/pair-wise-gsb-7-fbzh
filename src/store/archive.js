// 到场台账 · 留档层
// 台账（含事件流水）整体存 localStorage，重开页面后仍能从木箱追到作品和展位。
import { seedLedger } from '../domain/ledger.js';

const KEY = 'arrival-ledger-v1';

export function loadLedger() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const l = JSON.parse(raw);
      if (l && Array.isArray(l.crates) && Array.isArray(l.items) && Array.isArray(l.events)) return l;
    }
  } catch { /* 数据损坏时回退到演示数据 */ }
  return seedLedger();
}

export function saveLedger(ledger) {
  try { localStorage.setItem(KEY, JSON.stringify(ledger)); } catch { /* 存储满时静默失败 */ }
}

export function resetLedger() {
  const l = seedLedger();
  saveLedger(l);
  return l;
}

export function exportLedger(ledger) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(ledger, null, 2)], { type: 'application/json' }));
  a.download = 'arrival-ledger.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
