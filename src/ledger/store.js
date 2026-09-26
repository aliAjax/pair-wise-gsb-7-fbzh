// 留档层：初始台账 + 本地持久化 + 导出。页面与判断层通过这里读写，重开可继续追溯。
import * as M from './model.js';

export const STORE_KEY = 'loan-arrival-ledger-v1';

const seed = () => ({
  crates: [
    {
      id: '木箱 A',
      from: '潮汐美术馆藏品部',
      arrivedAt: '2026-09-24 09:10',
      manifestNo: 'ML-2026-A',
      sealed: false,
      sealedAt: null,
      items: [
        { artworkId: 'W-01' },
        { artworkId: 'W-02' },
        { artworkId: 'W-03' },
      ],
    },
    {
      id: '木箱 B',
      from: '潮汐美术馆藏品部',
      arrivedAt: '2026-09-24 09:40',
      manifestNo: 'ML-2026-B',
      sealed: false,
      sealedAt: null,
      items: [{ artworkId: 'W-04' }, { artworkId: 'W-05' }],
    },
  ],
  booths: [
    { id: 'A01', label: '主展厅 · 入口墙' },
    { id: 'A02', label: '主展厅 · 中央墙' },
    { id: 'B01', label: '纸上时间 · 展柜 1' },
    { id: 'B02', label: '纸上时间 · 展柜 2' },
    { id: 'C01', label: '新媒介 · 互动区' },
    { id: 'C02', label: '新媒介 · 备用展位' },
  ],
  artworks: [
    {
      id: 'W-01',
      title: '潮汐之后',
      artist: '林予安',
      medium: '影像装置',
      crateId: '木箱 A',
      inspected: true,
      inspectedAt: '2026-09-24 10:05',
      appearance: '完好',
      appearanceNote: '外箱完好，内包装固定件牢固。',
      accessories: [
        { id: 'acc-1', name: '播放器', expected: 1, arrived: 1, supplemented: false },
        { id: 'acc-2', name: '遥控器', expected: 1, arrived: 1, supplemented: false },
        { id: 'acc-3', name: '电源适配线', expected: 2, arrived: 2, supplemented: false },
      ],
      conclusion: '接收',
      conclusionNote: '外观与附件与随箱清单一致。',
      concludedAt: '2026-09-24 10:20',
      boothId: 'A01',
      placementHistory: [{ boothId: 'A01', at: '2026-09-25 14:00' }],
      repacked: false,
      repackedAt: null,
      repairs: [],
    },
    {
      id: 'W-02',
      title: '未寄出的信',
      artist: '周禾',
      medium: '纸本档案',
      crateId: '木箱 A',
      inspected: true,
      inspectedAt: '2026-09-24 10:30',
      appearance: '完好',
      appearanceNote: '防潮包装完整。',
      accessories: [
        { id: 'acc-4', name: '档案盒', expected: 1, arrived: 1, supplemented: false },
        { id: 'acc-5', name: '展签原稿', expected: 1, arrived: 1, supplemented: false },
        { id: 'acc-6', name: '固定卡条', expected: 4, arrived: 4, supplemented: false },
      ],
      conclusion: '接收',
      conclusionNote: '',
      concludedAt: '2026-09-24 10:45',
      boothId: 'B01',
      placementHistory: [{ boothId: 'B01', at: '2026-09-25 15:10' }],
      repacked: false,
      repackedAt: null,
      repairs: [],
    },
    {
      id: 'W-03',
      title: '柔软的边界',
      artist: '沈迟',
      medium: '互动光影',
      crateId: '木箱 A',
      // 同箱一件需要复核：已点交，结论待复核；不影响 W-01 / W-02 上墙
      inspected: true,
      inspectedAt: '2026-09-24 11:00',
      appearance: '轻微磨损',
      appearanceNote: '传感器支杆表面有轻微划痕，需技术方确认是否影响感应。',
      accessories: [
        { id: 'acc-7', name: '感应模组', expected: 2, arrived: 2, supplemented: false },
        { id: 'acc-8', name: '连接线', expected: 6, arrived: 6, supplemented: false },
      ],
      conclusion: '待复核',
      conclusionNote: '已联系借展方技术人员到场复核，其余同箱作品不受影响。',
      concludedAt: '2026-09-24 11:20',
      boothId: null,
      placementHistory: [],
      repacked: false,
      repackedAt: null,
      repairs: [],
    },
    {
      id: 'W-04',
      title: '静物练习',
      artist: '陈予白',
      medium: '布面油画',
      crateId: '木箱 B',
      inspected: true,
      inspectedAt: '2026-09-24 13:40',
      appearance: '完好',
      appearanceNote: '画框四角防护到位。',
      accessories: [
        // 开箱时缺外框挂片，后续补到并另留修补记录
        { id: 'acc-9', name: '外框挂片', expected: 2, arrived: 2, supplemented: true },
        { id: 'acc-10', name: '防尘袋', expected: 1, arrived: 1, supplemented: false },
      ],
      conclusion: '有条件接收',
      conclusionNote: '外框挂片开箱时缺失，借展方承诺 9 月 26 日前补齐，先接收上墙。',
      concludedAt: '2026-09-24 14:00',
      boothId: 'A02',
      placementHistory: [{ boothId: 'A02', at: '2026-09-25 16:00' }],
      repacked: false,
      repackedAt: null,
      repairs: [
        {
          id: 'rep-seed-1',
          kind: '补件',
          at: '2026-09-26 10:30',
          accessoryName: '外框挂片',
          note: '借展方随补件专递送到 2 片，已复验安装牢固。',
          handler: '库房 · 赵宁',
        },
      ],
    },
    {
      id: 'W-05',
      title: '回声手稿',
      artist: '陈予白',
      medium: '纸上铅笔',
      crateId: '木箱 B',
      inspected: true,
      inspectedAt: '2026-09-24 14:10',
      appearance: '完好',
      appearanceNote: '',
      accessories: [
        { id: 'acc-11', name: '卡纸托板', expected: 2, arrived: 2, supplemented: false },
        { id: 'acc-12', name: '说明册', expected: 1, arrived: 1, supplemented: false },
      ],
      conclusion: '接收',
      conclusionNote: '',
      concludedAt: '2026-09-24 14:20',
      boothId: 'B02',
      placementHistory: [{ boothId: 'B02', at: '2026-09-25 15:40' }],
      repacked: false,
      repackedAt: null,
      repairs: [],
    },
  ],
  log: [
    {
      id: 'log-seed-1',
      at: '2026-09-26 10:30',
      type: '补件',
      text: '《静物练习》补到附件「外框挂片」，已另记修补记录',
    },
    {
      id: 'log-seed-2',
      at: '2026-09-25 16:00',
      type: '落位',
      text: '《静物练习》落位至 A02 · 主展厅 · 中央墙',
    },
    {
      id: 'log-seed-3',
      at: '2026-09-25 15:40',
      type: '落位',
      text: '《回声手稿》落位至 B02 · 纸上时间 · 展柜 2',
    },
    {
      id: 'log-seed-4',
      at: '2026-09-25 15:10',
      type: '落位',
      text: '《未寄出的信》落位至 B01 · 纸上时间 · 展柜 1',
    },
    {
      id: 'log-seed-5',
      at: '2026-09-25 14:00',
      type: '落位',
      text: '《潮汐之后》落位至 A01 · 主展厅 · 入口墙',
    },
    {
      id: 'log-seed-6',
      at: '2026-09-24 11:20',
      type: '结论',
      text: '《柔软的边界》接收结论：待复核——已联系借展方技术人员到场复核，其余同箱作品不受影响。',
    },
    {
      id: 'log-seed-7',
      at: '2026-09-24 11:00',
      type: '点交',
      text: '《柔软的边界》开箱点交：外观轻微磨损；附件与随箱清单相符',
    },
    {
      id: 'log-seed-8',
      at: '2026-09-24 10:30',
      type: '点交',
      text: '《未寄出的信》开箱点交：外观完好；附件与随箱清单相符',
    },
    {
      id: 'log-seed-9',
      at: '2026-09-24 10:05',
      type: '点交',
      text: '《潮汐之后》开箱点交：外观完好；附件与随箱清单相符',
    },
    {
      id: 'log-seed-10',
      at: '2026-09-24 09:40',
      type: '到场',
      text: '木箱 B 到场，随箱清单 ML-2026-B，内含作品 2 件',
    },
    {
      id: 'log-seed-11',
      at: '2026-09-24 09:10',
      type: '到场',
      text: '木箱 A 到场，随箱清单 ML-2026-A，内含作品 3 件',
    },
  ],
});

export function loadLedger() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* 存档损坏时回退到初始台账 */
  }
  return seed();
}

export function saveLedger(state) {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

export function resetLedger() {
  localStorage.removeItem(STORE_KEY);
  return seed();
}

export function exportLedger(state) {
  const blob = new Blob(
    [JSON.stringify({ exportedAt: M.now(), ...state }, null, 2)],
    { type: 'application/json' }
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `借展到场台账-${M.now().replace(/[: ]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
