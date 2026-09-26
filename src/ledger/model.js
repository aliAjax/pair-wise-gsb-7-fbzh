// 借展作品到场台账 · 资料判断层
// 只负责台账的状态结构、阶段推导与流转规则（纯函数），不读写存储、不依赖界面。

export const APPEARANCES = ['完好', '轻微磨损', '可见损伤'];
// 落位前必须有明确接收结论；只有「接收 / 有条件接收」可以上墙
export const CONCLUSIONS = ['接收', '有条件接收', '待复核', '拒收'];
const PASS = new Set(['接收', '有条件接收']);

export const now = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const uid = (prefix) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const log = (s, type, text) => {
  s.log.unshift({ id: uid('log'), at: now(), type, text });
};

const getArt = (s, id) => {
  const a = s.artworks.find((x) => x.id === id);
  if (!a) throw new Error('找不到该作品');
  return a;
};
const getCrate = (s, id) => {
  const c = s.crates.find((x) => x.id === id);
  if (!c) throw new Error('找不到该木箱');
  return c;
};
export const crateOf = (s, a) => s.crates.find((c) => c.id === a.crateId);
export const boothLabel = (s, id) => {
  const b = s.booths.find((x) => x.id === id);
  return b ? `${b.id} · ${b.label}` : id || '—';
};

// —— 状态推导 ————————————————————————————————

// 附件：应到/实到数量比较；补到的附件单独标识，并对应修补记录
export const accessoryState = (x) =>
  x.arrived >= x.expected ? (x.supplemented ? '已补到' : '齐全') : '缺件';

// 作品当前阶段（由台账记录推导，不另存状态）
export function stageOf(a) {
  if (a.repacked) return '已回装';
  if (a.boothId) return '已落位';
  if (a.conclusion === '待复核') return '待复核';
  if (a.conclusion === '拒收') return '拒收';
  if (PASS.has(a.conclusion)) return '可上墙';
  if (a.inspected) return '已点交';
  return '待开箱';
}

// 展位占用者：同一展位同时只放一件
export const occupant = (s, boothId) =>
  s.artworks.find((a) => a.boothId === boothId);

export function crateSummary(s, c) {
  const items = c.items.map((it) => s.artworks.find((a) => a.id === it.artworkId));
  const missingList = items.flatMap((a) =>
    (a?.accessories || [])
      .filter((x) => x.arrived < x.expected)
      .map((x) => ({ artwork: a, accessory: x }))
  );
  return {
    items,
    total: items.length,
    inspected: items.filter((a) => a?.inspected).length,
    placed: items.filter((a) => a?.boothId).length,
    repacked: items.filter((a) => a?.repacked).length,
    missing: missingList.length,
    missingList,
    sealed: !!c.sealed,
  };
}

export function ledgerStats(s) {
  return {
    crates: s.crates.length,
    sealed: s.crates.filter((c) => c.sealed).length,
    artworks: s.artworks.length,
    placed: s.artworks.filter((a) => a.boothId).length,
    booths: s.booths.length,
    review: s.artworks.filter((a) => stageOf(a) === '待复核').length,
    missing: s.artworks.reduce(
      (n, a) => n + a.accessories.filter((x) => x.arrived < x.expected).length,
      0
    ),
    repairs: s.artworks.reduce((n, a) => n + a.repairs.length, 0),
  };
}

// 封箱前校验：回装齐、附件齐。返回不能封箱的原因清单（空数组即可封箱）
export function sealBlockers(s, c) {
  const sum = crateSummary(s, c);
  const reasons = [];
  if (sum.inspected < sum.total)
    reasons.push(`仍有 ${sum.total - sum.inspected} 件作品未完成开箱点交`);
  if (sum.repacked < sum.total)
    reasons.push(`仍有 ${sum.total - sum.repacked} 件作品未按原清单回装`);
  sum.missingList.forEach(({ artwork, accessory }) =>
    reasons.push(
      `《${artwork.title}》附件「${accessory.name}」缺件（应到 ${accessory.expected}，实到 ${accessory.arrived}），缺件不能封箱`
    )
  );
  return reasons;
}

// —— 流转动作（在已克隆的草稿上修改，并追加留档日志；不合规直接抛错）——————

// 开箱点交：按随箱清单逐件登记外观与附件实到数量
export function inspectArtwork(
  s,
  { artworkId, appearance, appearanceNote, arrivals }
) {
  const a = getArt(s, artworkId);
  const c = crateOf(s, a);
  if (c.sealed) throw new Error('木箱已封箱，不能再修改点交记录');
  if (!APPEARANCES.includes(appearance)) throw new Error('请选择外观状况');

  a.appearance = appearance;
  a.appearanceNote = (appearanceNote || '').trim();
  a.accessories = a.accessories.map((x) =>
    x.supplemented
      ? x // 已补到的附件保留，不让点交覆盖
      : { ...x, arrived: Math.max(0, Number(arrivals[x.id]) || 0) }
  );
  a.inspected = true;
  a.inspectedAt = now();

  const miss = a.accessories.filter((x) => x.arrived < x.expected);
  const tail = miss.length
    ? `缺件：${miss.map((x) => `「${x.name}」应${x.expected}实${x.arrived}`).join('，')}`
    : '附件与随箱清单相符';
  log(s, '点交', `《${a.title}》开箱点交：外观${appearance}；${tail}`);
}

// 接收结论
export function setConclusion(s, { artworkId, conclusion, note }) {
  const a = getArt(s, artworkId);
  if (!CONCLUSIONS.includes(conclusion)) throw new Error('请选择明确的接收结论');
  if (!a.inspected) throw new Error('需先完成开箱点交，再出具接收结论');
  if ((conclusion === '待复核' || conclusion === '拒收') && a.boothId)
    throw new Error('作品已落位，需先从展位撤下，再改为「' + conclusion + '」');
  a.conclusion = conclusion;
  a.conclusionNote = (note || '').trim();
  a.concludedAt = now();
  log(
    s,
    '结论',
    `《${a.title}》接收结论：${conclusion}${a.conclusionNote ? `——${a.conclusionNote}` : ''}`
  );
}

// 落位：必须有可上墙结论 + 目标展位空闲
export function placeArtwork(s, { artworkId, boothId }) {
  const a = getArt(s, artworkId);
  const c = crateOf(s, a);
  if (c.sealed) throw new Error('所在木箱已封箱');
  if (a.repacked) throw new Error('作品已撤展回装，不能再落位');
  if (!PASS.has(a.conclusion))
    throw new Error(
      `接收结论为「${a.conclusion || '尚未出具'}」，落位前需有明确的接收结论`
    );
  if (!boothId) throw new Error('请选择展位');
  const other = occupant(s, boothId);
  if (other && other.id !== a.id)
    throw new Error(`展位 ${boothId} 已由《${other.title}》占用，同一展位同时只放一件`);
  if (a.boothId === boothId) return;

  const from = a.boothId;
  a.boothId = boothId;
  a.placementHistory.push({ boothId, at: now() });
  log(
    s,
    '落位',
    from
      ? `《${a.title}》展位调整：${from} → ${boothId}`
      : `《${a.title}》落位至 ${boothLabel(s, boothId)}`
  );
}

export function removeFromBooth(s, { artworkId }) {
  const a = getArt(s, artworkId);
  if (!a.boothId) return;
  const from = a.boothId;
  a.boothId = null;
  log(s, '撤下', `《${a.title}》从展位 ${from} 撤下`);
}

// 撤展回装：回到原木箱；按随箱清单核对（界面展示清单，数量以点交/补件记录为准）
export function repackArtwork(s, { artworkId }) {
  const a = getArt(s, artworkId);
  const c = crateOf(s, a);
  if (c.sealed) throw new Error('木箱已封箱');
  if (!a.inspected) throw new Error('该作品尚未开箱点交');
  if (a.boothId) {
    const from = a.boothId;
    a.boothId = null;
    log(s, '撤下', `《${a.title}》从展位 ${from} 撤下`);
  }
  a.repacked = true;
  a.repackedAt = now();
  const miss = a.accessories.filter((x) => x.arrived < x.expected).length;
  log(
    s,
    '回装',
    `《${a.title}》撤展回入原木箱 ${c.id}，按随箱清单核对 ${a.accessories.length} 项附件` +
      (miss ? `，其中 ${miss} 项缺件待补` : '，附件齐全')
  );
}

// 封箱前如需纠正回装，可在未封箱状态下取出（留痕）
export function unrepickArtwork(s, { artworkId }) {
  const a = getArt(s, artworkId);
  const c = crateOf(s, a);
  if (c.sealed) throw new Error('木箱已封箱');
  if (!a.repacked) return;
  a.repacked = false;
  a.repackedAt = null;
  log(s, '回装', `《${a.title}》重新取出待处理（原回装记录保留）`);
}

// 后续补到的附件：数量补齐，另留修补记录，不改动原开箱点交事实
export function supplementAccessory(s, { artworkId, accessoryId, note, handler }) {
  const a = getArt(s, artworkId);
  const c = crateOf(s, a);
  if (c.sealed) throw new Error('木箱已封箱，如有补件需先异常开箱');
  const x = a.accessories.find((z) => z.id === accessoryId);
  if (!x) throw new Error('找不到该附件');
  if (x.arrived >= x.expected) throw new Error('该附件已齐全，无需补到登记');
  x.arrived = x.expected;
  x.supplemented = true;
  a.repairs.push({
    id: uid('rep'),
    kind: '补件',
    at: now(),
    accessoryName: x.name,
    note: (note || '').trim() || '缺件后续补到，复验无误',
    handler: (handler || '').trim(),
  });
  log(s, '补件', `《${a.title}》补到附件「${x.name}」，已另记修补记录`);
}

// 其他现场修补，同样进入修补记录
export function addRepairRecord(s, { artworkId, title, note, handler }) {
  const a = getArt(s, artworkId);
  if (!title?.trim()) throw new Error('请填写修补事项');
  a.repairs.push({
    id: uid('rep'),
    kind: '修补',
    at: now(),
    accessoryName: title.trim(),
    note: (note || '').trim(),
    handler: (handler || '').trim(),
  });
  log(s, '修补', `《${a.title}》登记修补记录：${title.trim()}`);
}

// 封箱：原木箱 + 原清单，缺件不能封箱
export function sealCrate(s, { crateId }) {
  const c = getCrate(s, crateId);
  if (c.sealed) throw new Error('该木箱已封箱');
  const reasons = sealBlockers(s, c);
  if (reasons.length) throw new Error(reasons[0]);
  c.sealed = true;
  c.sealedAt = now();
  log(
    s,
    '封箱',
    `木箱 ${c.id} 准予封箱：内含作品 ${c.items.length} 件，按原随箱清单逐项核对无缺件`
  );
}

// 封箱后异常开箱须填写原因并留痕
export function reopenCrate(s, { crateId, reason }) {
  const c = getCrate(s, crateId);
  if (!c.sealed) throw new Error('木箱尚未封箱');
  if (!reason?.trim()) throw new Error('请填写异常开箱原因');
  c.sealed = false;
  c.sealedAt = null;
  log(s, '开箱', `木箱 ${c.id} 异常开箱：${reason.trim()}`);
}
