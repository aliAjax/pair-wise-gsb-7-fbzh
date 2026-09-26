// 撤展回装：按原木箱、原清单回装；缺件不能封箱；后续补到的附件另留修补记录
import React, { useState } from 'react';
import {
  crateProgress, crateStatus, itemStatus, missingAttachments, sealCrate, sealBlockers,
  returnToCrate, addSupplement, supplementsFor, unresolvedMissing,
} from '../../domain/ledger.js';
import { Pill, Bar, statusTone } from './bits.jsx';

export function RepackPage({ ledger, run }) {
  const [crateId, setCrateId] = useState(ledger.crates[0]?.id);
  const crate = ledger.crates.find(c => c.id === crateId) || ledger.crates[0];
  const items = ledger.items.filter(i => i.crateId === crate.id).sort((a, b) => a.listNo - b.listNo);
  const blockers = sealBlockers(ledger, crate);

  return <>
    <header className="topbar">
      <div><span className="eyebrow">DEINSTALL</span><h1>撤展回装</h1></div>
      <div className="top-actions"><span className="top-note">按原木箱、原清单回装 · 缺件不能封箱</span></div>
    </header>
    <div className="content">
      <section className="list-pane">
        <div className="list-head"><div><h2>回装木箱</h2><span>封箱前逐箱核对</span></div></div>
        <div className="exhibit-list">
          {ledger.crates.map(c => {
            const cp = crateProgress(c, ledger.items);
            const cs = crateStatus(c, ledger.items);
            return <button className={'exhibit-row ' + (crate.id === c.id ? 'chosen' : '')} key={c.id} onClick={() => setCrateId(c.id)}>
              <span className="thumb crate-thumb">箱</span>
              <span className="row-copy">
                <strong>{c.id} · {c.lender}</strong>
                <small>回装 {cp.repacked}/{cp.total}{c.sealedAt ? ` · 封箱于 ${c.sealedAt}` : ''}</small>
                <Bar value={cp.repacked} total={cp.total} />
              </span>
              <Pill tone={statusTone(cs)}>{cs}</Pill>
            </button>;
          })}
        </div>
        <p className="pane-note">回装单以开箱时的原清单为准；缺件先如实登记，补到后另留修补记录，不改原始回装单。</p>
      </section>

      <section className="form-panel wide">
        <div className="panel-title">
          <div><span className="eyebrow">CRATE {crate.id}</span><h2>{crate.id} · 原清单回装</h2></div>
          <Pill tone={statusTone(crateStatus(crate, ledger.items))}>{crateStatus(crate, ledger.items)}</Pill>
        </div>

        {items.map(item => <RepackCard key={item.id + (item.repack?.at || 'open') + supplementsFor(ledger, item.id).length}
          ledger={ledger} item={item} run={run} sealed={!!crate.sealedAt} />)}

        {crate.sealedAt
          ? <div className="sealed-banner">🔒 已封箱 · {crate.sealedAt} —— 按原木箱、原清单回装完成</div>
          : <div className="seal-bar">
              <div>
                {blockers.ok
                  ? <p>作品与附件已全部归位，可以封箱。</p>
                  : <>
                      {blockers.notBack.length > 0 && <p>未回装 {blockers.notBack.length} 件：{blockers.notBack.map(i => `《${i.title}》`).join('、')}</p>}
                      {blockers.missing.length > 0 && <p className="missing">缺件 {blockers.missing.length} 项：{blockers.missing.map(m => `《${m.item.title}》${m.attachment}`).join('、')}</p>}
                    </>}
              </div>
              <button className="primary" disabled={!blockers.ok} onClick={() => run(sealCrate(ledger, crate.id))}>封箱</button>
            </div>}
      </section>
    </div>
  </>;
}

function RepackCard({ ledger, item, run, sealed }) {
  const status = itemStatus(item);
  return <div className="check-card">
    <div className="check-head">
      <span className="list-no">清单 {String(item.listNo).padStart(2, '0')}</span>
      <strong>{item.title}</strong>
      <small className="muted">{item.id}</small>
      <Pill tone={statusTone(status)}>{status}</Pill>
    </div>

    {item.placement && <p className="muted" style={{ fontSize: 11, margin: '10px 0 0' }}>
      在展于 {item.placement.boothId}，请先在「展位落位」撤下，再回装。</p>}

    {!item.repack && !item.placement && !sealed && <ReturnForm ledger={ledger} item={item} run={run} />}

    {item.repack && <RepackSummary ledger={ledger} item={item} run={run} sealed={sealed} />}
  </div>;
}

function ReturnForm({ ledger, item, run }) {
  const [returned, setReturned] = useState(() => {
    const m = {};
    item.expected.forEach(a => { m[a] = true; });
    return m;
  });
  const missing = item.expected.filter(a => !returned[a]);
  return <div className="check-form">
    <label>按原清单核对附件入箱（缺件取消勾选）</label>
    <div className="att-grid">
      {item.expected.map(a => (
        <label className="att" key={a}>
          <input type="checkbox" checked={!!returned[a]} onChange={e => setReturned({ ...returned, [a]: e.target.checked })} />
          <span>{a}</span>
          {!returned[a] && <em className="missing">缺</em>}
        </label>
      ))}
    </div>
    {missing.length > 0 && <p className="missing" style={{ fontSize: 11, margin: 0 }}>
      缺件 {missing.length} 项：{missing.join('、')} —— 缺件不能封箱，补到后另留修补记录</p>}
    <div className="check-actions">
      <span />
      <button className="primary btn-small" onClick={() => run(returnToCrate(ledger, item.id, returned))}>登记回装</button>
    </div>
  </div>;
}

function RepackSummary({ ledger, item, run, sealed }) {
  const missing = missingAttachments(item);
  const unresolved = unresolvedMissing(ledger, item);
  const sups = supplementsFor(ledger, item.id);
  return <>
    <div className="check-summary">
      回装于 {item.repack.at}
      　·　附件入箱 {item.expected.filter(a => item.repack.returned[a]).length}/{item.expected.length}
      {missing.length > 0 && <span className="missing">　·　缺件：{missing.join('、')}</span>}
      {missing.length > 0 && unresolved.length === 0 && <span>（均已补到，见修补记录）</span>}
    </div>
    {sups.length > 0 && <div className="supp-list">
      {sups.map(s => <div className="supp-item" key={s.id}>
        修补记录 <b>{s.id}</b> · 「{s.attachment}」{s.at} 补到{s.note ? ` · ${s.note}` : ''}
      </div>)}
    </div>}
    {!sealed && unresolved.length > 0 && <SupplementForm ledger={ledger} item={item} run={run} missing={unresolved} />}
  </>;
}

function SupplementForm({ ledger, item, run, missing }) {
  const [att, setAtt] = useState(missing[0]);
  const [note, setNote] = useState('');
  const value = missing.includes(att) ? att : missing[0];
  return <div className="supp-form">
    <strong>补件登记</strong>
    <small>后续补到的附件另留修补记录，不改原始回装单</small>
    <div className="review-row">
      <select value={value} onChange={e => setAtt(e.target.value)}>
        {missing.map(a => <option key={a}>{a}</option>)}
      </select>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="来源与说明，如：借展方补寄" />
      <button className="secondary btn-small" onClick={() => run(addSupplement(ledger, item.id, value, note))}>保存修补记录</button>
    </div>
  </div>;
}
