# PCB MCP 工具索引

由实际 2.5.0 注册表生成。默认21工具；诊断 profile 仅3工具，legacy 为30工具且仅用于独立兼容回归。
星号表示必填参数，具体结构以动态Tool Schema为准。本表按需加载，不要求每项任务调用所有工具。

## 共同契约

目标工具使用明确windowId/projectUuid/documentUuid，tabId从真实状态解析。bridgeUrl仅在需要固定端口时提供。
写入使用expected中的generation/epoch/sourceHash和可选executionId，几何与文字执行改用prepare返回的完整guard。
mode=validate不连接编辑器；mode=prepare只读绑定状态；mode=execute执行原计划并逐项独立读回。`pcb_cleanup_components`使用自己的 preflight/execute 两阶段 guard。几何计划要求新板框以 `[0,0]` 为圆心或包围盒中心；布局/重布局省略批次时，不超过100个展开操作作为一个完整轮次。执行期阻止不同组件焊盘重叠及独立焊盘/过孔侵入元件焊盘，翻面或换层后的真实重叠会回滚元件，并返回 `padOverlapGate`；未 `CLEAR/NOT_APPLICABLE` 不得进入下一轮。结果统一返回 `workflowReceipt`，执行结果同时返回 `boardDelta`，只有 created/modified/deleted 计为真实板上变化。部分或未知结果附 `recoveryDirective`，调用方只读取 `minimumReadScope`、禁止重放并只续作剩余后缀，随后返回已保存的父 PCB 阶段。
文件导出写入新路径，不覆盖既有文件。单独源码哈希检查点不是可恢复备份。

## 默认工具

| 工具 | 意图 | 参数摘要 |
| --- | --- | --- |
| `pcb_list_targets` | 目标 | projectUuid |
| `pcb_open_target` | 目标 | expectedCurrentDocumentUuid* |
| `pcb_status` | 目标 | include |
| `pcb_read` | 读取 | kind*=snapshot/components/pads/lines/polylines/vias/pours/poured/fills/arcs/strings/attributes/regions/bounds/pins/layers/rules/nets/netlist/routeScene，ids，include，net，layer，parentPrimitiveId，region，offset，limit，sceneSection=summary/boardOutline/layers/rules/components/images/padstacks/pads/nets/tracks/vias，layerName |
| `pcb_pick` | 读取 | units*=mil/mm，point，region，offset，limit |
| `pcb_execute_plan` | 执行/规则 | planPath，plan，mode=validate/prepare/execute，guard；布局轮次最多100个展开操作；计划含原点居中板框、孔槽、焊盘、过孔、器件和铜；写入前后阻止跨对象焊盘重叠，返回 padOverlapGate/boardDelta/workflowReceipt，错误附 recoveryDirective |
| `pcb_execute_text_plan` | 执行/规则 | planPath，plan，mode=validate/prepare/execute，guard |
| `pcb_cleanup_components` | 执行/规则 | mode=preflight/execute，unlockComponents，deleteReferenceDesignators，guard；默认解锁全部组件并清除位号丝印显示，将 attached Designator 的 keyVisible/valueVisible 设为 false，同时保留其 ID、value、父组件、普通字符串、其他属性和组件几何 |
| `pcb_rebuild_pours` | 执行/规则 | pourIds，allowCollateralRebuild，save |
| `pcb_read_constraints` | 执行/规则 |  |
| `pcb_manage_constraint_group` | 执行/规则 | operation*，save |
| `pcb_compare_associated_netlists` | 同步 | expectedSchematicUuid，offset，limit |
| `pcb_import_schematic_changes` | 同步 | schematicUuid，expectedBeforeDigest，expectedAfter，save，mode=preflight/execute，expectedComparisonDigest |
| `pcb_audit_geometry` | 验证 | snapshot，toleranceMil，detailLimit，checks，net，nativeUnroutedCount |
| `pcb_inspect_pinmap` | 读取 | componentIds，designators |
| `pcb_inspect_silkscreen` | 验证 | scope=page/all，maximumObjects，detailLimit，ids，offset，limit，minimumFontSizeMm，minimumStrokeWidthMm |
| `pcb_save_and_drc` | 验证 | save，runDrc |
| `pcb_verify_api_gates` | 验证 | expectedSchematicUuid，drcDetailLimit，netlistDetailLimit |
| `pcb_render_inspection_svg` | 交付/视觉 | outputPath*，layerMode=visible/all/explicit，layerIds，designators=visible/all/none，units=mil/mm，region，margin，maxBytes |
| `pcb_capture_inspection_view` | 交付/视觉 | outputPath*，visibleLayerIds，settleMs，maxBytes |
| `pcb_export` | 交付/视觉 | kind*=backup/dsn/gerber/bom/pick_place/test_point/netlist/ipc_d_356a，outputPath*，scope=project/document，parseScene，format=xlsx/csv，unit=mm/mil，netlistType=JLCEDA_PRO/EASYEDA_PRO/PADS/ALTIUM_DESIGNER/ALLEGRO，maxBytes |

## 常见模式

- 状态的include按需选择capabilities、nativeInfo、changeState。后者返回生产写入所需expected。
- 通用读取kind=routeScene时按sceneSection与分页获取解析场景；坐标来源保留，未经验证不转换成API编辑坐标。
- audit的checks分别选择geometry、connectivity；PARTIAL结果保留未知铜类别，不能判定整板通过。
- ECO导入使用preflight/execute，执行绑定PCB摘要、关联网表差异摘要和expected。
- export统一backup/dsn及制造格式，输出类型采用kind显式选择，不将备份与制造审批混为一项。

## 诊断工具

| 工具 | 参数摘要 |
| --- | --- |
| `pcb_capture_snapshot` | outputPath*，maxBytes |
| `pcb_compare_snapshots` | before，after，beforePath，afterPath，detailLimit |
| `pcb_realtime_drc` | action*=status/start/stop |

诊断仅用于MCP开发、完整快照差异或已核对的客户端故障。生产服务不同时启用诊断与旧代兼容服务器。

## 旧入口迁移

| 旧入口 | 当前路径 |
| --- | --- |
| `pcb_capabilities` | pcb_status include=capabilities |
| `pcb_validate_plan` | pcb_execute_plan mode=validate |
| `pcb_validate_text_plan` | pcb_execute_text_plan mode=validate |
| `pcb_prepare_schematic_sync` | pcb_import_schematic_changes mode=preflight |
| `pcb_export_backup` | pcb_export kind=backup |
| `pcb_export_manufacturing` | pcb_export with explicit manufacturing kind |
| `pcb_capture_view` | pcb_capture_inspection_view |
| `pcb_capture_snapshot` | diagnostics profile only |
| `pcb_compare_snapshots` | diagnostics profile only |
| `pcb_realtime_drc` | diagnostics profile only |
