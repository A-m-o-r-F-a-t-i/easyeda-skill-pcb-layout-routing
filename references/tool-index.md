# PCB MCP 4.1.0 工具索引

默认只注册以下 17 个工具。所有 PCB 坐标、尺寸、宽度、孔径、区域、几何测量与 SVG 范围均使用 mil；公共 Schema 只包含当前工具所需字段。唯一连接的 PCB 可省略 target，多目标时使用明确文档 UUID。

| 工具 | 用途 | 主要输入 |
| --- | --- | --- |
| `pcb_list_targets` | 列出已连接 PCB 文档，不切换应用状态 | projectUuid |
| `pcb_open_target` | 在已连接工程窗口打开一个精确 PCB | target（精确窗口/工程/文档） |
| `pcb_status` | 读取目标、客户端、MCP 版本与 MIL 契约 | target |
| `pcb_read` | 读取 overview、完整 scene、操作 Schema、保留结果或原生对象 | target, kind, refs, ids, net/nets, layer, region, angles, orientationCoordinates, offset, limit, resultId, section, receiptId, refresh, paths, sections, excludeIds |
| `pcb_pick` | 按 MIL 点或矩形查找对象 | target, point 或 region, offset, limit |
| `pcb_edit` | 批量执行布局、变换、显式线路、过孔、焊盘、孔槽、板框、铜区、文字、修改、删除与 cleanup | target, requestId, operations, save, view |
| `pcb_read_constraints` | 读取原生规则及网络类、差分、等长、Pad Pair 组 | target |
| `pcb_manage_constraint_group` | 创建、删除、重命名或修改一个约束组 | target, operation, save |
| `pcb_compare_associated_netlists` | 比较关联网表的元件与引脚网络差异 | target, offset, limit |
| `pcb_sync_schematic` | 从唯一关联原理图导入实际变更并读取前后状态 | target, save |
| `pcb_rebuild_pours` | 重建指定或全部铺铜并返回真实填充及连带变化 | target, pourIds, save |
| `pcb_save_and_drc` | 保存和/或运行原生 DRC，支持作业续读与明细分页 | target, save, runDrc, drcJobId, drcWaitMs, drcPollIntervalMs, drcDetailOffset, drcDetailLimit, releaseDrcJob |
| `pcb_audit_geometry` | 按需返回 MIL 几何、建模连通和功能组数据 | target, checks, toleranceMil, curveToleranceMil, detailLimit, net/nets, paths, sections, excludeIds, nativeUnroutedCount, groups, referenceLayers |
| `pcb_inspect_silkscreen` | 返回 MIL 字号、线宽、边界及同层候选重叠 | target, ids, offset, limit, minimumFontSizeMil, minimumStrokeWidthMil |
| `pcb_render_svg` | 生成整体或局部 SVG，可显示引脚/网络标识 | target, outputPath, region, side, fit, layers, nets, pinLabels |
| `pcb_capture_view` | 截取当前原生 PCB 视口，可临时隔离图层并恢复 | target, outputPath, visibleLayerIds, settleMs, maxBytes |
| `pcb_export` | 导出工程备份、DSN、Gerber、BOM、MIL 贴片坐标、测试点、网表或 IPC-D-356A | target, kind, outputPath, outputDirectory, scope, format, netlistType |

`pcb_edit` 是普通施工的唯一编辑入口。文字和位号处理使用 text、modify、delete、cleanup 操作；指定元件的引脚网络、封装和朝向使用 `pcb_read(kind="overview", refs=[...])`；DRC 与网表数据分别调用对应工具，不使用综合兼容入口。

新增读模式 topology、receipt、receipts 复用 pcb_read；显式 orient、copper_path、via_array 复用 pcb_edit，不增加顶层工具。拓扑和执行恢复说明见 [铜区拓扑与回执](topology-and-receipts.md)。
