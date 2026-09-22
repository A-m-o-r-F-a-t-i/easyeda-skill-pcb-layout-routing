# 机械禁布计划

## 入口与范围

通过现有 `pcb_execute_plan` 的 validate / prepare / execute 模式提交 `easyeda-pcb-keepout-plan/v1`。该路径只创建圆形禁止区域或删除已明确读回的 REGION，不改变原理图、网络、板框、孔位或器件。

顶层字段为 schema、intent、target、units、backupPath、operations。units 固定 mm；target 包含实际 windowId/projectUuid/documentUuid；backupPath 必须是尚不存在的绝对 .epro 路径。一次最多24个操作，执行前自动导出完整工程备份。

创建操作包含 `type:region.circle.create`、16位小写十六进制 primitiveId、唯一 name、center:[x,y]、diameter、layer、prohibitions 数组、expected:null。layer=12 表示多层。4.1.60 原生实际支持 COMPONENT、TRACK、FILL、COPPER、PLANE。VIA 在原生源码重新载入后也会被丢弃，因此要求原生 VIA 的请求必须写前拒绝，不能报告已存储。机械过孔禁入改由下面的显式铜几何约束承担，禁止要求继续保留。

删除使用 `type:region.delete`、primitiveId 和 expected；expected 直接采用 `pcb_read(kind=regions)` 返回的完整 nativeRecord。禁止删除其他类型或把不完整旧值补成默认值。

## 客户端适配

4.1.60 的区域 API 带 NO_VIAS 创建失败，修改 ruleType 后可能返回成功但文档未改变。该版本采用公开 getDocumentSource/setDocumentSource 的受限记录适配创建五类原生禁布，并用独立几何约束补足过孔禁入。其他客户端版本未实测时拒绝写入，不静默套用。原生源记录以竖线及换行分隔，最后一条不加分隔符；追加时必须先补齐原末条的分隔符。

圆形采用96边外切多边形，并增加0.002mm半径量化余量，保证实际禁布不小于要求圆。它是禁止区边界近似，不用于替代成品圆形板框。多边形顺序仅接受循环移位或反向等价，不能只比较包围盒。

适配在写入前核对精确目标、准备时源状态和旧记录，写后复核所有非目标记录、区域几何、层、锁定及全部 prohibition。经独立读回确认 sourceAfter 后才更新执行上下文，再执行受保护保存；不把当前读到的任意新状态直接当作本工具结果。

## 验收与恢复

`pcb_read(kind=regions)` 从两次稳定的原生 REGION 记录读取规则，输出 nativeRecord、prohibitions 和完整 ruleType，包括 VIA。原生规则存在与编辑器 DRC 实际覆盖范围分别记录。不得宣称 VIA 规则已被客户端接受；还需检查焊盘、元件实体、过孔和铜是否侵入机械包络。原生编辑器可能把所有区域名称保存为 PROHIBIT，计划 name 仅作调用方标签，身份使用真实 primitiveId。

结果未知或部分成功时先读实际区域和工程，不自动重放，不用全局撤销覆盖用户修改。原备份和明确计划保留在任务目录；验证通过后更新独立修复任务并回到画板主任务。工具修复成功不代表 PCB 电气、布局或生产已经通过。

## 独立铜几何排除

普通 easyeda-pcb-plan/v2 的 constraints.circularKeepouts 是最多64个 `{name,center:[x,y],diameter}` 的数组，单位跟随计划。机械孔的每个铜线、过孔创建或修改计划都从 BoardIntent 复制这些条件。执行器检查整段线连同线宽、过孔整个铜环，不只检查端点和孔心，也不借用 DRC 容差缩小禁区。所有铜层均受约束。

该字段不代替组件实体、焊盘和实际覆铜的最终检查。组件、FILL和覆铜使用原生五类区域并独立核对实际几何；覆铜边界可以包围孔区，实际填充必须避让。缺少相应检查证据时保留未通过。
