// 到场台账 · 资料判断层
// 状态推导与台账变更全部走这里的纯函数；页面只调用、不直接改数据。
// 变更函数统一返回 { ok, ledger?, message }，ok=false 时 ledger 不变。

export const APPEARANCES = ['完好', '轻微痕迹', '明显损伤'];
export const ACCEPTANCES = ['接收', '有条件接收', '暂缓接收'];

const copy = x => JSON.parse(JSON.stringify(x));
const pad = n => String(n).padStart(2, '0');
export const now = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
let seq = 0;
const eid = () => `E-${Date.now().toString(36)}${(seq++).toString(36).padStart(2, '0')}`;

/* ---------------- 查找与推导 ---------------- */

export const itemById = (l, id) => l.items.find(i => i.id === id);
export const crateOf = (l, item) => l.crates.find(c => c.id === item.crateId);
export const boothById = (l, id) => l.booths.find(b => b.id === id);
export const boothOccupant = (l, boothId) => l.items.find(i => i.placement?.boothId === boothId) || null;
export const emptyBooths = l => l.booths.filter(b => !boothOccupant(l, b.id));

// 作品状态：全部从字段推导，不单独存，避免几处纸面对不上
export function itemStatus(item) {
  if (item.repack) return '已回装';
  if (item.placement) return '在展';
  if (item.offWallAt) return '待回装';
  if (item.acceptance) return item.acceptance === '暂缓接收' ? '暂缓接收' : '已接收';
  if (item.check?.result === '待复核') return '待复核';
  if (item.check) return '已点交';
  return '待开箱';
}

export function crateStatus(crate, items) {
  if (crate.sealedAt) return '已封箱';
  const mine = items.filter(i => i.crateId === crate.id);
  if (mine.some(i => i.repack)) return '回装中';
  if (mine.length && mine.every(i => i.check)) return '点交完成';
  if (mine.some(i => i.check)) return '点交中';
  return '待开箱';
}

export function crateProgress(crate, items) {
  const mine = items.filter(i => i.crateId === crate.id);
  return {
    total: mine.length,
    checked: mine.filter(i => i.check).length,
    placed: mine.filter(i => i.placement).length,
    repacked: mine.filter(i => i.repack).length,
  };
}

// 回装缺件：原清单列了、但回装时没入箱的附件
export function missingAttachments(item) {
  return item.repack ? item.expected.filter(a => !item.repack.returned[a]) : [];
}
export const supplementsFor = (l, itemId) => l.supplements.filter(s => s.itemId === itemId);
// 仍未了结的缺件 = 缺件 − 已有修补记录的
export function unresolvedMissing(l, item) {
  const done = new Set(supplementsFor(l, item.id).map(s => s.attachment));
  return missingAttachments(item).filter(a => !done.has(a));
}

// 落位判断：点交通过 + 有明确接收结论（非暂缓）+ 展位空着（同一展位同时只放一件）
export function canPlace(l, item, boothId) {
  if (!item) return { ok: false, reason: '未找到作品' };
  if (item.placement) return { ok: false, reason: '作品已在展位上' };
  if (item.repack) return { ok: false, reason: '作品已回装' };
  if (item.check?.result !== '通过') return { ok: false, reason: '点交未通过，不能落位' };
  if (!item.acceptance) return { ok: false, reason: '落位前需要明确的接收结论' };
  if (item.acceptance === '暂缓接收') return { ok: false, reason: '暂缓接收的作品不能落位' };
  const occ = boothOccupant(l, boothId);
  if (occ) return { ok: false, reason: `展位 ${boothId} 已有《${occ.title}》，同一展位同时只放一件` };
  return { ok: true };
}

// 封箱判断：箱内作品全部回装，且没有未了结的缺件
export function sealBlockers(l, crate) {
  const mine = l.items.filter(i => i.crateId === crate.id);
  const notBack = mine.filter(i => !i.repack);
  const missing = mine.flatMap(i => unresolvedMissing(l, i).map(a => ({ item: i, attachment: a })));
  return { notBack, missing, ok: notBack.length === 0 && missing.length === 0 };
}

// 从木箱追到作品和展位
export function traceCrate(l, crateId) {
  const crate = l.crates.find(c => c.id === crateId);
  if (!crate) return null;
  const items = l.items
    .filter(i => i.crateId === crateId)
    .sort((a, b) => a.listNo - b.listNo)
    .map(i => ({
      ...i,
      status: itemStatus(i),
      booth: i.placement ? boothById(l, i.placement.boothId) : null,
      supplements: supplementsFor(l, i.id),
      unresolved: unresolvedMissing(l, i),
    }));
  return {
    crate,
    status: crateStatus(crate, l.items),
    items,
    events: l.events.filter(e => e.crateId === crateId),
  };
}

/* ---------------- 台账变更 ---------------- */

// 开箱点交：按随箱清单逐件登记外观与附件；结论为「通过」或「待复核」
export function saveCheck(l, itemId, draft) {
  const item = itemById(l, itemId);
  if (!item) return { ok: false, message: '未找到作品' };
  if (item.repack) return { ok: false, message: '作品已回装，不能修改点交记录' };
  if (crateOf(l, item)?.sealedAt) return { ok: false, message: '木箱已封箱' };
  if (!draft.appearance) return { ok: false, message: '请登记外观状况' };
  if (!['通过', '待复核'].includes(draft.result)) return { ok: false, message: '请选择点交结论' };
  const next = copy(l);
  const it = itemById(next, itemId);
  it.check = {
    appearance: draft.appearance,
    appearanceNote: draft.appearanceNote || '',
    attachments: { ...draft.attachments },
    result: draft.result,
    checkedAt: now(),
  };
  next.events.push({
    id: eid(), at: now(), kind: '开箱登记', crateId: it.crateId, itemId, boothId: null,
    text: `${itemId}《${it.title}》点交${draft.result === '待复核' ? '，标记待复核' : '通过'}，外观${draft.appearance}`,
  });
  return {
    ok: true, ledger: next,
    message: draft.result === '待复核' ? '已登记为待复核；同箱其余作品不受影响' : '点交登记已保存',
  };
}

// 复核通过：只解开这一件，不动同箱其他作品
export function resolveReview(l, itemId, note) {
  const item = itemById(l, itemId);
  if (!item?.check || item.check.result !== '待复核') return { ok: false, message: '该作品不在待复核状态' };
  const next = copy(l);
  const it = itemById(next, itemId);
  it.check.result = '通过';
  it.check.reviewNote = note || '';
  it.check.reviewedAt = now();
  next.events.push({
    id: eid(), at: now(), kind: '复核通过', crateId: it.crateId, itemId, boothId: null,
    text: `${itemId}《${it.title}》复核通过${note ? `：${note}` : ''}`,
  });
  return { ok: true, ledger: next, message: '复核已通过，可继续接收与落位' };
}

// 接收结论：落位前必须有，且点交已通过
export function setAcceptance(l, itemId, conclusion, note) {
  const item = itemById(l, itemId);
  if (!item) return { ok: false, message: '未找到作品' };
  if (item.check?.result !== '通过') return { ok: false, message: '点交通过后才能填写接收结论' };
  if (item.placement) return { ok: false, message: '作品已落位，先撤下再修改结论' };
  if (item.repack) return { ok: false, message: '作品已回装' };
  if (!ACCEPTANCES.includes(conclusion)) return { ok: false, message: '请选择接收结论' };
  const next = copy(l);
  const it = itemById(next, itemId);
  it.acceptance = conclusion;
  it.acceptanceNote = note || '';
  next.events.push({
    id: eid(), at: now(), kind: '接收结论', crateId: it.crateId, itemId, boothId: null,
    text: `${itemId}《${it.title}》接收结论：${conclusion}${note ? `（${note}）` : ''}`,
  });
  return { ok: true, ledger: next, message: `接收结论已保存：${conclusion}` };
}

export function placeItem(l, itemId, boothId) {
  const item = itemById(l, itemId);
  const chk = canPlace(l, item, boothId);
  if (!chk.ok) return { ok: false, message: chk.reason };
  const next = copy(l);
  const it = itemById(next, itemId);
  it.placement = { boothId, at: now() };
  it.offWallAt = null;
  next.events.push({
    id: eid(), at: now(), kind: '落位', crateId: it.crateId, itemId, boothId,
    text: `${itemId}《${it.title}》落位 ${boothId}`,
  });
  return { ok: true, ledger: next, message: `《${it.title}》已落位 ${boothId}` };
}

export function removeFromWall(l, itemId) {
  const item = itemById(l, itemId);
  if (!item?.placement) return { ok: false, message: '作品不在展位上' };
  const boothId = item.placement.boothId;
  const next = copy(l);
  const it = itemById(next, itemId);
  it.placement = null;
  it.offWallAt = now();
  next.events.push({
    id: eid(), at: now(), kind: '撤下', crateId: it.crateId, itemId, boothId,
    text: `${itemId}《${it.title}》自 ${boothId} 撤下，待回装`,
  });
  return { ok: true, ledger: next, message: `已自 ${boothId} 撤下，展位空出` };
}

// 回装：按原木箱、原清单登记附件入箱情况；缺件如实记录
export function returnToCrate(l, itemId, returned) {
  const item = itemById(l, itemId);
  if (!item) return { ok: false, message: '未找到作品' };
  if (item.placement) return { ok: false, message: '作品仍在展位上，请先在「展位落位」撤下' };
  if (item.repack) return { ok: false, message: '作品已回装' };
  if (crateOf(l, item)?.sealedAt) return { ok: false, message: '木箱已封箱' };
  const next = copy(l);
  const it = itemById(next, itemId);
  it.repack = { at: now(), returned: { ...returned } };
  const missing = missingAttachments(it);
  next.events.push({
    id: eid(), at: now(), kind: '回装', crateId: it.crateId, itemId, boothId: null,
    text: `${itemId}《${it.title}》回装 ${it.crateId}${missing.length ? `，缺件：${missing.join('、')}` : '，附件齐'}`,
  });
  return {
    ok: true, ledger: next,
    message: missing.length ? `已回装，缺件 ${missing.length} 项；缺件不能封箱` : '已回装，附件齐',
  };
}

// 补件：后续补到的附件另留修补记录，不改原始回装单
export function addSupplement(l, itemId, attachment, note) {
  const item = itemById(l, itemId);
  if (!item?.repack) return { ok: false, message: '作品回装后才能登记补件' };
  if (crateOf(l, item)?.sealedAt) return { ok: false, message: '木箱已封箱' };
  if (!missingAttachments(item).includes(attachment)) return { ok: false, message: '该附件不在缺件清单中' };
  if (supplementsFor(l, itemId).some(s => s.attachment === attachment)) return { ok: false, message: '该附件已有修补记录' };
  const next = copy(l);
  const sup = {
    id: `BX-${String(next.supplements.length + 1).padStart(2, '0')}`,
    itemId, crateId: item.crateId, attachment, note: note || '', at: now(),
  };
  next.supplements.push(sup);
  next.events.push({
    id: eid(), at: now(), kind: '补件', crateId: item.crateId, itemId, boothId: null,
    text: `${itemId}《${item.title}》补到附件「${attachment}」，另留修补记录 ${sup.id}`,
  });
  return { ok: true, ledger: next, message: `修补记录 ${sup.id} 已保存` };
}

// 封箱：缺件或未回装一律拦下
export function sealCrate(l, crateId) {
  const crate = l.crates.find(c => c.id === crateId);
  if (!crate) return { ok: false, message: '未找到木箱' };
  if (crate.sealedAt) return { ok: false, message: '木箱已封箱' };
  const b = sealBlockers(l, crate);
  if (b.notBack.length) return { ok: false, message: `还有 ${b.notBack.length} 件未回装，不能封箱` };
  if (b.missing.length) return { ok: false, message: `缺件 ${b.missing.length} 项未补齐，不能封箱` };
  const next = copy(l);
  next.crates.find(c => c.id === crateId).sealedAt = now();
  next.events.push({
    id: eid(), at: now(), kind: '封箱', crateId, itemId: null, boothId: null,
    text: `${crateId} 按原木箱、原清单回装完成，封箱`,
  });
  return { ok: true, ledger: next, message: `${crateId} 已封箱` };
}

/* ---------------- 演示数据 ---------------- */

export function seedLedger() {
  return {
    crates: [
      { id: 'MX-01', lender: '岭南海事博物馆', arrivedAt: '2026-09-21', sealedAt: null },
      { id: 'MX-02', lender: '岭南海事博物馆', arrivedAt: '2026-09-23', sealedAt: null },
    ],
    booths: [
      { id: 'A-01', room: '主展厅' }, { id: 'A-02', room: '主展厅' }, { id: 'A-03', room: '主展厅' },
      { id: 'B-01', room: '纸上时间' }, { id: 'B-02', room: '纸上时间' }, { id: 'C-01', room: '新媒介' },
    ],
    items: [
      {
        id: 'W-101', crateId: 'MX-01', listNo: 1, title: '潮间带测量图', type: '纸本',
        expected: ['画框背板', '悬挂件'],
        check: { appearance: '完好', appearanceNote: '', attachments: { 画框背板: true, 悬挂件: true }, result: '通过', checkedAt: '2026-09-21 10:24' },
        acceptance: '接收', acceptanceNote: '',
        placement: { boothId: 'A-02', at: '2026-09-22 15:02' }, offWallAt: null, repack: null,
      },
      {
        id: 'W-102', crateId: 'MX-01', listNo: 2, title: '盐场日记', type: '档案',
        expected: ['展签', '防护手套'],
        check: { appearance: '轻微痕迹', appearanceNote: '右上角约 2cm 压痕，已拍照，待借展方确认', attachments: { 展签: true, 防护手套: true }, result: '待复核', checkedAt: '2026-09-21 10:41' },
        acceptance: null, acceptanceNote: '',
        placement: null, offWallAt: null, repack: null,
      },
      {
        id: 'W-103', crateId: 'MX-01', listNo: 3, title: '桅杆残件', type: '实物',
        expected: ['亚克力底座'],
        check: { appearance: '完好', appearanceNote: '', attachments: { 亚克力底座: true }, result: '通过', checkedAt: '2026-09-21 11:05' },
        acceptance: '有条件接收', acceptanceNote: '底座卡扣松动，布展时加固',
        placement: null, offWallAt: null, repack: null,
      },
      {
        id: 'W-104', crateId: 'MX-02', listNo: 1, title: '浮标之声', type: '声音装置',
        expected: ['音箱', '电源线', '安装支架'],
        check: null, acceptance: null, acceptanceNote: '',
        placement: null, offWallAt: null, repack: null,
      },
      {
        id: 'W-105', crateId: 'MX-02', listNo: 2, title: '海图残卷', type: '纸本',
        expected: ['无酸衬纸'],
        check: null, acceptance: null, acceptanceNote: '',
        placement: null, offWallAt: null, repack: null,
      },
    ],
    supplements: [],
    events: [
      { id: 'E-001', at: '2026-09-21 10:24', kind: '开箱登记', crateId: 'MX-01', itemId: 'W-101', boothId: null, text: 'W-101《潮间带测量图》点交通过，外观完好' },
      { id: 'E-002', at: '2026-09-21 10:41', kind: '开箱登记', crateId: 'MX-01', itemId: 'W-102', boothId: null, text: 'W-102《盐场日记》点交，标记待复核，外观轻微痕迹' },
      { id: 'E-003', at: '2026-09-21 11:05', kind: '开箱登记', crateId: 'MX-01', itemId: 'W-103', boothId: null, text: 'W-103《桅杆残件》点交通过，外观完好' },
      { id: 'E-004', at: '2026-09-22 09:12', kind: '接收结论', crateId: 'MX-01', itemId: 'W-101', boothId: null, text: 'W-101《潮间带测量图》接收结论：接收' },
      { id: 'E-005', at: '2026-09-22 15:02', kind: '落位', crateId: 'MX-01', itemId: 'W-101', boothId: 'A-02', text: 'W-101《潮间带测量图》落位 A-02' },
      { id: 'E-006', at: '2026-09-22 16:40', kind: '接收结论', crateId: 'MX-01', itemId: 'W-103', boothId: null, text: 'W-103《桅杆残件》接收结论：有条件接收（底座卡扣松动，布展时加固）' },
    ],
  };
}
