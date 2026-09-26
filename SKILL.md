---
name: easyeda-pcb-layout-routing
description: 嘉立创 EasyEDA PCB 布局、显式布线、铺铜、丝印和制造导出。优先使用 MIL-only PCB MCP 读取元件封装、引脚网络与朝向总览，批量编辑并观察整体/局部 SVG。AI 自主设计和选择分析时机。
version: 7.1.0
---

# PCB 设计与 MCP 操作

## 职责与输入

用户提供已画好的原理图并要求 PCB，即采用 `approved_schematic`。现有器件、封装、针序和参数是输入，不重新开展选型、逐脚电气审查、手册搜集或高度/气隙调查，也不把这些事项延后为交付待办。读取完整元件与焊盘信息是为了安排空间和连接。

AI 决定功能分区、位置、旋转、板面、完整路径、铜区和下一步动作。Skill 提供设计方法与建议工作流。MCP 负责原生对象解析、MIL 坐标、批量执行和事实反馈，不作布局许可或设计评分，不自动布局、自动寻路或自动布线。

**优先使用 MCP**：移动、走线、过孔、焊盘、板框、孔槽、铜区、文字、规则、同步与导出均优先调用对应 PCB MCP。确有未封装能力或实现故障时才使用 `easyeda-api` 定位缺口；常见能力补进 MCP 后继续使用高层接口，不要求人为制造一次失败调用。

## 取得设计信息

`pcb_status` 取得目标、客户端与 MCP 版本。`pcb_read(kind="overview")` 返回整板组件、封装、尺寸来源、实际焊盘、网络关联、当前朝向及常用旋转后的引脚方位。数据已在上下文中时复用；需要局部时使用 refs、region 或原生对象筛选。

唯一连接中的 PCB 可省略 target。存在多个候选时使用 `pcb_list_targets` 返回的文档 UUID；需要切换时调用 `pcb_open_target`。目标一经确定便持续使用，不能因用户临时查看另一块板而静默改变施工对象。

**所有 PCB 坐标、尺寸、线宽、孔径、区域、测量和 SVG 几何固定使用 mil。** 公共接口没有单位选择或毫米转换参数。外部制造格式即使声明其他源单位，MCP 读取后也统一返回 mil。物理规范资料可保留其原始单位，但传入 MCP 前由 AI 明确换算为 mil。

本体、装配外形、丝印和焊盘包络分别表达，缺失保持未知，不把包围盒当实体。朝向图由实际焊盘计算，底面保持真实镜像关系；同面旋转预测不等同于跨面预测，翻面后使用返回的新焊盘。详见 [数据与视图](references/data-feedback.md)。

## 一次表达完整动作

`pcb_edit` 直接接受 operations。只填写要改变的字段，未填写字段保持原值。支持位号、`U1.12` 引脚端点、层名、完整路径和位置数组。

可一次布局整板或多个模块，也可一次提交大量路线。规模由当前设计决定，MCP 内部处理传输分片和真实部分结果。整体平移、对齐、等距和径向排列只执行 AI 明确给出的几何，不替 AI 选择位置。

示例、操作族和字段见 [操作速查](references/operation-recipes.md)。需要完整类型时读取 `pcb_read(kind="operations")`，不查看底层源码猜字段。文字和位号清理同样通过 `pcb_edit` 的 text、modify、delete、cleanup 操作完成，不需要另一套计划工具。

## 显式铜与执行回执

`copper_path` 把 AI 给出的完整中心路径与宽度转换为同层连续铜带，不寻找避障路径；`via_array` 按明确原点、行列、间距和角度生成孔阵列。`orient` 用指定焊盘组的实际中心方向对准目标端点，保持原板面，可与位置和后续布线同批提交。移动后旧铜不会被隐式删除，删除清单仍由 AI 指定。

需要跨断线识别同一批次时，给 `pcb_edit` 设置 requestId。同一 ID 与相同内容返回已保存结果，不重复写板；内容不同明确拒绝。用 `pcb_read(kind="receipt", receiptId=...)` 查询，必要时 refresh=true 只读原生执行日志。`kind="receipts"` 可找回近期批次。回执区分修改、保存、反馈、未知与未执行，不承诺原生原子回滚。详见 [铜区拓扑与回执](references/topology-and-receipts.md)。

## 布局与布线经验

- 结合网络链路与器件服务对象分组。去耦围绕实际电源脚和返回，反馈围绕取样点与反馈端，ADC 输入串阻/电容围绕 ADC 端，自举与栅极外围跟随驱动回路。相同网络名不表示所有电容应堆在一起。
- 接口按用户要求安排。贴片外部接口通常靠板边、开口朝外，圆板可用任意角度顺应板边。原点方便计算即可，板面、机械尺寸和接口区域只在当前任务中生效。
- 先考虑关键连接、整组出入口、扇出、主电流与返回空间。密脚器件朝向服务于连接，避免外围堵住出口。可以先形成大范围布局，再根据整体反馈调整，不要求登记功能组或进行程序评分。
- 线路由 AI 明确给出端点、层、宽度和节点。常规区域可优先 45°，倾斜焊盘和径向接口按实际方向引出。用户禁止直角时由设计遵守，MCP 不把它扩大解释为线段只能采用三种方向。
- 主供电、桥臂、输出与本地电容返回优先组成同面连续通路，不用单个信号孔承担主电流换层。必要跨层由 AI 按回流和空间设计并联连接，不能仅凭总过孔数量评价好坏。
- 大电流连续开放区域优先用局部宽铜或铺铜，留意焊盘出口、最窄铜颈和换层孔阵列。宽线适合短颈和狭窄通道；高 dv/dt 开关节点控制铜面积，供电去程与返回一起安排。
- 保持实际参考铜连续，换层时考虑回流。SMD 焊盘在另一层的投影重合不构成连接。通道被堵、线路反复绕行时可回调布局并重画明确相关铜，不通过改网或放宽既定规则掩盖问题。

更多方法见 [布局与布线](references/placement-routing-closure.md)、[FOC 回路](references/experimental/motor-foc.md)。这些是设计提示，执行顺序可合并、跳过或交错。

## 观察反馈与按需分析

`pcb_edit` 的 view=auto/local/board/none 控制编辑反馈。`pcb_render_svg` 单独生成 top/bottom/both、指定区域、图层和网络的整体或局部 SVG；局部图可显示引脚号/网络名。SVG 标注只是观察叠加，不是 PCB 丝印。

`pcb_read(kind="topology")` 或 `pcb_audit_geometry(checks=["topology"])` 返回实际铜连通分量、焊盘归属、指定端点的既有路径、换层点、孔径与模型内必经单孔。sections 只测指定截面的铜宽，不能把它写成全局最窄铜颈；excludeIds 用于只读比较删除后的模型，不作安全删除裁决。孤立铜、未知孔型与未确认成铜分别报告。

AI 依据数据和图形决定继续、调整或分析。`pcb_save_and_drc`、`pcb_audit_geometry`、`pcb_compare_associated_netlists`、`pcb_inspect_silkscreen` 按需调用，不是每次编辑的前置条件，也不决定编辑权限。布局成形、关键连接变化、重铺后或收尾通常值得取得相应数据，具体时机由任务需要决定。

原生 DRC 的 RUNNING 使用同一 drcJobId、save=false 继续读取；完整总数与分页明细分开。失败、未知或空页不能报告零违规。可信封装内部项、同网间距和施工期未连接结合实际对象判断，不能用这些理由掩盖真实跨元件冲突。详见 [DRC 数据判读](references/drc-policy.md)。

## 人工介入、失败与收尾

保留最新人工位置、角度、板面和有效文字，只提交本次要改的字段。批量移动已有布线元件时，由 AI 安排相关旧铜和新端点，MCP 不隐式重布或整网删除。明确暂停后不再发起相关新写入。

部分成功或响应丢失时先利用实际回执和必要局部读取，保留已完成对象，仅提交明确未完成的动作。不能盲目重放原批次，也不能把 unknown 当作未写入。目标变化和原生错误如实处理，明确权限拒绝不换入口绕过。

功能丝印使用 `pcb_edit` 的 text/modify/cleanup 操作，保留 Designator 身份与 BOM 关联。真实接口丝印和 SVG 辅助标识分开，见 [丝印](references/silkscreen-usability.md)。铺铜边界完成后按需要调用 `pcb_rebuild_pours`；关联原理图确有变更时用 `pcb_compare_associated_netlists` 和 `pcb_sync_schematic`。

用户明确不导出、不比较网表时，不追加这些流程。DRC、几何连通和电流承载或信号仿真分别表述，DRC 零错误不等于回路质量合格。生产输出使用 `pcb_export`，其中贴片坐标固定为 mil。实际生成后报告路径、来源和仍存在的问题。未完成连接、实际规则错误或文件缺失应明确说明；不追加原理图上游复审。仅维护工具或 Skill 时，不为验收改动正在工作的 PCB。

## 按需资料

[工具索引](references/tool-index.md) · [操作速查](references/operation-recipes.md) · [数据与视图](references/data-feedback.md) · [布局布线](references/placement-routing-closure.md) · [DRC](references/drc-policy.md) · [当前客户端数据](references/client-data-notes.md) · [丝印](references/silkscreen-usability.md) · [专项范围](references/experimental/index.md)
