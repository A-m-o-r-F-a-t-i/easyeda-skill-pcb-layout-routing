import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const skill = read('SKILL.md');
const core = [
  'SKILL.md', 'references/workflow-patterns.md',
  'references/board-intent-and-phase-gates.md',
  'references/schematic-footprint-preflight.md',
  'references/placement-routing-closure.md',
  'references/product-physical-interfaces.md',
  'references/drc-policy.md',
  'references/inspection-and-release.md',
  'references/layout-playbook.md', 'references/routing-playbook.md',
  'references/experimental/motor-foc.md',
  'references/experimental/index.md',
  'references/operation-recipes.md', 'references/verification-contract.md',
  'templates/progress-first-task-prompt.md',
];
const recipes = read('references/operation-recipes.md');
const examplePlans = [...recipes.matchAll(/```json\s*\n([\s\S]*?)\n```/g)]
  .map(match => JSON.parse(match[1]));

test('v5.4 entry is bounded in bytes as well as lines', () => {
  assert.match(skill, /^---\nname: easyeda-pcb-layout-routing\ndescription: .+\nversion: 5\.4\.\d+\n---/);
  assert.ok(skill.split('\n').length <= 115);
  assert.ok(Buffer.byteLength(skill, 'utf8') <= 16500);
  assert.ok(skill.indexOf('原理图是输入') < 1000);
});

test('approved schematic is the default without a second approval question', () => {
  assert.match(skill, /即采用 `approved_schematic`，无需再问是否确认/);
  for (const file of core) assert.match(read(file), /approved_schematic/, file);
});

test('electrical review is removed, not deferred to final release', () => {
  assert.match(skill, /也不把这些检查推迟到交付前补做/);
  assert.match(read('references/schematic-footprint-preflight.md'), /原“原理图与封装预检门”已撤销/);
  assert.doesNotMatch(core.map(read).join('\n'), /完整额定值.*并行补齐|必须逐项检查[：:]|S1 未完全通过/);
  assert.doesNotMatch(read('references/hard-rules-and-pitfalls.md'), /3D\/数据手册尺寸|所有数据手册.*下一项真实作图动作需要时读取/);
});

test('drawing inputs are distinguished from a pin correctness audit', () => {
  assert.match(skill, /读数据是为了画线，不是找电路问题/);
  assert.match(skill, /用于取得作图端点，不用于复审芯片/);
  assert.match(skill, /缓存/);
  assert.match(skill, /不因一次元件移动或 changeEpoch 增长重读全板/);
});

test('candidate placement does not create gap-height or performance holds', () => {
  assert.match(skill, /缺少气隙、磁钢、封装高度、三维模型、热或额定值资料，不新增调查、待确认表或放行阻断/);
  assert.match(read('references/experimental/motor-foc.md'), /未给偏移时以现有封装定位中心作为可调整布局基准/);
  assert.match(read('references/product-physical-interfaces.md'), /普通接口\/模块保持未锁定/);
});

test('ordinary components stay unlocked and reference-designator displays are removed by guarded cleanup', () => {
  assert.match(skill, /普通元件必须保持未锁定/);
  assert.match(skill, /primitiveLock:false/);
  assert.match(skill, /不能在 `set` 中写 `primitiveLock:true`/);
  assert.match(skill, /必须执行 `pcb_cleanup_components`/);
  assert.match(skill, /allComponentDesignatorSilkscreenRemoved/);
  assert.match(skill, /componentDesignatorIdentityPreserved/);
  assert.match(skill, /keyVisible\/valueVisible/);
  assert.match(skill, /independentStringsUnchanged/);
  const tools = read('references/tool-index.md');
  assert.match(tools, /实际 2\.4\.8 注册表/);
  assert.match(tools, /默认21工具/);
  assert.match(tools, /`pcb_cleanup_components`/);
  const silk = read('references/silkscreen-usability.md');
  assert.match(silk, /默认清除全部组件位号丝印显示/);
  assert.match(silk, /不能按文字外观或坐标猜测/);
  assert.match(silk, /Designator 的 ID\/value/);
  assert.doesNotMatch([skill, silk, read('references/live-collaboration.md')].join('\n'), /默认保留位号|删除全部挂在真实组件上的 `Designator` 属性|不能只隐藏/);
});

test('normal execution goes directly from prepare to execute', () => {
  assert.match(skill, /prepare → execute/);
  assert.match(recipes, /prepare.*完成结构校验/);
  const technical = read('references/mcp-plan-v2.md');
  assert.doesNotMatch(technical, /→ pcb_execute_plan mode=validate\s*\n→ pcb_execute_plan mode=prepare/);
  assert.match(skill, /模型不重复实现它的校验器/);
});

test('ordinary saves stay light while milestone DRC is mandatory', () => {
  const policy = read('references/drc-policy.md');
  assert.match(skill, /DRC 是阶段门，不是逐步仪式/);
  assert.match(skill, /runDrc:false/);
  for (const gate of ['LAYOUT_DRC', 'ROUTING_DRC', 'POUR_DRC', 'FINAL_DRC']) assert.match(policy, new RegExp(gate), gate);
  assert.match(policy, /pcb_save_and_drc\(save=true, runDrc=true\)/);
  assert.match(skill, /单颗移动、单根走线或每一小批写入后不重复整板 DRC/);
  assert.match(skill, /不修改用户的编辑器实时 DRC 设置/);
});

test('DRC classification fixes overlap and bounds every waiver', () => {
  const policy = read('references/drc-policy.md');
  assert.match(skill, /跨组件焊盘、封装实体或装配外形重叠在布局阶段必须立即修正/);
  assert.match(policy, /即使两个焊盘属于同一网络，也不得使用“同网间距”豁免/);
  assert.match(policy, /同网络焊盘间距：可豁免/);
  assert.match(policy, /可信库封装内部报告：可豁免/);
  assert.match(policy, /未布线：分阶段处理/);
  assert.match(policy, /`FINAL_DRC` 还要求未布线为零/);
  assert.match(policy, /不能称“DRC 零错误”/);
  assert.match(policy, /关闭实时\/批量规则、放宽间距、改网、隐藏或删除必要对象/);
});

test('native DRC completion and full totals are required independently of a detail page', () => {
  for (const evidence of ['drcState="COMPLETED"', 'drcVerified=true', 'drcErrorCount', 'drcSummary']) {
    assert.ok(skill.includes(evidence), evidence);
  }
  assert.match(skill, /`RUNNING` 必须用同一 `drcJobId`、`save=false` 继续读取/);
  assert.match(skill, /超时、失败、作业丢失或缺少明细均为 `UNVERIFIED`/);
  assert.match(skill, /分页中的空页不代表零违规/);
  assert.match(skill, /阶段判定始终使用完整总数与汇总/);
});

test('power return, switching, bootstrap, decoupling and Kelvin knowledge remains', () => {
  const foc = read('references/experimental/motor-foc.md');
  for (const term of ['入口储能', '半桥本地母线旁路', '自举', '返回', 'Kelvin', '主电流', '同一网络']) {
    assert.ok(foc.includes(term), term);
  }
  assert.doesNotMatch(foc, /Vout\s*=|至少记录：|## .*硬件失效安全|## .*分阶段试验/);
  assert.match(skill, /不缩规则强行连通/);
});

test('open high-current regions use copper pours instead of long wide traces', () => {
  assert.match(skill, /两个大焊盘、功率器件或功率模块之间存在连续可用/);
  assert.match(skill, /不用一根长距离宽线跨过可铺铜区域/);
  assert.match(skill, /大电流部分全部使用连续铺铜/);
  assert.match(skill, /宽线只用于焊盘短颈、狭窄通道、铜区之间的短过渡和过孔阵列收束/);
});

test('whole-group channel planning replaces single-net greedy routing', () => {
  const closure = read('references/placement-routing-closure.md');
  const routing = read('references/routing-playbook.md');
  assert.match(skill, /先规划整组通道，再逐根落线/);
  assert.match(skill, /单根最短路径不能抢占整组唯一出口/);
  assert.match(closure, /各线宽之和、相邻线间距和两侧退让/);
  assert.match(closure, /不允许先布一根最短线占满唯一入口/);
  assert.match(routing, /整组通道先于单根最短/);
  assert.match(routing, /不能只推挤最后一根线/);
});

test('placement-routing iteration and group review stay local', () => {
  const closure = read('references/placement-routing-closure.md');
  assert.match(closure, /后续线路只能钻缝、反复折返、沿板边绕行、堆积过孔、挤出铜颈或切断参考面/);
  assert.match(closure, /停止给最后一根线打补丁/);
  assert.match(closure, /每完成一组，只检查该组及邻域/);
  assert.match(closure, /不运行整板 DRC\/pinmap/);
  assert.match(read('references/workflow-patterns.md'), /回看本组、邻域和剩余网络出口/);
});

test('layer-return and switching-copper boundaries are explicit', () => {
  assert.match(skill, /换层点附近安排与实际参考层相连的地回流/);
  assert.match(skill, /不按层名假定参考铜连续/);
  assert.match(skill, /高 `dv\/dt` 开关节点只保留实现连接所需的铜面积/);
  assert.match(read('references/routing-playbook.md'), /开放区域的大电流供回路径在信号占满空间前先形成连续局部铜区/);
});

test('borrowed routing methods do not restore preflight review gates', () => {
  const combined = core.map(read).join('\n');
  assert.doesNotMatch(combined, /先读项目规格|未知项标为待确认|开始布局前.*封装映射|每组关键网络完成后立即执行.*DRC/);
  assert.match(skill, /通道规划只组织空间，不改变网络、针序或既有约束/);
  assert.match(skill, /不触发整板 DRC\/pinmap/);
});

test('edge, outward connector direction and requested assembly side remain', () => {
  assert.match(skill, /贴片外部接口默认放板边、真实插口朝外/);
  assert.match(skill, /不因另一面空白把主电路搬过去/);
  const physical = read('references/product-physical-interfaces.md');
  assert.match(physical, /靠边但插口朝内仍应旋转/);
  assert.match(physical, /完全重合的重复端点不能重复计数/);
  assert.match(physical, /MOSFET、采样电阻、IC 焊盘和普通过孔默认不是外接接线端/);
});

test('state templates are short progress records, not approval forms', () => {
  for (const file of ['templates/board-intent.yaml', 'templates/stage-state.yaml']) {
    const text = read(file);
    assert.match(text, /mode: approved_schematic/);
    assert.ok(text.split('\n').length <= 40);
    assert.doesNotMatch(text, /preLockChecks:|unlockedActions:|thermalTargets:|matingEnvelopes:|decisionsRequired:/);
  }
  assert.match(read('templates/stage-state.yaml'), /S1: import_or_sync/);
});

test('target guards, exact recovery and user edits are still protected', () => {
  for (const term of ['精确目标', 'expected', 'guard', '独立读回', '未完成后缀', '不能盲目重放', '人工改动']) {
    assert.ok(skill.includes(term), term);
  }
  assert.match(skill, /不以换 PCB 区域假装能够绕过全局断联/);
  assert.match(skill, /明确权限拒绝不换入口绕过/);
});

test('task completion remains PCB-specific and actual errors are not hidden', () => {
  const release = read('references/inspection-and-release.md');
  for (const term of ['READY_FOR_FAB', 'READY_FOR_ASSEMBLY', 'NOT_READY', '不是重新审查', '不加入放行条件']) {
    assert.ok(release.includes(term), term);
  }
  assert.match(skill, /不通过改网、隐藏对象或放宽规则清错/);
  assert.match(skill, /不重新论证源电路针序是否合理/);
});

test('documentation-only maintenance does not demand a live PCB write', () => {
  assert.match(skill, /不为验收 Skill 改动正在工作的 PCB/);
  assert.match(read('references/verification-contract.md'), /不重编译未变的 MCP/);
  assert.match(read('references/verification-contract.md'), /不证明模型将来每轮都会正确执行/);
});

test('five complete plan examples retain real safety fields and portable fixtures', () => {
  assert.equal(examplePlans.length, 5);
  const types = new Set();
  for (const plan of examplePlans) {
    assert.equal(plan.schema, 'easyeda-pcb-plan/v2');
    assert.equal(plan.target.documentUuid, 'EXAMPLE-PCB');
    assert.ok(['mm', 'mil'].includes(plan.units));
    assert.ok(plan.options.batchSize <= 24);
    for (const op of plan.operations) types.add(op.type);
  }
  for (const type of ['component.modify', 'route.create', 'via.create', 'outline.create', 'hole.create', 'pad.create', 'pour.create']) {
    assert.ok(types.has(type), type);
  }
  assert.equal(examplePlans[0].operations[0].set.layer, 'BOTTOM');
  assert.equal(examplePlans[0].operations[0].copperPolicy, 'unrouted');
  assert.equal(examplePlans[0].constraints.topOnlyExcept, undefined);
});

test('all core relative references resolve within the package', () => {
  for (const file of core) {
    for (const match of read(file).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const href = match[1].split('#')[0];
      if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
      const resolved = path.resolve(root, path.dirname(file), href);
      assert.ok(resolved.startsWith(root + path.sep), `${file}: ${href}`);
      assert.ok(fs.existsSync(resolved), `${file}: ${href}`);
    }
  }
});

test('portable core excludes local board identity and private host paths', () => {
  const combined = core.map(read).join('\n');
  assert.doesNotMatch(combined, /4310|48\.0\s*mm|[A-Z]:\\Users\\|[A-Z]:\\PROJECT\\|~\/.agentdock/i);
  assert.match(skill, /禁止整板自动布局、自动寻路和自动布线/);
});
