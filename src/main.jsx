import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import * as Store from './ledger/store.js';
import Overview from './ledger/Overview.jsx';
import Unpack from './ledger/Unpack.jsx';
import Receive from './ledger/Receive.jsx';
import Booths from './ledger/Booths.jsx';
import Repack from './ledger/Repack.jsx';
import Records from './ledger/Records.jsx';

const NAV = [
  { id: 'overview', icon: '▦', label: '台账总览' },
  { id: 'unpack', icon: '▣', label: '开箱点交' },
  { id: 'receive', icon: '✓', label: '接收结论' },
  { id: 'booths', icon: '◳', label: '展位落位' },
  { id: 'repack', icon: '↩', label: '撤展回装' },
  { id: 'records', icon: '≡', label: '留档记录' },
];

function App() {
  const [state, setState] = useState(Store.loadLedger);
  const [view, setView] = useState('overview');
  const [focus, setFocus] = useState(null);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  useEffect(() => Store.saveLedger(state), [state]);

  const notify = (msg, tone = 'ok') => {
    setToast({ msg, tone });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  };

  // 页面调用 run(fn)：fn 直接在台账草稿上执行判断层的流转动作，失败时给出错误、不落库
  const run = (fn) => {
    const draft = structuredClone(state);
    try {
      fn(draft);
      setState(draft);
      notify('已保存并留档');
    } catch (e) {
      notify(e.message, 'err');
    }
  };

  const go = (page, focusId) => {
    setView(page);
    setFocus(focusId);
  };

  const reset = () => {
    if (window.confirm('将清空本机台账并恢复演示数据，确定？')) {
      setState(Store.resetLedger());
      notify('已恢复演示台账');
      setView('overview');
    }
  };

  const page = {
    overview: <Overview s={state} go={go} />,
    unpack: <Unpack s={state} run={run} focusId={focus} />,
    receive: <Receive s={state} run={run} focusId={focus} />,
    booths: <Booths s={state} run={run} />,
    repack: <Repack s={state} run={run} focusId={focus} />,
    records: <Records s={state} onExport={() => Store.exportLedger(state)} onReset={reset} />,
  }[view];

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <span className="mark">M</span>
          <span>借展到场台账</span>
        </div>
        <div className="side-label">借展项目</div>
        <div className="project">
          <span className="project-dot" />
          <div>
            <strong>潮汐之后</strong>
            <small>2026 春季展 · 点交/上墙/回装</small>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <button key={n.id} className={view === n.id ? 'active' : ''} onClick={() => go(n.id, null)}>
              {n.icon} <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <small>已自动保存到本机 · 重开可继续追溯</small>
        </div>
      </aside>

      <main className="workspace">
        {page}
        {toast && <div className={`toast ${toast.tone === 'err' ? 'err' : ''}`}>{toast.msg}</div>}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
