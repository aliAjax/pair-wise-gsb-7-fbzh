// 开箱点交：按随箱清单逐件登记外观与附件；箱内一件待复核不影响其余作品上墙
import React, { useState } from 'react';
import {
  APPEARANCES, crateProgress, crateStatus, itemStatus, saveCheck, resolveReview,
} from '../../domain/ledger.js';
import { Pill, Bar, statusTone } from './bits.jsx';

export function CratesPage({ ledger, run }) {
  const [crateId, setCrateId] = useState(ledger.crates[0]?.id);
  const crate = ledger.crates.find(c => c.id === crateId) || ledger.crates[0];
  const items = ledger.items.filter(i => i.crateId === crate.id).sort((a, b) => a.listNo - b.listNo);
  const p = crateProgress(crate, ledger.items);
  const st = crateStatus(crate, ledger.items);

  return <>
    <header className="topbar">
      <div><span className="eyebrow">ARRIVAL LEDGER</span><h1>开箱点交</h1></div>
      <div className="top-actions"><span className="top-note">按随箱清单逐件登记外观与附件</span></div>
    </header>
    <div className="content">
      <section className="list-pane">
        <div className="list-head"><div><h2>到场木箱</h2><span>{ledger.crates.length} 只木箱</span></div></div>
        <div className="exhibit-list">
          {ledger.crates.map(c => {
            const cp = crateProgress(c, ledger.items);
            const cs = crateStatus(c, ledger.items);
            return <button className={'exhibit-row ' + (crate.id === c.id ? 'chosen' : '')} key={c.id} onClick={() => setCrateId(c.id)}>
              <span className="thumb crate-thumb">箱</span>
              <span className="row-copy">
                <strong>{c.id} · {c.lender}</strong>
                <small>到场 {c.arrivedAt} · 点交 {cp.checked}/{cp.total}</small>
                <Bar value={cp.checked} total={cp.total} />
              </span>
              <Pill tone={statusTone(cs)}>{cs}</Pill>
            </button>;
          })}
        </div>
        <p className="pane-note">点交逐件独立：箱内一件需复核，只锁定该件，其余作品点交通过后可继续接收、上墙。</p>
      </section>
      <section className="form-panel wide">
        <div className="panel-title">
          <div><span className="eyebrow">CRATE {crate.id}</span><h2>{crate.id} · {crate.lender}</h2></div>
          <Pill tone={statusTone(st)}>{st}</Pill>
        </div>
        <div className="crate-meta">
          <span>到场 <b>{crate.arrivedAt}</b></span>
          <span>清单 <b>{p.total}</b> 件</span>
          <span>已点交 <b>{p.checked}</b></span>
          <span>已落位 <b>{p.placed}</b></span>
          <span>已回装 <b>{p.repacked}</b></span>
        </div>
        {items.map(item => (
          <CheckCard key={item.id + (item.check?.checkedAt || 'new') + (item.check?.reviewedAt || '')}
            ledger={ledger} item={item} run={run} />
        ))}
      </section>
    </div>
  </>;
}

function CheckCard({ ledger, item, run }) {
  const c = item.check;
  const [appearance, setAppearance] = useState(c?.appearance || '');
  const [note, setNote] = useState(c?.appearanceNote || '');
  const [atts, setAtts] = useState(() => {
    const m = {};
    item.expected.forEach(a => { m[a] = c ? !!c.attachments[a] : false; });
    return m;
  });
  const [result, setResult] = useState(c?.result || '通过');
  const [reviewNote, setReviewNote] = useState('');
  const locked = !!item.repack;
  const status = itemStatus(item);
  const missingAtCheck = c ? item.expected.filter(a => !c.attachments[a]) : [];

  return <div className="check-card">
    <div className="check-head">
      <span className="list-no">清单 {String(item.listNo).padStart(2, '0')}</span>
      <strong>{item.title}</strong>
      <small className="muted">{item.id} · {item.type}</small>
      <Pill tone={statusTone(status)}>{status}</Pill>
    </div>
    {c && <div className="check-summary">
      外观{c.appearance}{c.appearanceNote ? `（${c.appearanceNote}）` : ''}
      　·　附件 {item.expected.filter(a => c.attachments[a]).length}/{item.expected.length} 在箱
      {missingAtCheck.length > 0 && <span className="missing">（缺：{missingAtCheck.join('、')}）</span>}
      　·　登记于 {c.checkedAt}
      {c.reviewedAt && <span>　·　复核通过 {c.reviewedAt}{c.reviewNote ? `（${c.reviewNote}）` : ''}</span>}
    </div>}
    {!locked && <div className="check-form">
      <div className="two">
        <label>外观状况
          <select value={appearance} onChange={e => setAppearance(e.target.value)}>
            <option value="">请选择…</option>
            {APPEARANCES.map(a => <option key={a}>{a}</option>)}
          </select>
        </label>
        <label>外观备注
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="痕迹位置、照片编号…" />
        </label>
      </div>
      <label>随箱附件核对（逐项勾选确认在箱）</label>
      <div className="att-grid">
        {item.expected.map(a => (
          <label className="att" key={a}>
            <input type="checkbox" checked={!!atts[a]} onChange={e => setAtts({ ...atts, [a]: e.target.checked })} />
            <span>{a}</span>
            {c && !atts[a] && <em className="missing">缺</em>}
          </label>
        ))}
      </div>
      <div className="check-actions">
        <div className="radio-row">
          {[['通过', '✓ 点交通过'], ['待复核', '⚠ 需复核']].map(([r, label]) => (
            <button key={r}
              className={'radio-pill ' + (result === r ? 'on' : '') + (r === '待复核' && result === r ? ' warn' : '')}
              onClick={() => setResult(r)}>{label}</button>
          ))}
        </div>
        <button className="primary btn-small"
          onClick={() => run(saveCheck(ledger, item.id, { appearance, appearanceNote: note, attachments: atts, result }))}>
          保存登记
        </button>
      </div>
    </div>}
    {c?.result === '待复核' && !locked && <div className="review-box">
      <strong>复核处理</strong>
      <small>复核只针对本件；同箱其余作品可继续上墙</small>
      <div className="review-row">
        <input value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="复核结论，如：借展方确认压痕为原有" />
        <button className="secondary btn-small" onClick={() => run(resolveReview(ledger, item.id, reviewNote))}>复核通过</button>
      </div>
    </div>}
  </div>;
}
