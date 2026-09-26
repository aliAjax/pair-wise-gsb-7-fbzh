import React from 'react';
import * as M from './model.js';
import { PageTitle, StageBadge, ConclusionBadge, AccBadge, Badge } from './shared.jsx';

export default function Overview({ s, go }) {
  const st = M.ledgerStats(s);
  const cards = [
    { k: '到场木箱', v: `${st.crates}`, sub: `已封箱 ${st.sealed}` },
    { k: '借展作品', v: `${st.artworks}`, sub: `已落位 ${st.placed} / 展位 ${st.booths}` },
    { k: '待复核', v: `${st.review}`, sub: '不影响同箱其余作品', warn: st.review > 0 },
    { k: '附件缺件', v: `${st.missing}`, sub: '缺件不能封箱', warn: st.missing > 0 },
    { k: '修补 / 补件记录', v: `${st.repairs}`, sub: '补到附件另留记录' },
  ];

  return (
    <>
      <PageTitle
        eyebrow="ARRIVAL LEDGER"
        title="到场台账总览"
        desc="木箱 → 作品 → 展位全程可追溯；资料判断、留档与操作页面分开维护。"
      />
      <div className="page-body">
        <div className="stat-grid">
          {cards.map((c) => (
            <div className={`stat ${c.warn ? 'warn' : ''}`} key={c.k}>
              <span>{c.k}</span>
              <strong>{c.v}</strong>
              <small>{c.sub}</small>
            </div>
          ))}
        </div>

        <section className="trace-block">
          <div className="block-head">
            <h2>木箱 · 作品 · 展位 追溯</h2>
            <small>点击任一行进入对应环节</small>
          </div>
          <table className="trace-table">
            <thead>
              <tr>
                <th>木箱 / 随箱清单</th>
                <th>作品</th>
                <th>点交外观</th>
                <th>附件</th>
                <th>接收结论</th>
                <th>展位</th>
                <th>阶段</th>
              </tr>
            </thead>
            <tbody>
              {s.crates.map((c) => {
                const items = c.items.map((it) =>
                  s.artworks.find((a) => a.id === it.artworkId)
                );
                return items.map((a, i) => (
                  <tr key={a.id} className={a.boothId ? '' : 'no-booth'}>
                    {i === 0 && (
                      <td rowSpan={items.length} className="crate-cell">
                        <button className="link" onClick={() => go('unpack', c.id)}>
                          ▣ {c.id}
                        </button>
                        <small>
                          {c.manifestNo} · {c.arrivedAt}
                        </small>
                        <Badge tone={c.sealed ? 'blue' : 'gray'}>
                          {c.sealed ? '已封箱' : '未封箱'}
                        </Badge>
                      </td>
                    )}
                    <td>
                      <button className="link" onClick={() => go('receive', a.id)}>
                        {a.title}
                      </button>
                      <small>
                        {a.artist} · {a.medium}
                      </small>
                    </td>
                    <td>
                      {a.inspected ? (
                        <>
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
                        </>
                      ) : (
                        <span className="muted">未开箱</span>
                      )}
                    </td>
                    <td className="acc-cell">
                      {a.accessories.map((x) => (
                        <span className="acc-line" key={x.id}>
                          {x.name} {x.arrived}/{x.expected}{' '}
                          <AccBadge state={M.accessoryState(x)} />
                        </span>
                      ))}
                    </td>
                    <td>
                      <ConclusionBadge c={a.conclusion} />
                    </td>
                    <td>
                      {a.boothId ? (
                        <button className="link" onClick={() => go('booths')}>
                          {M.boothLabel(s, a.boothId)}
                        </button>
                      ) : a.repacked ? (
                        <span className="muted">已回入 {c.id}</span>
                      ) : (
                        <span className="muted">未落位</span>
                      )}
                    </td>
                    <td>
                      <StageBadge stage={M.stageOf(a)} />
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
