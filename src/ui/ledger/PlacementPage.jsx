// 展位落位：落位前要有明确的接收结论；同一展位同时只放一件
import React, { useState } from 'react';
import {
  ACCEPTANCES, boothOccupant, emptyBooths, itemStatus,
  placeItem, removeFromWall, setAcceptance,
} from '../../domain/ledger.js';
import { Pill, statusTone, Empty } from './bits.jsx';

export function PlacementPage({ ledger, run }) {
  const items = ledger.items;
  const unchecked = items.filter(i => !i.check && !i.repack);
  const review = items.filter(i => i.check?.result === '待复核' && !i.repack);
  const needAccept = items.filter(i => i.check?.result === '通过' && !i.acceptance && !i.placement && !i.repack);
  const placeable = items.filter(i => i.acceptance && i.acceptance !== '暂缓接收' && !i.placement && !i.repack);
  const suspended = items.filter(i => i.acceptance === '暂缓接收' && !i.placement && !i.repack);
  const placed = items.filter(i => i.placement);

  return <>
    <header className="topbar">
      <div><span className="eyebrow">PLACEMENT</span><h1>展位落位</h1></div>
      <div className="top-actions"><span className="top-note">落位前需有接收结论 · 同一展位同时只放一件</span></div>
    </header>
    <div className="content">
      <section className="list-pane">
        <div className="list-head"><div><h2>作品队列</h2><span>{placeable.length} 件可落位</span></div></div>

        <div className="group-title">可落位（{placeable.length}）</div>
        {placeable.length === 0 && <Empty>暂无具备落位条件的作品</Empty>}
        {placeable.map(i => <WorkCard key={i.id + i.acceptance} ledger={ledger} item={i} run={run} mode="place" />)}

        <div className="group-title">待接收结论（{needAccept.length}）</div>
        {needAccept.map(i => <WorkCard key={i.id + 'acc'} ledger={ledger} item={i} run={run} mode="accept" />)}

        {suspended.length > 0 && <>
          <div className="group-title">暂缓接收（{suspended.length}）</div>
          {suspended.map(i => <WorkCard key={i.id + 'sus'} ledger={ledger} item={i} run={run} mode="accept" />)}
        </>}

        {review.length > 0 && <>
          <div className="group-title">待复核（{review.length}）</div>
          {review.map(i => <WorkCard key={i.id + 'rev'} ledger={ledger} item={i} run={run} mode="hint"
            hint="点交待复核，请先在「开箱点交」完成复核。" />)}
        </>}

        {unchecked.length > 0 && <>
          <div className="group-title">待点交（{unchecked.length}）</div>
          {unchecked.map(i => <WorkCard key={i.id + 'chk'} ledger={ledger} item={i} run={run} mode="hint"
            hint="尚未开箱点交，请先在「开箱点交」登记。" />)}
        </>}

        <div className="group-title">已落位（{placed.length}）</div>
        {placed.map(i => <WorkCard key={i.id + 'on'} ledger={ledger} item={i} run={run} mode="placed" />)}
      </section>

      <section className="form-panel wide">
        <div className="panel-title">
          <div><span className="eyebrow">BOOTH BOARD</span><h2>展位板</h2></div>
          <span className="top-note">空位 {emptyBooths(ledger).length}/{ledger.booths.length}</span>
        </div>
        <div className="booth-grid">
          {ledger.booths.map(b => {
            const occ = boothOccupant(ledger, b.id);
            return <div className={'booth-card' + (occ ? ' occupied' : '')} key={b.id}>
              <span className="b-code">{b.id}</span>
              <span className="b-room">{b.room}</span>
              {occ
                ? <>
                    <span className="b-title">{occ.title}</span>
                    <span className="muted" style={{ fontSize: 10 }}>{occ.id} · 自 {occ.placement.at}</span>
                    <button onClick={() => run(removeFromWall(ledger, occ.id))}>撤下 →</button>
                  </>
                : <span className="b-empty">空位</span>}
            </div>;
          })}
        </div>
        <p className="pane-note">展位被占用时，落位会被拦下并提示；先撤下原作品，展位才会空出。</p>
      </section>
    </div>
  </>;
}

function WorkCard({ ledger, item, run, mode, hint }) {
  const booth = item.placement ? ledger.booths.find(b => b.id === item.placement.boothId) : null;
  return <div className="work-card">
    <div className="work-head">
      <span className="list-no">{item.crateId} · 清单{String(item.listNo).padStart(2, '0')}</span>
      <strong>{item.title}</strong>
      <small className="muted">{item.id}</small>
      <Pill tone={statusTone(itemStatus(item))}>{itemStatus(item)}</Pill>
    </div>
    {mode === 'hint' && <p className="muted" style={{ fontSize: 11, margin: 0 }}>{hint}</p>}
    {mode === 'accept' && <>
      {item.acceptance && <span className="muted" style={{ fontSize: 11 }}>
        当前结论：{item.acceptance}{item.acceptanceNote ? `（${item.acceptanceNote}）` : ''}</span>}
      <AcceptanceEditor ledger={ledger} item={item} run={run} />
    </>}
    {mode === 'place' && <>
      <span className="muted" style={{ fontSize: 11 }}>
        接收结论：{item.acceptance}{item.acceptanceNote ? `（${item.acceptanceNote}）` : ''}</span>
      <PlaceRow ledger={ledger} item={item} run={run} />
    </>}
    {mode === 'placed' && booth && <div className="work-head" style={{ justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12 }}>在展 <b>{booth.id}</b> · {booth.room}　<span className="muted">自 {item.placement.at}</span></span>
      <button className="secondary btn-small" onClick={() => run(removeFromWall(ledger, item.id))}>撤下</button>
    </div>}
  </div>;
}

function AcceptanceEditor({ ledger, item, run }) {
  const [conclusion, setConclusion] = useState(item.acceptance || '接收');
  const [note, setNote] = useState(item.acceptanceNote || '');
  return <div className="inline-form">
    <select value={conclusion} onChange={e => setConclusion(e.target.value)}>
      {ACCEPTANCES.map(a => <option key={a}>{a}</option>)}
    </select>
    <input value={note} onChange={e => setNote(e.target.value)} placeholder="结论备注（可空）" />
    <button className="secondary btn-small"
      onClick={() => run(setAcceptance(ledger, item.id, conclusion, note))}>保存结论</button>
  </div>;
}

function PlaceRow({ ledger, item, run }) {
  const empties = emptyBooths(ledger);
  const [picked, setPicked] = useState('');
  const boothId = empties.some(b => b.id === picked) ? picked : (empties[0]?.id || '');
  if (!empties.length) return <p className="muted" style={{ fontSize: 11, margin: 0 }}>暂无空展位，需先撤下其他作品</p>;
  return <div className="inline-form">
    <select value={boothId} onChange={e => setPicked(e.target.value)}>
      {empties.map(b => <option key={b.id} value={b.id}>{b.id} · {b.room}</option>)}
    </select>
    <button className="primary btn-small" onClick={() => run(placeItem(ledger, item.id, boothId))}>落位</button>
  </div>;
}
