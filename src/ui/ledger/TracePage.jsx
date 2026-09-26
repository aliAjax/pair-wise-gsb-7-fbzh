// 留档追溯：从木箱追到作品和展位；事件流水与台账可导出
import React, { useState } from 'react';
import { traceCrate } from '../../domain/ledger.js';
import { exportLedger } from '../../store/archive.js';
import { Pill, statusTone } from './bits.jsx';

export function TracePage({ ledger, notify, onReset }) {
  const [crateId, setCrateId] = useState(ledger.crates[0]?.id || '');
  const [eventScope, setEventScope] = useState('crate'); // crate | all
  const t = traceCrate(ledger, crateId) || traceCrate(ledger, ledger.crates[0]?.id);
  const events = (eventScope === 'all' ? ledger.events : t.events).slice().reverse();

  return <>
    <header className="topbar">
      <div><span className="eyebrow">ARCHIVE & TRACE</span><h1>留档追溯</h1></div>
      <div className="top-actions">
        <button className="secondary" onClick={() => { exportLedger(ledger); notify('台账已导出为 JSON'); }}>↓ 导出台账</button>
        <button className="secondary" onClick={onReset}>↺ 重置演示数据</button>
      </div>
    </header>
    <div className="single-pane">
      <section>
        <div className="group-title" style={{ marginTop: 0 }}>按木箱追溯</div>
        <div className="chips">
          {ledger.crates.map(c => (
            <button key={c.id} className={t.crate.id === c.id ? 'on' : ''} onClick={() => setCrateId(c.id)}>
              {c.id} · {c.lender}
            </button>
          ))}
        </div>
        <table className="trace-table">
          <thead>
            <tr><th>清单</th><th>作品</th><th>状态</th><th>接收结论</th><th>展位</th><th>附件 / 补件</th></tr>
          </thead>
          <tbody>
            {t.items.map(i => (
              <tr key={i.id}>
                <td className="muted">{String(i.listNo).padStart(2, '0')}</td>
                <td><b>{i.title}</b><br /><span className="muted">{i.id} · {i.type}</span></td>
                <td><Pill tone={statusTone(i.status)}>{i.status}</Pill></td>
                <td>{i.acceptance || '—'}{i.acceptanceNote ? <><br /><span className="muted">{i.acceptanceNote}</span></> : null}</td>
                <td>{i.booth ? <><b>{i.booth.id}</b> · {i.booth.room}</> : (i.repack ? `已回装 ${t.crate.id}` : '—')}</td>
                <td>
                  {i.expected.join('、') || '—'}
                  {i.unresolved.length > 0 && <><br /><span className="missing">缺：{i.unresolved.join('、')}</span></>}
                  {i.supplements.map(s => <div key={s.id} className="muted">补件 {s.id} · {s.attachment}</div>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <div className="group-title">留档事件</div>
        <div className="chips">
          <button className={eventScope === 'crate' ? 'on' : ''} onClick={() => setEventScope('crate')}>本箱（{t.crate.id}）</button>
          <button className={eventScope === 'all' ? 'on' : ''} onClick={() => setEventScope('all')}>全部木箱</button>
        </div>
        <div>
          {events.length === 0 && <p className="muted" style={{ fontSize: 12 }}>暂无留档事件</p>}
          {events.map(e => (
            <div className="event-row" key={e.id}>
              <time>{e.at}</time>
              <span className="event-kind">{e.kind}</span>
              <span>{e.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  </>;
}
