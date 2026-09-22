# PCB 操作速查

本页用于 `approved_schematic` 的作图，不用于电路或元件审查。示例 ID、位号、网络和坐标均为占位数据，实际执行时替换为当前对象；读取结果已有就复用，不为套示例重新遍历元件。

## 通常只需两次执行调用

`pcb_execute_plan(mode="prepare", plan=原计划)`完成结构校验并返回 guard；随后 `mode="execute"`提交同一计划及该 guard。成功后消费工具自带独立读回和 boardDelta，继续下一动作。`validate`只用于离线例子、排查参数或维护工具，不是每次画板必经步骤。

计划长时写入任务目录，用同一 `planPath`准备和执行，避免反复输出完整坐标表。布局/重布局的小型少元件板应先计算完整布局，再以一个不超过 100 个展开操作的计划提交；大板按功能区组织 40～100 个操作的布局轮次。准备后改动计划或目标发生变化，重新准备，不复用旧 guard。

## 1. 移动、旋转和翻面

组件旧值来自 `pcb_read(kind="components", ids=[...])`或缓存；`affectedNets`来自已有连接索引，缺少时只取该组件焊盘网络。它是旧铜处理范围，不是检查芯片引脚定义是否正确。

```json
{
  "schema": "easyeda-pcb-plan/v2",
  "intent": "把未布线模块中的器件移到指定面并保留网络",
  "target": {"documentUuid": "EXAMPLE-PCB", "projectUuid": "EXAMPLE-PROJECT", "windowId": "EXAMPLE-WINDOW"},
  "units": "mil",
  "phase": "layout",
  "constraints": {"allowedLayers": ["TOP", "BOTTOM", "INNER_1", "INNER_2"]},
  "options": {"batchSize": 100, "saveAfterBatch": true},
  "operations": [{
    "id": "move-u1", "type": "component.modify", "primitiveId": "EXAMPLE-COMPONENT",
    "expected": {"designator": "U1", "x": 100, "y": 100, "rotation": 0, "layer": 1, "primitiveLock": false},
    "set": {"x": 1200, "y": 1000, "rotation": 90, "layer": "BOTTOM"},
    "copperPolicy": "unrouted",
    "affectedNets": ["SPI_CLK", "+3.3", "GND"]
  }]
}
```

未布铜用 `unrouted`，已有铜用 `replan`并重规划受影响旧铜。`expected`采用返回的数值层和旧值，`set.layer`使用命名层。没有“其余全部顶层”的要求就不要添加 `topOnlyExcept`，否则它会阻止正常底面布局。

底面镜像交给元件接口，不自行变换焊盘网络。移动后新焊盘坐标已有返回就复用，缺少时只读本批；不重新复核原理图或器件手册。普通组件必须保持未锁定，方便后续调整；即使旧值为锁定，未显式要求锁定的 `component.modify` 也会写回 `primitiveLock:false`。

## 2. 显式走线与换层

下例点列明确给出水平与 45° 倒角，不自动寻路。表贴焊盘从自身所在层起线，不能在另一层同坐标画线就宣称接通。

```json
{
  "schema": "easyeda-pcb-plan/v2",
  "intent": "沿已选通道布置信号并在终点换层",
  "target": {"documentUuid": "EXAMPLE-PCB", "projectUuid": "EXAMPLE-PROJECT", "windowId": "EXAMPLE-WINDOW"},
  "units": "mm",
  "phase": "route",
  "constraints": {"noRightAngle": true, "minTrackWidth": 0.15, "minViaHole": 0.30, "minAnnularRing": 0.15, "allowedLayers": ["TOP", "BOTTOM", "INNER_1", "INNER_2"]},
  "options": {"batchSize": 24, "saveAfterBatch": true},
  "operations": [
    {"id": "route-sig", "type": "route.create", "net": "SIG", "layer": "BOTTOM", "points": [[10,10],[12,10],[13,11],[16,11]], "width": 0.20},
    {"id": "via-sig", "type": "via.create", "net": "SIG", "position": [16,11], "holeDiameter": 0.3048, "diameter": 0.6096}
  ]
}
```

12/24 mil 即 0.3048/0.6096 mm，可用于采用 0.1 mil 存储网格的客户端；仍遵守项目给定下限。1 mil = 0.0254 mm，不能混用计划单位与原生 API 坐标。`route.create`会展开成多段；显式批次最多 100 个展开操作，普通布线省略 `batchSize` 时仍默认 24。

## 3. 原生板框和机械孔槽

```json
{
  "schema": "easyeda-pcb-plan/v2",
  "intent": "按给定几何创建闭合板框、安装孔及线束槽",
  "target": {"documentUuid": "EXAMPLE-PCB", "projectUuid": "EXAMPLE-PROJECT", "windowId": "EXAMPLE-WINDOW"},
  "units": "mm",
  "phase": "layout",
  "options": {"batchSize": 100, "saveAfterBatch": true},
  "operations": [
    {"id": "outline", "type": "outline.create", "points": [[0,0],[30,0],[30,20],[0,20]], "width": 0.10, "locked": true},
    {"id": "mount", "type": "hole.create", "position": [3,3], "hole": {"type": "ROUND", "diameter": 2.8}, "locked": true},
    {"id": "tie-slot", "type": "hole.create", "position": [15,5], "hole": {"type": "SLOT", "diameter": 2, "length": 5}, "rotation": 90, "locked": true}
  ]
}
```

新板框以坐标原点锚定：圆形使用 `[0,0]` 圆心，多边形包含一个 `[0,0]` 顶点；长方形可让原点角的相邻两边沿 X、Y 轴。异形板不要求几何中心位于原点。板框创建为原生闭合 Polyline；外形点列不受铜走线转角规则限制。圆角槽用 `hole.type=SLOT`、孔宽 `diameter`、总长 `length`，整体方向用 `rotation`。

只创建尚不存在的对象。结果未知先查同一位置对象，保留已确认的板框/孔，不重放整组机械计划。孔周禁布有独立格式，必要时看 [机械禁布](keepout-plan.md)，不把绘制参考圆当成禁布。

## 4. 已授权的独立接线焊盘

```json
{
  "schema": "easyeda-pcb-plan/v2",
  "intent": "为已有输出网络增加专用镀通接线端",
  "target": {"documentUuid": "EXAMPLE-PCB", "projectUuid": "EXAMPLE-PROJECT", "windowId": "EXAMPLE-WINDOW"},
  "units": "mm",
  "phase": "layout",
  "constraints": {"minAnnularRing": 0.15},
  "options": {"batchSize": 100, "saveAfterBatch": true},
  "operations": [{
    "id": "terminal", "type": "pad.create", "layer": "MULTI", "padNumber": "OUT",
    "position": [15,3], "shape": {"type": "ELLIPSE", "width": 4.0, "height": 4.0},
    "net": "OUT", "hole": {"type": "ROUND", "diameter": 2.0}, "metallization": true, "locked": false
  }]
}
```

原网络必须存在并且用户允许该端点。不要改网表或用 MOS/采样电阻焊盘冒充外接端。同网络同位置的重复焊盘不重复计数。SMD 焊盘无钻孔且在 TOP/BOTTOM；带镀通孔用 MULTI；NPTH 不带网络。

## 5. 铺铜边界

```json
{
  "schema": "easyeda-pcb-plan/v2",
  "intent": "创建指定区域的地铜边界，随后由重铺工具生成填充",
  "target": {"documentUuid": "EXAMPLE-PCB", "projectUuid": "EXAMPLE-PROJECT", "windowId": "EXAMPLE-WINDOW"},
  "units": "mm",
  "phase": "finish",
  "options": {"batchSize": 24, "saveAfterBatch": true},
  "operations": [{
    "id": "pour-gnd", "type": "pour.create", "net": "GND", "layer": "BOTTOM",
    "points": [[1,1],[29,1],[29,19],[1,19]], "pourName": "BOTTOM_GND",
    "priorityPolicy": "native", "preserveSilos": false, "width": 0.00508, "locked": false
  }]
}
```

这只创建边界，之后 `pcb_rebuild_pours`产生实际铜。`width`是边界显示线宽，不是载流宽度。`priorityPolicy:native`时不同时填写数字 priority。实际铜颈和回流在收尾查看，不因此重新审查器件耐压或温升。

## 保存、位号清理、文字和查错

普通保存用 `pcb_save_and_drc(save=true, runDrc=false)`并携带工具要求的当前 target/expected。每个布局轮次读取 `padOverlapGate`；`BLOCKED/UNVERIFIED` 时只修正本轮，禁止开始下一轮。布局成形、关键/整板布线、重建实际铜和最终导出四类里程碑使用 `pcb_save_and_drc(save=true, runDrc=true)`；单颗/单线/每轮写入后不重复运行整板检查。结果按 [DRC 策略](drc-policy.md)分类，跨组件重叠优先修正，允许豁免仍保留原始项目和理由。

完整 PCB 在首次导入/ECO 后及最终丝印收尾前调用 `pcb_cleanup_components`。先以 `mode="preflight", unlockComponents=true, deleteReferenceDesignators=true`取得 guard，再用同一目标、选项和 guard 调用 `mode="execute"`；状态变化时重新预检。参数名沿用 `deleteReferenceDesignators`，真实客户端动作是把 attached `Designator` 的 `keyVisible/valueVisible` 同时设为 `false`，从板面清除位号丝印，同时保留属性 ID、value、父组件、网络、位置、层、角度和 BOM 身份，也不删除接口功能字等独立字符串。存在用户明确锁定例外时仍必须执行位号丝印清理，但按明确要求处理解锁子项。

执行成功必须检查 `allComponentsUnlocked`、`allComponentDesignatorSilkscreenRemoved`、`componentDesignatorIdentityPreserved`、`independentStringsUnchanged`、`nonDesignatorAttributesUnchanged` 和 `componentIdentityAndGeometryUnchanged`。功能文字使用 `pcb_execute_text_plan`；不能删除属性本体、不能把 `Designator.value` 改成功能名，也不能按 `R1/U1/C1` 字符串猜测并批量清理普通文字。该工具首次使用时加载它的当前 Schema，不加载全套 PCB 工具表。

真正的 Schema 错误只查对应字段；准备过期就更新受影响旧值并重新 prepare；未知写入结果按 recoveryDirective 对账精确对象，只续未完成后缀。不要把 validate/prepare/服务恢复报告成 PCB 写入。
