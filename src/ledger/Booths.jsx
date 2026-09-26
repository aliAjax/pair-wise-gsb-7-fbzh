import React, { useState } from 'react';
import * as M from './model.js';
import { PageTitle, Badge, StageBadge, ConclusionBadge, Note } from './shared.jsx';

export default function Booths({ s, run }) {
  const [selBooth, setSelBooth] = useState(s.booths[0]?.id);
  const booth = s.booths.find((b) => b.id === selBooth) || s.booths[0];
  const occ = booth ? M.occupant(s, booth.id) : null;
  // 可落位作品：已有点交、结论可上墙、尚未回装
  const ready = s.artworks.filter(
    (a) => a.inspected && ['接收', '有条件接收'].includes(a.conclusion) && !a.repacked
  );
  const waiting = s.artworks.filter((a) => M.stageOf(a) === '待复核');

  return (
    <>
      <PageTitle
        eyebrow="PLACEMENT"
        title="展位落位"
        desc="同一展位同时只放一件；占用判断由台账自动维护，已落位作品换展位需选择空闲展位。"
      />
      <div className="page-body two-col">
        <div className="col-list">
          <div className="block-head">
            <h2>展位</h2>
            <small>{s.artworks.filter((a) => a.boothId).length} 已占用 / {s.booths.length}</small>
          </div>
          {s.booths.map((b) => {
            const a = M.occupant(s, b.id);
            return (
              <button
                key={b.id}
                className={`booth-row ${booth?.id === b.id ? 'chosen' : ''}`}
                onClick={() => setSelBooth(b.id)}
              >
                <span className={`booth-dot ${a ? 'busy' : 'free'}`} />
                <div>
                  <strong>{b.id}</strong>
                  <small>{b.label}</small>
                </div>
                <span className="booth-who">
                  {a ? <Badge tone="green">{a.title}</Badge> : <Badge tone="gray">空闲</Badge>}
                </span>
              </button>
            );
          })}
          {waiting.length > 0 && (
            <Note tone="amber">
              {waiting.map((a) => `《${a.title}》`).join('、')} 待复核，暂不落位；同箱其余作品可继续上墙。
            </Note>
          )}
        </div>

        <div className="col-detail">
          {booth && (
            <section className="work-card open">
              <div className="work-head static">
                <div>
                  <strong>{booth.id}</strong>
                  <small>{booth.label}</small>
                </div>
                {occ ? <Badge tone="green">占用中</Badge> : <Badge tone="gray">空闲</Badge>}
              </div>

              <div className="booth-panel">
                {occ ? (
                  <div className="occupant">
                    <small>当前展位作品</small>
                    <div className="occ-row">
                      <div>
                        <strong>{occ.title}</strong>
                        <p>
                          {occ.artist} · {occ.medium} · 来自 {occ.crateId}
                        </p>
                        <span className="row-tags">
                          <ConclusionBadge c={occ.conclusion} />
                          <StageBadge stage={M.stageOf(occ)} />
                        </span>
                      </div>
                      <div className="occ-actions">
                        <PlaceSelect
                          s={s}
                          run={run}
                          current={occ}
                          ready={ready.filter((a) => a.id !== occ.id)}
                        />
                        <button
                          className="secondary danger"
                          onClick={() => run(() => M.removeFromBooth(s, { artworkId: occ.id }))}
                        >
                          从展位撤下
                        </button>
                      </div>
                    </div>
                    <History a={occ} s={s} />
                  </div>
                ) : (
                  <div className="occupant">
                    <Note>该展位空闲，从下方可上墙作品中选择一件落位。</Note>
                    <EmptyAssign s={s} run={run} boothId={booth.id} ready={ready} />
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function PlaceSelect({ s, run, current, ready }) {
  const [target, setTarget] = useState('');
  const targetArt = ready.find((a) => a.id === target);
  return (
    <div className="move-line">
      <select value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="">调整到空闲展位…</option>
        {s.booths
          .filter((b) => {
            if (b.id === current.boothId) return false;
            const o = M.occupant(s, b.id);
            return !o;
          })
          .map((b) => (
            <option key={b.id} value={b.id}>
              {b.id} · {b.label}
            </option>
          ))}
      </select>
      <button
        className="primary"
        disabled={!targetArt}
        onClick={() =>
          run(() =>
            M.placeArtwork(s, { artworkId: current.id, boothId: target })
          )
        }
      >
        调整
      </button>
    </div>
  );
}

function EmptyAssign({ s, run, boothId, ready }) {
  const [artId, setArtId] = useState('');
  const free = ready.filter((a) => !a.boothId);
  return (
    <div className="assign-box">
      <select value={artId} onChange={(e) => setArtId(e.target.value)}>
        <option value="">选择可上墙作品…</option>
        {free.map((a) => (
          <option key={a.id} value={a.id}>
            {a.title}（{a.crateId} · {a.conclusion}）
          </option>
        ))}
      </select>
      <button
        className="primary"
        disabled={!artId}
        onClick={() => run(() => M.placeArtwork(s, { artworkId: artId, boothId }))}
      >
        落位至此展位
      </button>
      {free.length === 0 && <small className="muted">暂无可落位作品：作品需先点交并给出接收结论。</small>}
    </div>
  );
}

function History({ a, s }) {
  if (!a.placementHistory.length) return null;
  return (
    <div className="history">
      <small>落位记录</small>
      <ol>
        {a.placementHistory.map((h, i) => (
          <li key={i}>
            {h.at} · {M.boothLabel(s, h.boothId)}
          </li>
        ))}
      </ol>
    </div>
  );
}
