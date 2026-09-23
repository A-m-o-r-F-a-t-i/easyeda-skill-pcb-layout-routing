# PCB MCP 3.0.0 工具索引

默认21工具。常见操作优先 MCP，target 可为简短文档 UUID，唯一 PCB 可以省略。普通编辑不需要 expected、guard 或 prepare；所有设计取舍由 AI 完成。

| 工具 | 用途 | 输入字段 |
| --- | --- | --- |
| `pcb_list_targets` | List connected PCB targets and names. Does not change the active editor. | bridgeUrl, projectUuid |
| `pcb_open_target` | Open one exact PCB target. Current document is resolved internally; no prepare/guard sequence. | target, bridgeUrl |
| `pcb_status` | Read current PCB identity, units and client version. A unique active PCB needs no target parameter. | target, bridgeUrl |
| `pcb_read` | Read complete overview (footprint, size sources, pose, pin/net orientations), local scene or raw objects. kind=operations returns editing schemas; kind=result pages retained complete data. Native-object coordinates are labeled mil. | target, bridgeUrl, kind, units, refs, ids, net, layer, region, angles, orientationCoordinates, offset, limit, resultId, section, sceneSection, include, parentPrimitiveId |
| `pcb_pick` | Find exact native objects at a point or in a rectangle without changing selection. | target, units, point, region, offset, limit, bridgeUrl |
| `pcb_execute_plan` | Preferred bulk editor for placement, explicit routes, copper, mechanical objects and text. Submit typed operations directly in mm; no guard or design gate. Large batches retain order and return actual partial results plus optional SVG. | target, units, operations, planPath, save, view, bridgeUrl |
| `pcb_execute_text_plan` | Shortcut using the same typed bulk operation contract for text, attributes and other explicit edits; no separate text plan language. | target, units, operations, planPath, save, view, bridgeUrl |
| `pcb_cleanup_components` | Unlock selected/all components and hide attached Designator text without deleting component identity. | target, bridgeUrl, refs, unlock, hideDesignators, save, view |
| `pcb_rebuild_pours` | Rebuild selected or all pours and return actual fill results. Does not run DRC or judge design quality. | target, bridgeUrl, pourIds, save |
| `pcb_read_constraints` | Read native rules and net/differential/equal-length/pad-pair groups as data. | target, bridgeUrl |
| `pcb_manage_constraint_group` | Create or change a native constraint group by name. Native arguments and current values are handled internally. | target, bridgeUrl, save, operation |
| `pcb_compare_associated_netlists` | Return associated schematic/PCB logical differences. Does not import changes. | target, expectedSchematicUuid, offset, limit, bridgeUrl |
| `pcb_import_schematic_changes` | Import changes from the PCB-associated schematic in one MCP call. No externally supplied digest/guard; return actual changes and native confirmation state. | target, bridgeUrl, save |
| `pcb_audit_geometry` | On-demand geometric/connectivity/group measurements from a supplied or single-read live scene. Reports data and coverage; never authorizes or blocks editing. | target, snapshot, toleranceMil, detailLimit, bridgeUrl, groups, referenceLayers, checks, net, nativeUnroutedCount |
| `pcb_inspect_pinmap` | Read selected or all components with actual pad numbers/nets, poses, footprint dimensions and same-side orientation maps. Default mm. | target, bridgeUrl, refs, units, angles, orientationCoordinates |
| `pcb_inspect_silkscreen` | On-demand native text sizes, bounds and possible overlaps. Returns measurements only. | target, scope, maximumObjects, detailLimit, ids, offset, limit, minimumFontSizeMm, minimumStrokeWidthMm, bridgeUrl |
| `pcb_save_and_drc` | Save and/or run native DRC on demand. Return complete counts and paged details, with job continuation when running; no editing permission gate. | target, bridgeUrl, save, runDrc, drcJobId, drcWaitMs, drcPollIntervalMs, drcDetailOffset, drcDetailLimit, releaseDrcJob |
| `pcb_verify_api_gates` | Compatibility name for an optional combined DRC/netlist data report. Returns facts, not editing permission. | target, expectedSchematicUuid, drcDetailLimit, netlistDetailLimit, bridgeUrl |
| `pcb_render_inspection_svg` | Return whole-board or local SVG with readable component and pin/net labels. Bottom observation mirrors geometry once, keeping annotation text readable. outputPath optional. | target, bridgeUrl, outputPath, units, region, side, fit, layers, nets, pinLabels |
| `pcb_capture_inspection_view` | Capture the native PCB viewport when needed. Optional temporary layers are restored. A new output path is generated if omitted. | target, outputPath, visibleLayerIds, settleMs, maxBytes, bridgeUrl |
| `pcb_export` | Export one native file or a manufacturing bundle using kind=[...]. Handles native calls and filenames; refuses accidental file overwrite. | target, bridgeUrl, kind, outputPath, outputDirectory, scope, format, unit, netlistType |
