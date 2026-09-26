// 工作台外壳：统一导航；台账状态在此持有，变更走 domain 纯函数，留档走 store
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { GuideSection } from './ui/guide.jsx';
import { CratesPage } from './ui/ledger/CratesPage.jsx';
import { PlacementPage } from './ui/ledger/PlacementPage.jsx';
import { RepackPage } from './ui/ledger/RepackPage.jsx';
import { TracePage } from './ui/ledger/TracePage.jsx';
import { loadLedger, saveLedger, resetLedger } from './store/archive.js';
import { unresolvedMissing } from './domain/ledger.js';

const NAV = [
  { id: 'crates', icon: '▤', label: '开箱点交' },
  { id: 'placement', icon: '⌖', label: '展位落位' },
  { id: 'repack', icon: '↩', label: '撤展回装' },
  { id: 'trace', icon: '◎', label: '留档追溯' },
  { id: 'exhibits', icon: '▧', label: '展项内容' },
];

function App() {
  const [page, setPage] = useState('crates');
  const [ledger, setLedger] = useState(loadLedger);
  const [toast, setToast] = useState('');

  useEffect(() => { saveLedger(ledger); }, [ledger]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // 所有页面通过 run 提交变更：domain 返回新台账则替换，message 统一走 toast
  const run = res => {
    if (!res) return;
    if (res.ok && res.ledger) setLedger(res.ledger);
    if (res.message) setToast(res.message);
  };
  const notify = msg => setToast(msg);
  const onReset = () => {
    if (window.confirm('确定重置为演示数据？当前台账与留档将被覆盖。')) {
      setLedger(resetLedger());
      setToast('已重置为演示数据');
    }
  };

  const reviewCount = ledger.items.filter(i => i.check?.result === '待复核').length;
  const missingCount = ledger.items.reduce((n, i) => n + unresolvedMissing(ledger, i).length, 0);
  const badge = id => id === 'crates' ? reviewCount : id === 'repack' ? missingCount : 0;

  return <div className="app">
    <aside>
      <div className="brand"><span className="mark">M</span><span>展览工作台</span></div>
      <div className="side-label">当前项目</div>
      <div className="project">
        <span className="project-dot"></span>
        <div><strong>潮汐之后</strong><small>2026 秋季借展</small></div>
        <span>⌄</span>
      </div>
      <div className="side-label">到场台账</div>
      <nav>
        {NAV.map(n => (
          <button key={n.id} className={page === n.id ? 'active' : ''} onClick={() => setPage(n.id)}>
            {n.icon} <span>{n.label}</span>
            {badge(n.id) > 0 && <b>{badge(n.id)}</b>}
          </button>
        ))}
      </nav>
      <div className="side-foot">
        <button>⚙ 设置</button>
        <small>台账已本地留档 · 重开可追</small>
      </div>
    </aside>

    {page === 'exhibits'
      ? <GuideSection />
      : <main className="workspace">
          {page === 'crates' && <CratesPage ledger={ledger} run={run} />}
          {page === 'placement' && <PlacementPage ledger={ledger} run={run} />}
          {page === 'repack' && <RepackPage ledger={ledger} run={run} />}
          {page === 'trace' && <TracePage ledger={ledger} notify={notify} onReset={onReset} />}
        </main>}

    {toast && <div className="toast">{toast}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
