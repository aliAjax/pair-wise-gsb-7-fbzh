import React, { useState } from 'react';
import * as M from './model.js';
import {
  PageTitle,
  StageBadge,
  ConclusionBadge,
  AccBadge,
  Note,
} from './shared.jsx';

const FILTERS = ['全部', '待结论', '待复核', '接收', '有条件接收', '拒收'];

export default function Receive({ s, run, focusId }) {
  const [sel, setSel] = useState(focusId || s.artworks[0]?.id);
  const [filter, setFilter] = useState('全部');
  const a = s.artworks.find((x) => x.id === sel) || s.artworks[0];
  const crate = a && M.crateOf(s, a);

  const match = (x) =>
    filter === '全部'
      ? true
      : filter === '待结论'
        ? !x.conclusion
        : x.conclusion === filter;

  return (
    <>
      <PageTitle
        eyebrow="RECEPTION"
        title="接收结论"
        desc="落位前必须出具清楚的接收结论；仅「接收 / 有条件接收」可上墙。一件待复核不牵连同箱其余作品。"
      />
      <div className="page-body two-col">
        <div className="col-list">
          <div className="filters">
            {FILTERS.map((f) => (
              <button key={f} className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
          {s.artworks.filter(match).map((x) => (
            <button
              key={x.id}
              className={`plain-row ${a?.id === x.id ? 'chosen' : ''}`}
              onClick={() => setSel(x.id)}
            >
              <div>
                <strong>{x.title}</strong>
                <small>
                  {M.crateOf(s, x)?.id} · {x.inspected ? `点交于 ${x.inspectedAt}` : '尚未点交'}
                </small>
              </div>
              <span className="row-tags">
                <ConclusionBadge c={x.conclusion} />
                <StageBadge stage={M.stageOf(x)} />
              </span>
            </button>
          ))}
        </div>

        <div className="col-detail">
          {a && (
            <ConclusionCard key={a.id} a={a} crate={crate} s={s} run={run} />
          )}
        </div>
      </div>
    </>
  );
}

function ConclusionCard({ s, a, crate, run }) {
  const [c, setC] = useState(a.conclusion || '接收');
  const [note, setNote] = useState(a.conclusionNote || '');
  const hasMissing = a.accessories.some((x) => x.arrived < x.expected);

  return (
    <section className="work-card open">
      <div className="work-head static">
        <div>
          <strong>{a.title}</strong>
          <small>
            {a.id} · {a.artist} · {a.medium}
          </small>
        </div>
        <div className="work-tags">
          <ConclusionBadge c={a.conclusion} />
          <StageBadge stage={M.stageOf(a)} />
        </div>
      </div>

      <div className="conclusion-box">
        {!a.inspected ? (
          <Note tone="amber">该作品尚未开箱点交，请先到「开箱点交」完成外观与附件登记。</Note>
        ) : (
          <>
            <div className="fact-grid">
              <div>
                <small>所在木箱</small>
                <strong>
                  ▣ {crate.id} · 清单 {crate.manifestNo}
                </strong>
              </div>
              <div>
                <small>点交外观</small>
                <strong>{a.appearance}</strong>
                {a.appearanceNote && <p>{a.appearanceNote}</p>}
              </div>
              <div className="span2">
                <small>附件核对</small>
                <div className="acc-wrap">
                  {a.accessories.map((x) => (
                    <span className="acc-line" key={x.id}>
                      {x.name} {x.arrived}/{x.expected} <AccBadge state={M.accessoryState(x)} />
                      {x.supplemented && <em className="muted">（补到，见修补记录）</em>}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {hasMissing && (
              <Note tone="red">
                当前有附件缺件：可选择「有条件接收」先行落位，或「待复核」暂缓；撤展回装时缺件不能封箱。
              </Note>
            )}

            <label className="field">
              <span>接收结论 *</span>
              <div className="seg four">
                {M.CONCLUSIONS.map((x) => (
                  <button
                    type="button"
                    key={x}
                    className={c === x ? 'on' : ''}
                    onClick={() => setC(x)}
                  >
                    {x}
                  </button>
                ))}
              </div>
            </label>
            <label className="field">
              <span>结论说明（条件、复核事项、责任方）</span>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>

            <div className="form-foot">
              <button
                className="primary"
                disabled={crate.sealed}
                onClick={() => run(() => M.setConclusion(s, { artworkId: a.id, conclusion: c, note }))}
              >
                {a.conclusion ? '更新接收结论并留档' : '出具接收结论'}
              </button>
              {c === '待复核' && (
                <Note tone="amber">
                  本件待复核：{crate.id} 内其余已接收作品仍可正常落位，展位分配不受影响。
                </Note>
              )}
            </div>
          </>
        )}

        {a.repairs.length > 0 && (
          <div className="repair-list">
            <small>修补 / 补件记录（{a.repairs.length}）</small>
            {a.repairs.map((r) => (
              <div className="repair-item" key={r.id}>
                <Badge tone={r.kind === '补件' ? 'blue' : 'amber'}>{r.kind}</Badge>
                <div>
                  <strong>
                    {r.accessoryName} · {r.at}
                  </strong>
                  <p>{r.note}</p>
                  {r.handler && <small>经手：{r.handler}</small>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
