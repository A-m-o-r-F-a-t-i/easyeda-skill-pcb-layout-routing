# MCP 2.5 执行入口

几何数据格式继续使用 easyeda-pcb-plan/v2，文字格式继续使用 easyeda-pcb-text-plan/v1。生产公开入口合并了验证与执行。approved_schematic 正常画板使用 prepare → execute；prepare 已包含计划格式校验，validate 仅用于离线验证或参数排错。此处的格式/状态校验不是电气性能审查。

- `mode=validate`：离线验证计划，返回 planSha256，不写 PCB。
- `mode=prepare`：核对完整目标，返回绑定计划哈希的 guard。要求 Gateway Protocol v2。
- `mode=execute`：提交未改动的原计划、guard 和可选 executionId，逐批核对旧对象并读回。

准备后修改计划、文档发生变化或 Bridge/Gateway 重连，旧 guard 作废。重新读取当前对象并准备，不删除旧状态断言。
生产单批支持 1～100 个展开操作。布局/重布局未显式指定 `batchSize` 时，展开操作不超过 100 个就作为一个完整布局轮次执行，超过时按 100 个分批；其他阶段默认 24。缓存的相同 executionId 只返回原结果，不补跑未确认的后缀。批次中途失败时，返回已验证前缀、失败操作和剩余操作 ID；读取失败对象后只提交剩余后缀，不重放完整计划。
事件覆盖目前为 partial：客户端编辑不是事务，写后读回和源码核对不能省略。

## 几何与文字数据格式

# easyeda-pcb-mcp 与 `easyeda-pcb-plan/v2`

`easyeda-pcb-mcp`是PCB专用执行层。它负责读取当前PCB、校验并执行显式板框、独立孔槽/焊盘、铜/文字计划、重建覆铜、管理约束、受保护导入原理图变更、逐项读回、保存和批量DRC。它不负责电路设计、自动布局、自动寻路或自动布线。完整2.5.1生产工具路由见[工具索引](tool-index.md)。

## 1. MCP 工具边界

| 工具 | 写入 PCB | 用途 |
| --- | --- | --- |
| `pcb_status` | 否 | 读取活动文档、工程、画布原点和 API 单位；可核对目标 UUID |
| `pcb_read` | 否 | 分页读取元件、焊盘、线、板框 Polyline、过孔、铺铜边界/实际填充、独立/属性文本、规则、网络和网表；原生图元包围盒按指定ID读取 |
| `pcb_status(include=["capabilities"])`、`pcb_pick` | 否 | 探测客户端公开API；按点/区域查询原生图元，不依赖鼠标选择 |
| `pcb_audit_geometry` | 否 | 只读直线角度分类与逐网几何统计，详见[mcp-audit.md](mcp-audit.md)；不批准连通、载流或SI |
| `pcb_execute_plan(mode="validate")` | 否 | 离线校验 `easyeda-pcb-plan/v2` 的结构、单位、几何、层、线宽、孔径、环宽、闭合板框、独立 NPTH/PTH 圆孔/槽孔、网络端子焊盘和旧状态保护 |
| `pcb_execute_plan` | 是 | 执行显式闭合板框、独立孔槽/焊盘、元件移动、线、贯通过孔、铺铜边界及受保护修改/删除；逐项读回并保存，返回 `boardDelta`、`workflowReceipt`，部分或未知结果附精确 `recoveryDirective` |
| `pcb_rebuild_pours` | 是 | 通过公开API重建全部/指定覆铜并读取实际Poured；不证明连通或载流 |
| `pcb_execute_text_plan(mode="validate")`、`pcb_execute_text_plan` | 校验否/执行是 | 校验并执行`easyeda-pcb-text-plan/v1`，处理独立丝印和已有元件属性文字 |
| `pcb_read_constraints`、`pcb_manage_constraint_group` | 读否/管理是 | 读取规则；受保护管理网络类、差分对、等长组和焊盘对组 |
| `pcb_import_schematic_changes(mode="preflight")`、`pcb_import_schematic_changes` | 准备否/导入是 | 关联原理图与PCB摘要守卫后调用公开ECO导入；导入后需重验铜和丝印 |
| `pcb_save_and_drc` | 保存、可执行 DRC | 阶段门与最终保存的原生 DRC；不验证热载流、信号完整性或视觉质量 |

PCB MCP 不暴露任意 JavaScript 执行入口。实时 DRC 启停、完整快照和快照差异位于默认关闭的 diagnostics profile；生产流程使用 `pcb_save_and_drc` 运行批量原生 DRC。需要查询通用 API、扩展开发或 Bridge 底层诊断时，使用 `easyeda-api` Skill。

## 2. 计划顶层结构

```json
{
  "schema": "easyeda-pcb-plan/v2",
  "intent": "明确描述本计划的局部设计目的",
  "target": {
    "documentUuid": "目标 PCB UUID",
    "projectUuid": "可选工程 UUID",
    "windowId": "多窗口时可选的窗口 ID"
  },
  "units": "mm",
  "phase": "route",
  "constraints": {},
  "options": {},
  "operations": []
}
```

**必填规则**：

- `documentUuid` 必填，执行前和每批运行时都核对文档类型与 UUID；
- `units` 只能是 `mm` 或 `mil`，执行器统一转换为 mil；
- `phase` 只能是 `layout`、`trial-route`、`route`、`relayout` 或 `finish`；
- 一个计划包含 1～5000 个源操作，展开后不超过 20000 个操作；
- 任务计划存入任务工作区，不写入 Skill 安装目录。

## 3. 约束字段

```json
{
  "constraints": {
    "noRightAngle": true,
    "minTrackWidth": 0.10,
    "minViaHole": 0.20,
    "minAnnularRing": 0.075,
    "allowedLayers": ["TOP", "BOTTOM", "INNER_1", "INNER_2"],
    "reservedLayers": {
      "INNER_1": ["GND"],
      "INNER_2": ["+5V", "+3V3"]
    },
    "boardBounds": { "minX": 0, "maxX": 80, "minY": 0, "maxY": 50 },
    "fixedComponents": ["primitive-id-of-J1", "primitive-id-of-H1"],
    "topOnlyExcept": ["primitive-id-of-bottom-connector"]
  }
}
```

| 字段 | 含义 |
| --- | --- |
| `noRightAngle` | 默认 `true`；铜线只能水平、垂直或 45°，连续段不得形成 90°、135°、锐角或反向折返 |
| `minTrackWidth` | 本计划制造/电气最小线宽，使用计划单位 |
| `minViaHole` | 最小成品孔径 |
| `minAnnularRing` | 最小单边环宽 `(盘径-孔径)/2` |
| `allowedLayers` | 允许出现铜图元的物理层 |
| `reservedLayers` | 指定层仅允许列出的网络，防止信号误入 GND/电源面 |
| `boardBounds` | 矩形安全边界；复杂板框仍需后续原生 DRC/几何检查 |
| `fixedComponents` | 机械固定、不允许 MCP 移动的 primitive ID |
| `topOnlyExcept` | 除列出的 primitive ID 外，元件必须保持 TOP |

层名使用 `TOP`、`BOTTOM`、`INNER_1`～`INNER_30`。板框操作使用 `BOARD_OUTLINE`，不能作为普通铜层。

### 3.1 逐网约束

可选的`constraints.netRules`把已确定的电气/制造尺寸落实到具体网络，不替代电流计算。以下为字段示例，数值应换成工程计算后的要求：

```json
{
  "netRules": {
    "PWR": {
      "minTrackWidth": 1.2,
      "minViaHole": 0.3,
      "minViaDiameter": 0.6,
      "minAnnularRing": 0.1,
      "allowedLayers": ["TOP", "BOTTOM"]
    }
  }
}
```

所有长度采用计划的`units`。逐网与全局下限同时生效。`minTrackWidth`约束铜线，孔径/盘径/环宽约束过孔，`allowedLayers`约束该网络的直线与铺铜边界。贯通过孔仍贯穿实际叠层，不能把该字段解释为过孔层跨度或参考面选择。

未指定网络保留全局规则，未知字段报错。新增的铺铜矩形边界检查只覆盖顶点，没有计算实际填充间距、自交、复杂板框或孔洞。

## 4. 执行选项

```json
{
  "options": {
    "batchSize": 100,
    "saveAfterBatch": true,
    "toleranceMil": 0.02
  }
}
```

- `batchSize` 接受并真实执行 1～100 个展开操作。布局/重布局省略该字段时，执行器把不超过 100 个展开操作作为一个完整布局轮次；其他阶段省略时默认 24。小型少元件板优先一次提交完整布局，大板按功能区使用 40～100；只有真实超时、响应过大或客户端异常时降低到 8～24。
- `saveAfterBatch` 默认 `true`。每批成功后保存，便于断点恢复。
- `toleranceMil` 取 `(0, 0.1]`，用于几何读回比较，不是设计间距。

## 5. 创建操作

### 5.1 路径

```json
{
  "id": "route-can-tx",
  "type": "route.create",
  "net": "CAN_TX",
  "layer": "TOP",
  "points": [[12.0, 18.0], [20.0, 18.0], [21.0, 19.0], [30.0, 19.0]],
  "width": 0.20,
  "locked": false
}
```

路径点列已经由设计者确定。执行器只展开为线段，不搜索路径。90°拐角必须显式加入 45°倒角点。

### 5.2 单线段

```json
{
  "id": "line-5v-01",
  "type": "line.create",
  "net": "+5V",
  "layer": "TOP",
  "start": [10.0, 10.0],
  "end": [25.0, 10.0],
  "width": 1.75,
  "locked": false
}
```

### 5.3 贯通过孔

```json
{
  "id": "via-gnd-01",
  "type": "via.create",
  "net": "GND",
  "position": [25.0, 10.0],
  "holeDiameter": 0.30,
  "diameter": 0.50,
  "locked": false
}
```

当前类型化执行器只支持贯通孔。盲孔、埋孔和自定义层跨度需要单独验证制造能力和 API 语义，不能写入普通计划。

### 5.4 独立 NPTH 圆孔与槽孔

安装孔和机械槽使用真实独立 `hole.create`，不能用过孔或无铜板框线冒充：

```json
{
  "id": "mount-ne",
  "type": "hole.create",
  "position": [14.1421, 14.1421],
  "hole": { "type": "ROUND", "diameter": 2.8 },
  "locked": true
}
```

圆角槽把 `hole.type` 改为 `SLOT`，同时提供 `diameter` 和总 `length`。整体方向优先使用 `rotation`；内部 `holeRotation` 只允许 0° 或 90°。`hole.create` 固定为空网络、`MULTI` 层和 `metallization:false`，提供网络、铜形或偏移孔字段会在写入前拒绝。

客户端 4.1.60 会把裸 NPTH 的无铜外形尺寸按 0.1 mil 网格存储，并可能将仅用于机械对象识别的 `padNumber` 转为大写、去除分隔符。MCP 只对 `MULTI`、空网络、`metallization:false` 且外形由实际圆孔/槽孔直接派生的对象接受这两项已验证规范化；真实孔径或槽长、坐标、层、网络、金属化、锁定状态和规范化后的身份仍须逐项一致。未知客户端、金属化孔和带网络焊盘保持精确比较，不能通过扩大通用容差处理。

### 5.5 独立接线焊盘

原理图已有网络但缺少产品物理端点时，使用 `pad.create` 创建可追踪的 SMD/PTH 端子：

```json
{
  "id": "motor-u-terminal",
  "type": "pad.create",
  "layer": "MULTI",
  "padNumber": "U",
  "position": [0, -20],
  "shape": { "type": "OVAL", "width": 3.0, "height": 6.0 },
  "net": "MOTOR_U",
  "hole": { "type": "SLOT", "diameter": 1.5, "length": 4.0 },
  "metallization": true,
  "locked": true
}
```

无钻孔焊盘只能在 `TOP` 或 `BOTTOM`；有钻孔焊盘必须在 `MULTI`。金属化孔必须满足 `minAnnularRing`，NPTH 不能携带网络。所有尺寸使用计划的 `units`。

### 5.6 板框

```json
{
  "id": "outline-main",
  "type": "outline.create",
  "points": [[0, 0], [80, 0], [80, 50], [0, 50]],
  "width": 0.10,
  "locked": true
}
```

新建圆形板框必须以 `[0,0]` 为圆心；新建多边形板框只需有一个显式顶点为 `[0,0]`，不要求几何中心或包围盒中心位于原点。异形多边形可从该锚点向任意方向展开；轴对齐长方形可把原点作为角点，使相邻两边分别落在 X、Y 轴上。执行器把点列编译为一个原生闭合 `PrimitivePolyline` 并独立读取其 polygon 源数据；修改既有板框时沿用同一锚定规则，非几何属性修改不会移动旧板框。

### 5.7 铺铜边界

```json
{
  "id": "pour-top-gnd",
  "type": "pour.create",
  "net": "GND",
  "layer": "TOP",
  "points": [[-39, -24], [39, -24], [39, 24], [-39, 24]],
  "pourName": "TOP_GND",
  "priorityPolicy": "native",
  "preserveSilos": false,
  "width": 0.00508,
  "locked": false
}
```

`pour.create` 创建边界。实际填充、重铺、孤岛和热焊盘需要在保存后再次核对；边界存在不等于铜已经正确填充。

## 6. 修改与删除

支持：

- `line.modify`、`line.delete`；
- `pad.modify`、`pad.delete`；
- `via.modify`、`via.delete`；
- `component.modify`；
- `pour.modify`、`pour.delete`。

组件删除被禁止，器件增删属于原理图/ECO 和网表同步流程。

修改/删除必须提供 `primitiveId` 和完整 `expected` 旧状态。执行器先读取对象并逐字段核对，避免旧 ID 指向变化后的对象。

独立焊盘的 `expected` 必须包含完整 `pad`、`hole`、层、位置、旋转、网络、金属化、padType 和锁定状态；数组按真实结构深度比较。删除安装孔或端子前先用 `pcb_read(kind="pads")` 读取规范孔形和 `physicalDrill`。

### 6.1 元件移动示例

```json
{
  "schema": "easyeda-pcb-plan/v2",
  "intent": "旋转并移动 CAN 收发器，释放总线侧直出通道",
  "target": { "documentUuid": "PCB-UUID" },
  "units": "mil",
  "phase": "relayout",
  "constraints": {
    "allowedLayers": ["TOP", "BOTTOM", "INNER_1", "INNER_2"],
    "fixedComponents": ["J1-primitive-id"],
    "topOnlyExcept": []
  },
  "operations": [
    {
      "id": "move-u5",
      "type": "component.modify",
      "primitiveId": "U5-primitive-id",
      "expected": {
        "designator": "U5",
        "x": 1250.0,
        "y": 900.0,
        "rotation": 0,
        "layer": 1,
        "primitiveLock": false
      },
      "set": {
        "x": 1320.0,
        "y": 930.0,
        "rotation": 90
      },
      "copperPolicy": "replan",
      "affectedNets": ["CAN_TX", "CAN_RX", "CANH", "CANL", "+3V3", "GND"]
    }
  ]
}
```

`copperPolicy`：

- `unrouted`：仅用于该元件相关网络尚未布线；
- `replan`：允许移动，但相关铜必须读回、删除或重规划。

执行器在移动前后按“焊盘编号→网络”的完整多重集合比较，识别网络集合不变但两脚互换的异常。缺少焊盘编号时在修改前拒绝执行。若修改后才检测到变化，该动作可能已经改变真实文档，应先读回并重新规划，不直接重试原计划，也不将completedCount理解为实际未发生任何修改。

`unrouted`的原检查覆盖线、过孔和铺铜边界，不能替代对其他原生铜图元的完整人工审查。已有圆弧、填充或特殊铜形状时先读取确认，按需要使用显式replan。

`affectedNets` 不能省略真实受影响网络。移动后重新读取焊盘位置，不根据元件位移向量直接假定所有焊盘新坐标。

### 6.2 线段修改示例

```json
{
  "id": "widen-5v-01",
  "type": "line.modify",
  "primitiveId": "line-primitive-id",
  "expected": {
    "net": "+5V",
    "layer": 1,
    "startX": 400.0,
    "startY": 500.0,
    "endX": 900.0,
    "endY": 500.0,
    "lineWidth": 20.0,
    "primitiveLock": false
  },
  "set": { "lineWidth": 70.0 }
}
```

`expected` 中的层可使用 API 读回的数值层 ID；`set` 中改层时使用命名层。

## 7. 标准执行循环

```text
pcb_status
→ pcb_read（目标区域、焊盘、网络、规则）
→ 生成本地 plan.json
→ pcb_execute_plan mode=prepare（已含计划校验，无须另行 validate）
→ pcb_execute_plan mode=execute（提交未改变计划与 guard）
→ 检查 workflowReceipt、boardDelta 与 padOverlapGate；布局轮次只有 CLEAR/NOT_APPLICABLE 才能进入下一轮
→ CONTINUE_BOARD：记录变化对象并执行下一项板上动作
→ NO_BOARD_CHANGE：只对账一次精确对象，再执行下一项写入或切换独立区域
→ RECONCILE_EXACT_OPERATION：仅按 minimumReadScope 读回，禁止重放，只生成剩余后缀
→ 必要时截图/重铺
→ 普通保存 pcb_save_and_drc(save=true, runDrc=false)
→ 到 LAYOUT_DRC / ROUTING_DRC / POUR_DRC / FINAL_DRC 里程碑时 pcb_save_and_drc(save=true, runDrc=true)
→ 按 DRC 策略修正阻断项、记录明确豁免后继续布局/布线或连接/文件检查
```

同一区域十个以上图元或需要断点恢复时，使用 `planPath`。内联 `plan` 仅用于小计划或测试。

### 7.1 部分成功续作

计划批次失败时，错误详情包含：

- `confirmedPlanOperations`：已经独立读回并保存的操作；
- `failedOperationId`：第一个未通过的操作；
- `remainingOperationIds`：仍需执行的后缀；
- `boardDelta`：已确认前缀中的真实创建、修改、删除、无变化对象和剩余操作；
- `workflowReceipt`：是否计入板上进展、允许的读回范围、重放策略、后缀续作方式和返回父阶段要求；
- `padOverlapGate`：当前布局轮的跨组件焊盘及独立焊盘/过孔侵入检查；`BLOCKED` 或 `UNVERIFIED` 禁止开始下一轮；
- `nextAction`：要求读取失败对象、生成新 guard 并只执行剩余后缀。

不得把已确认对象放回新计划，也不得使用原 `executionId` 企图补跑。只有 `boardDelta.visibleBoardChange=true` 才能报告本工作块推进了 PCB；`already_exists`、`already_modified`、`already_absent`、validate、prepare、测试和部署均不是板上变化。`PAD_OVERLAP_BLOCKED` 无已改前缀时直接返回该错误；已有前缀时返回 `PARTIAL_SUCCESS` 并带 `blockingCause`。两种情况都先修正当前布局轮，不能切到下一轮。若结果没有确认变化，仍需读取目标区域后再决定重试或换等价 API/UI 路径。

### 7.2 未知结果与暂态连接恢复

受保护写入在连接、目标代际或响应阶段失败时返回 `recoveryDirective`。调用方必须遵守 `replayPolicy="DO_NOT_REPLAY"`，只读取 `minimumReadScope` 所指的精确操作/对象或 guarded target state，并根据现场只重建未完成后缀。暂态 Bridge/窗口错误的快速路径最多执行两次轻量健康/目标探测和一轮定向修复；若连接健康、目标唯一且无挂起请求，不重启服务、不重装插件、不开展全板审计，完成精确对账后立即恢复已保存的父阶段与下一项板上动作。

## 8. 计划校验不覆盖的项目

`pcb_execute_plan(mode="validate")` 不验证：

- 原生完整 DRC；
- 电气连接是否符合原理图；
- 阻抗、串扰、回流和时序；
- 线宽/过孔的热载流与压降；
- 封装实体、庭院、3D 和装配碰撞；
- 铺铜实际填充与孤岛；
- 接口朝向、底层镜像和整体视觉质量。

上述列表说明工具覆盖边界，不是普通 PCB 任务的追加待办。approved_schematic 沿用已确认的原理图、封装和工程输入，不审查电气性能、气隙或高度，不安排样板测试；最终只完成本任务范围的 PCB 连接、制造规则、给定几何和生产文件检查。

## 9. 覆铜计划补充

上例按mm表示0.2mil的边框显示线宽，与真实载流铜颈宽无关。priorityPolicy=native不同时给priority数字，接受原生分配并检查actualPriorities、requiresPriorityReview以及交叠覆铜顺序。省略两者同样采用原生分配。明确数字priority保留精确要求，3.2.186不支持该精确写入时会在修改前拒绝，不能静默改变目标。

简单直线环的起点和绕行方向可能被原生编辑器重排，执行器按形状等价比较。曲线、多环和不同内部形状不会仅凭包围盒相同被当作同一图元。
