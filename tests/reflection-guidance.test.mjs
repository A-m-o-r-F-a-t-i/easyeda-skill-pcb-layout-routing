import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const fixture=JSON.parse(read('tests/review-scenarios.json'));
const skill=read('SKILL.md');

for(const item of fixture.scenarios)test(`review guidance: ${item.id}`,()=>{
  assert.ok(item.input && item.expectedDecision && item.incorrectInference);
  const file=path.resolve(root,item.reference);
  assert.ok(file.startsWith(root+path.sep));
  const text=fs.readFileSync(file,'utf8');
  for(const term of item.requiredTerms)assert.ok(text.includes(term),`${item.id}: missing ${term}`);
});

test('scenario fixtures remain documentation checks, not behavior results',()=>{
  assert.equal(fixture.scenarios.length,12);
  assert.equal(new Set(fixture.scenarios.map(item=>item.id)).size,12);
  assert.match(fixture.purpose,/未运行模型行为评测/);
  assert.match(read('references/verification-contract.md'),/静态文档回归，未运行模型行为评测/);
});
test('entry teaches channel, reference, via and scoped refresh together',()=>{
  for(const term of ['完整功能通道','相同端点与范围','参考层职责','同批孔','受影响网络','历史 DRC'])assert.ok(skill.includes(term),term);
  assert.ok(skill.split('\n').length<=100);
  assert.ok(Buffer.byteLength(skill)<16000);
});
test('report dimensions distinguish similar-looking counts',()=>{
  const text=read('references/data-feedback.md');
  for(const term of ['非地孔','换层次数','转弯次数','独立缺陷数','指定端点路径','全网直线中心线总长'])assert.ok(text.includes(term),term);
});
test('DRC checks current changes without reinstating design approval gates',()=>{
  assert.match(skill,/不逐元件检查或新增阶段审批/);
  assert.match(skill,/先修复该问题再扩大修改范围/);
  assert.match(read('references/drc-policy.md'),/布局阶段跨元件焊盘重叠不得忽略/);
  assert.match(read('references/placement-routing-closure.md'),/不设置通用长度倍数或过孔上限/);
});
test('FOC distinguishes three-phase tradeoffs and actual return roles',()=>{
  const text=read('references/experimental/motor-foc.md');
  for(const term of ['相同的检查对象','近端改善','不强求三相等长','Kelvin','参考返回'])assert.ok(text.includes(term),term);
});
test('revision does not copy task identities or measured thresholds into guidance',()=>{
  const files=['SKILL.md','references/placement-routing-closure.md','references/experimental/motor-foc.md','references/data-feedback.md','references/topology-and-receipts.md','references/drc-policy.md'];
  const text=files.map(read).join('\n');
  assert.doesNotMatch(text,/QDrive|4310|d6e84461142c6b0e|221个|113条|69\.0%|20\.7%/);
  assert.match(skill,/7\.2\.0/);
});
