import React from 'react';

// 阶段与结论的统一视觉标识
const STAGE_TONE = {
  待开箱: 'gray',
  已点交: 'amber',
  待复核: 'red',
  拒收: 'red',
  可上墙: 'green',
  已落位: 'green',
  已回装: 'blue',
};

export function Badge({ children, tone }) {
  return <span className={`badge ${tone || 'gray'}`}>{children}</span>;
}

export function StageBadge({ stage }) {
  return <Badge tone={STAGE_TONE[stage]}>{stage}</Badge>;
}

export function ConclusionBadge({ c }) {
  const tone =
    c === '接收' ? 'green' : c === '有条件接收' ? 'amber' : c === '拒收' ? 'red' : 'gray';
  return <Badge tone={tone}>{c || '待结论'}</Badge>;
}

export function AccBadge({ state }) {
  const tone = state === '缺件' ? 'red' : state === '已补到' ? 'blue' : 'green';
  return <Badge tone={tone}>{state}</Badge>;
}

export function PageTitle({ eyebrow, title, desc, actions }) {
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {desc && <p className="page-desc">{desc}</p>}
      </div>
      {actions && <div className="top-actions">{actions}</div>}
    </header>
  );
}

export function CrateCard({ crate, summary, active, onClick, children }) {
  return (
    <section className={`crate-card ${active ? 'active' : ''}`}>
      <button className="crate-head" onClick={onClick} type="button">
        <div className="crate-id">
          <span className="crate-ico">▣</span>
          <div>
            <strong>{crate.id}</strong>
            <small>
              清单 {crate.manifestNo} · 到场 {crate.arrivedAt}
            </small>
          </div>
        </div>
        <div className="crate-meta">
          <Badge tone={crate.sealed ? 'blue' : 'gray'}>
            {crate.sealed ? `已封箱 ${crate.sealedAt}` : '未封箱'}
          </Badge>
          <small className="crate-count">
            点交 {summary.inspected}/{summary.total} · 落位 {summary.placed} · 回装{' '}
            {summary.repacked}
            {summary.missing > 0 && <em className="warn"> · 缺件 {summary.missing}</em>}
          </small>
        </div>
        <span className="chev">›</span>
      </button>
      {children}
    </section>
  );
}

export function Note({ tone = 'gray', children }) {
  return <div className={`note ${tone}`}>{children}</div>;
}
