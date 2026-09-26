import React, { useState } from 'react';
import { PageTitle, Badge } from './shared.jsx';

const TYPES = ['全部', '到场', '点交', '结论', '落位', '撤下', '回装', '封箱', '开箱', '补件', '修补'];
const TONE = {
  到场: 'blue',
  点交: 'gray',
  结论: 'amber',
  落位: 'green',
  撤下: 'gray',
  回装: 'blue',
  封箱: 'blue',
  开箱: 'red',
  补件: 'blue',
  修补: 'amber',
};

export default function Records({ s, onExport, onReset }) {
  const [filter, setFilter] = useState('全部');
  const logs = filter === '全部' ? s.log : s.log.filter((l) => l.type === filter);

  return (
    <>
      <PageTitle
        eyebrow="ARCHIVE"
        title="留档记录"
        desc="所有流转操作自动留痕；补到附件另记修补记录。数据保存在本机，关闭重开仍可从木箱追到作品与展位。"
        actions={
          <>
            <button className="secondary" onClick={onReset}>
              恢复演示台账
            </button>
            <button className="primary" onClick={onExport}>
              ↓ 导出完整台账 JSON
            </button>
          </>
        }
      />
      <div className="page-body">
        <div className="filters log-filters">
          {TYPES.map((t) => (
            <button key={t} className={filter === t ? 'selected' : ''} onClick={() => setFilter(t)}>
              {t}
            </button>
          ))}
        </div>

        <ol className="timeline">
          {logs.map((l) => (
            <li key={l.id}>
              <span className="tl-time">{l.at}</span>
              <Badge tone={TONE[l.type] || 'gray'}>{l.type}</Badge>
              <span className="tl-text">{l.text}</span>
            </li>
          ))}
          {logs.length === 0 && <li className="muted">该类型暂无记录。</li>}
        </ol>
      </div>
    </>
  );
}
