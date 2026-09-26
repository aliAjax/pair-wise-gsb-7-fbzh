import React, { useState } from 'react';
import * as M from './model.js';
import { PageTitle, CrateCard, Badge, AccBadge, Note } from './shared.jsx';

export default function Repack({ s, run, focusId }) {
  const [selCrate, setSelCrate] = useState(focusId || s.crates[0]?.id);
  const crate = s.crates.find((c) => c.id === selCrate) || s.crates[0];
  const items = crate
    ? crate.items.map((it) => s.artworks.find((a) => a.id === it.artworkId))
    : [];

  return (
    <>
      <PageTitle
        eyebrow="DE-INSTALLATION"
        title="撤展回装"
        desc="撤展按原木箱、原随箱清单回装；逐件核对后封箱，缺件不能封箱。后续补到的附件在此登记，自动另留修补记录。"
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
        </div>

        <div className="col-detail">
          {crate &&
            items.map((a) => (
              <RepackCard key={a.id} a={a} crate={crate} s={s} run={run} />
            ))}

          {crate && <SealBar crate={crate} s={s} run={run} />}
        </div>
      </div>
    </>
  );
}

function RepackCard({ s, a, crate, run }) {
  return (
    <section className="work-card">
      <div className="work-head static">
        <div>
          <strong>{a.title}</strong>
          <small>
            原箱 {crate.id} · 原清单 {crate.manifestNo} · {a.boothId ? `现位于 ${M.boothLabel(s, a.boothId)}` : '已离开展位'}
          </small>
        </div>
        {a.repacked ? <Badge tone="blue">已回装 {a.repackedAt}</Badge> : <Badge tone="gray">未回装</Badge>}
      </div>

      <div className="repack-body">
        <table className="acc-table">
          <thead>
            <tr>
              <th>原清单附件</th>
              <th>应到</th>
              <th>现有</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {a.accessories.map((x) => (
              <tr key={x.id}>
                <td>{x.name}</td>
                <td>{x.expected}</td>
                <td>{x.arrived}</td>
                <td>
                  <AccBadge state={M.accessoryState(x)} />
                  {x.supplemented && <small className="muted"> 后续补到</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {a.accessories.some((x) => x.arrived < x.expected) && (
          <SupplementForm a={a} crate={crate} run={(fn) => run(fn)} s={s} />
        )}

        <div className="form-foot">
          {!a.repacked ? (
            <button
              className="primary"
              disabled={crate.sealed}
              onClick={() => run(() => M.repackArtwork(s, { artworkId: a.id }))}
            >
              撤下并回入原木箱
            </button>
          ) : (
            <>
              <button
                className="secondary"
                disabled={crate.sealed}
                onClick={() => run(() => M.unrepickArtwork(s, { artworkId: a.id }))}
              >
                重新取出（封箱前纠正）
              </button>
              <Note tone="gray">已按原随箱清单核对回装；封箱后本记录锁定。</Note>
            </>
          )}
        </div>

        {a.repairs.length > 0 && (
          <div className="repair-list compact">
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

function SupplementForm({ a, crate, run, s }) {
  const missing = a.accessories.filter((x) => x.arrived < x.expected);
  const [accId, setAccId] = useState(missing[0]?.id || '');
  const [note, setNote] = useState('');
  const [handler, setHandler] = useState('');

  return (
    <div className="supplement">
      <small className="supp-title">缺件后续补到登记（另留修补记录，不改原开箱点交）</small>
      <div className="supp-row">
        <select value={accId} onChange={(e) => setAccId(e.target.value)}>
          {missing.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}（应 {x.expected} / 实 {x.arrived}）
            </option>
          ))}
        </select>
        <input placeholder="补件来源 / 复验情况" value={note} onChange={(e) => setNote(e.target.value)} />
        <input placeholder="经手人" value={handler} onChange={(e) => setHandler(e.target.value)} />
        <button
          className="primary"
          disabled={crate.sealed}
          onClick={() =>
            run(() => M.supplementAccessory(s, { artworkId: a.id, accessoryId: accId, note, handler }))
          }
        >
          登记补到
        </button>
      </div>
    </div>
  );
}

function SealBar({ s, crate, run }) {
  const blockers = M.sealBlockers(s, crate);
  const [reopenReason, setReopenReason] = useState('');

  if (crate.sealed) {
    return (
      <section className="seal-bar sealed">
        <div>
          <Badge tone="blue">已封箱 · {crate.sealedAt}</Badge>
          <p>{crate.id} 已按原木箱、原清单封箱，记录全部锁定。异常开箱须填写原因并留档。</p>
        </div>
        <div className="reopen">
          <input
            placeholder="异常开箱原因（必填）"
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
          />
          <button
            className="secondary danger"
            onClick={() =>
              run(() => M.reopenCrate(s, { crateId: crate.id, reason: reopenReason }))
            }
          >
            异常开箱
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={`seal-bar ${blockers.length ? 'blocked' : 'ready'}`}>
      <div>
        <strong>封箱核对</strong>
        {blockers.length ? (
          <ul className="blockers">
            {blockers.map((b, i) => (
              <li key={i}>✕ {b}</li>
            ))}
          </ul>
        ) : (
          <p>✓ 箱内作品已全部按原清单回装，附件齐全，可以封箱。</p>
        )}
      </div>
      <button
        className="primary big"
        disabled={blockers.length > 0}
        onClick={() => run(() => M.sealCrate(s, { crateId: crate.id }))}
      >
        准予封箱
      </button>
    </section>
  );
}
