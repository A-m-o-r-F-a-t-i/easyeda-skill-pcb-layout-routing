# MCP 1.1.0起：几何审查与真实状态读取

## 1. `pcb_audit_geometry`

这是只读工具，不创建、移动、删除、重铺或保存PCB，也不搜索走线路径。输入使用以下两种方式之一：

```json
{
  "target": { "documentUuid": "从pcb_status读取的真实UUID" },
  "toleranceMil": 0.02,
  "detailLimit": 100
}
```

或者提供从可信状态读取的快照：

```json
{
  "snapshot": {
    "units": "mil",
    "lines": [
      {"primitiveId":"line-a","net":"SIG","layer":1,"startX":0,"startY":0,"endX":100,"endY":0,"lineWidth":8},
      {"primitiveId":"line-b","net":"SIG","layer":1,"startX":100,"startY":0,"endX":100,"endY":100,"lineWidth":8}
    ],
    "pads": [],
    "vias": [],
    "coverage": {"source":"人工测试几何，不是真实PCB"}
  },
  "detailLimit": 20
}
```

该示例有一个普通90°端点折点。`target`与`snapshot`不能同时提供，也不能同时省略。`bridgeUrl`仅用于实时目标模式。

**单位**：快照明确填写`mil`或`mm`，所有几何长度使用该单位，层使用API数值ID。工具统一输出mil。`toleranceMil`取`(0,0.1]`，默认0.02，属于坐标比较容差，不能用来放宽制造间距。`detailLimit`取0～5000，截断明细不会改变总计数。

**输入范围**：lines/pads/vias各最多100000项。导线需包含网络、层、起终点和正线宽。焊盘/过孔提供中心坐标和网络，焊盘提供层/金属化信息，贯通过孔以`viaType:0`明确标识。缺少pads或vias整个字段会警告，明确空数组表示调用方声明该范围没有这类对象。

## 2. 实时读取与一致性

实时模式遍历元件读取其真实焊盘，并合并独立焊盘，读取直线和过孔。连续读取两次并比较相关几何及元件状态，发现差异或目标文档变化就拒绝返回一个伪稳定结果。

两次一致只提供一致性检查，不是编辑器事务锁。返回`atomic:false`，明确排除圆弧、覆铜、填充、文字和区域。用户或其他会话随后编辑后，重新执行审查。

## 3. 结果判读

| 字段 | 含义与边界 |
| --- | --- |
| `non45Segments` | 非水平、垂直或45°的直铜线段数量 |
| `ordinaryBadJoints` | 非焊盘/过孔中心的普通二线段端点90°、锐角或折返数量 |
| `padNodes / viaNodes / branchNodes` | 按中心与连接度分类的唯一节点数；类别优先级为焊盘、贯通过孔、分支 |
| `orthogonalPairs` | 各类别的正交线段对数量，不能等同于节点数量 |
| `netStatistics` | 输入直线的逐网线段总长、最小线宽、过孔数量与最小孔径 |
| `detailsTruncated` | 明细是否因detailLimit截断，总数仍保持完整 |
| `verdict` | `REVIEW_REQUIRED`或`NO_FINDINGS_IN_CHECKED_SCOPE`，只适用于已检查输入范围 |
| `engineeringRelease` | 固定为`NOT_EVALUATED`，不批准生产或电气性能 |

端点合并使用相邻网格桶与实际距离，避免简单四舍五入造成相邻端点漏检。不同网络或不同铜层的线不会合并。其他层的SMD焊盘、未确认金属化的MULTI焊盘不能把普通端点问题隐藏为跨层连接。

普通折点为零而焊盘/过孔/分支存在正交线段对时，仍要求审查。工具只识别中心重合及端点关系，不检查线段内部交汇、非中心焊盘接入、复杂铜形状和全部电气连接。逐网长度总和不代表任意两焊盘的端到端路径、电气延迟或差分偏斜。

## 4. `pcb_read`新增读取

**`kind: poured`**：读取原生`pcb_PrimitivePoured`，保留`pourPrimitiveId`及`pourFills`。它描述实际覆铜数据，区别于`kind:pours`的边界。数据存在不等于目标焊盘已连通。按全量或指定ID读取，不对没有稳定通用几何/网络字段的覆铜结果使用通用区域筛选。

**`kind: bounds`**：必须提供明确`ids`，逐个调用原生`getPrimitivesBBox`。返回空值时保留未验证状态。该包围盒是编辑图元外形，不能充当器件本体、庭院、模块PCB、高度或插拔空间。

**文字读回**：尽量保留text、字号、字体、镜像和parentComponentPrimitiveId等可用字段；客户端未提供的属性不会凭空生成。字段缺失时先核对实际API，不拿不存在的属性写回覆盖。

## 5. 依据与测试边界

接口依据于2026-09-14核对的EasyEDA官方文档，BETA接口仍需运行时确认：

- `https://prodocs.lceda.cn/cn/api/reference/pro-api.pcb_primitivecomponent.getallpinsbyprimitiveid.html`
- `https://prodocs.easyeda.com/en/api/reference/pro-api.ipcb_primitivecomponentpad.html`
- `https://prodocs.easyeda.com/en/api/reference/pro-api.ipcb_primitivepad.html`
- `https://prodocs.lceda.cn/cn/api/reference/pro-api.pcb_primitivepoured.getall.html`
- `https://prodocs.easyeda.com/en/api/reference/pro-api.ipcb_primitivepoured.html`
- `https://prodocs.easyeda.com/cn/api/reference/pro-api.pcb_primitive.getprimitivesbbox.html`

Mock回归验证算法和保护条件，实时只读测试验证目标客户端的读取路径。没有向用户真实PCB写入测试图元，不把Mock结果写作真实器件移动验收。
