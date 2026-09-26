// 台账页面共用的小组件与状态配色
import React from 'react';

export const statusTone = s => ({
  待开箱: 'mute', 待复核: 'bad', 已点交: 'info', 已接收: 'ok', 暂缓接收: 'warn',
  在展: 'ok', 待回装: 'warn', 已回装: 'mute',
  点交中: 'info', 点交完成: 'ok', 回装中: 'warn', 已封箱: 'mute',
}[s] || 'mute');

export function Pill({ children, tone }) {
  return <span className={`status ${tone || 'mute'}`}>{children}</span>;
}

export function Bar({ value, total }) {
  return <span className="bar"><i style={{ width: `${total ? (value / total) * 100 : 0}%` }} /></span>;
}

export function Empty({ children }) {
  return <p className="muted" style={{ fontSize: 12, margin: '4px 0 10px' }}>{children}</p>;
}
