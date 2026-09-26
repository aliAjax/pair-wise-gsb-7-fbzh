import React, { useState } from 'react';
import * as M from './model.js';
import {
  PageTitle,
  CrateCard,
  Badge,
  AccBadge,
  StageBadge,
  ConclusionBadge,
  Note,
} from './shared.jsx';

export default function Unpack({ s, run, focusId }) {
  const [selCrate, setSelCrate] = useState(focusId || s.crates[0]?.id);
  const crate = s.crates.find((c) => c.id === selCrate) || s.crates[0];
  const items = crate ? crate.items.map((it) => s.artworks.find((a) => a.id === it.artworkId)) : [];

  return (
    <>
      <PageTitle
        eyebrow="UNPACKING"
        title="开箱点交"
        desc="到场后按随箱清单逐件登记外观与附件实到数量；箱内一件需复核，不影响其余作品继续接收、上墙。"
      />
      <div className="page-body two-col">
        <div className="col-list">
          {s.crates.map((c) => (
            <CrateCard
              key={c.id}
              crate={c}
              summary={M.crateSummary(s, c)}
              active={crate?.id === c.id}
              onClick={() => setSelCrate(c.id)}
            />
          ))}
          <Note>
            点交只记录到场事实。附件若有缺件，登记后不影响同箱其余作品流程；撤展时缺件不能封箱，
            后续补到请在「撤展回装」页登记，自动另留修补记录。
          </Note>
        </div>

        <div className="col-detail">
          {crate &&
            items.map((a) => (
              <InspectCard key={a.id} a={a} crate={crate} s={s} run={run} />
            ))}
        </div>
      </div>
    </>
  );
}

function InspectCard({ s, a, crate, run }) {
  const [open, setOpen] = useState(!a.inspected);
  const [appearance, setAppearance] = useState(a.appearance || '完好');
  const [note, setNote] = useState(a.appearanceNote || '');
  const [arrivals, setArrivals] = useState(() =>
    Object.fromEntries(a.accessories.map((x) => [x.id, x.arrived]))
  );

  const submit = () =>
    run(() =>
      M.inspectArtwork(s, {
        artworkId: a.id,
        appearance,
        appearanceNote: note,
        arrivals,
      })
    );

  return (
    <section className="work-card">
      <button className="work-head" onClick={() => setOpen(!open)}>
        <div>
          <strong>{a.title}</strong>
          <small>
            {a.artist} · {a.medium} · {a.id}
          </small>
        </div>
        <div className="work-tags">
          <StageBadge stage={M.stageOf(a)} />
          <ConclusionBadge c={a.conclusion} />
          <span className="chev">{open ? '⌄' : '›'}</span>
        </div>
      </button>

      {a.inspected && !open && (
        <div className="work-summary">
          <div>
            <small>点交外观</small>
            <Badge
              tone={
                a.appearance === '完好'
                  ? 'green'
                  : a.appearance === '轻微磨损'
                    ? 'amber'
                    : 'red'
              }
            >
              {a.appearance}
            </Badge>
            {a.appearanceNote && <p>{a.appearanceNote}</p>}
          </div>
          <div>
            <small>附件清点（{a.inspectedAt}）</small>
            {a.accessories.map((x) => (
              <span className="acc-line" key={x.id}>
                {x.name} {x.arrived}/{x.expected} <AccBadge state={M.accessoryState(x)} />
              </span>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div className="inspect-form">
          {crate.sealed && (
            <Note tone="red">木箱 {crate.id} 已封箱，点交记录锁定；如需修改请先在回装页异常开箱。</Note>
          )}
          <fieldset disabled={crate.sealed}>
            <label className="field">
              <span>外观状况 *</span>
              <div className="seg">
                {M.APPEARANCES.map((x) => (
                  <button
                    type="button"
                    key={x}
                    className={appearance === x ? 'on' : ''}
                    onClick={() => setAppearance(x)}
                  >
                    {x}
                  </button>
                ))}
              </div>
            </label>

            <label className="field">
              <span>外观备注（损伤位置、包装情况等）</span>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>

            <div className="field">
              <span>随箱清单 · 附件逐件核对</span>
              <table className="acc-table">
                <thead>
                  <tr>
                    <th>附件</th>
                    <th>应到</th>
                    <th>实到</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {a.accessories.map((x) => (
                    <tr key={x.id}>
                      <td>{x.name}</td>
                      <td>{x.expected}</td>
                      <td>
                        {x.supplemented ? (
                          <span className="muted">{x.arrived}（已补到，锁定）</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={arrivals[x.id]}
                            onChange={(e) =>
                              setArrivals({ ...arrivals, [x.id]: e.target.value })
                            }
                          />
                        )}
                      </td>
                      <td>
                        <AccBadge
                          state={M.accessoryState({
                            ...x,
                            arrived: x.supplemented ? x.arrived : Number(arrivals[x.id]) || 0,
                          })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-foot">
              {a.inspected && (
                <button className="secondary" onClick={() => setOpen(false)}>
                  收起
                </button>
              )}
              <button className="primary" onClick={submit}>
                {a.inspected ? '更新点交记录并留档' : '完成本件点交登记'}
              </button>
            </div>
          </fieldset>
        </div>
      )}
    </section>
  );
}
