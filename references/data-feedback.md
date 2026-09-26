# 布局数据与图形反馈

使用 pcb_read kind=overview 取得整板摘要，refs/region 可缩小组件范围。返回组件身份、封装引用、数值、位置、角度、板面和焊盘表，网络表同时列出实际端点。总览、引脚映射、区域、原生 shape/hole、at、尺寸和 orientation offsets 全部使用 mil；公共接口没有单位切换参数。

## 朝向

默认包含当前角度与 0/90/180/270 度；angles 可增加任意角度，orientationCoordinates=true 返回每个预测焊盘偏移。方位分组按相对封装原点的方向排列，只帮助理解网络出口，不宣称已识别每个不规则封装的物理边。

poseLocal 由真实板坐标逆当前旋转取得，保留当前板面已有镜像。同面旋转可直接计算；跨面由原生元件修改处理，再用新焊盘数据，不重复镜像。

## 外形与完整性

body、assembly、silkscreen、nativeGraphics、padEnvelope 分别说明来源。本体或装配图形缺失为 null，nativeGraphics 只是原生图形包围盒，padEnvelope 只是焊盘包络。没有额外查询数据手册或推测高度。

完整结果较大时，MCP 保存本次全部数据并返回 resultId、组件索引与 sections。用 pcb_read kind=result、resultId、section、offset、limit 读取余项，不重读 PCB，也不需要原生 API 脚本。覆盖范围和原生读取错误保留。单次读取期间没有事务锁，coverage.atomic=false，不伪称整板原子快照。

## SVG

pcb_render_svg 可指定 side=top/bottom/both、region、layers、nets 和 pinLabels。底面视图仅对几何镜像一次，注释保持可读。局部图用引线和旁置列表关联引脚号、网络及对象 ID，整体图可关闭细针标注。

编辑的 view=auto/local/board/none 控制自动反馈。SVG 是结果资源，outputPath 可省略。图片生成失败与已成功的 PCB 修改分别报告。虚线元件框表示可取得的图形 BBox，不代表实体；未支持的几何类型在 metadata.omitted 中列出。

整板图默认 fit=board 贴合板框，板外暂存元件在 metadata.componentsOutsideView 中列出；需要连同暂存区查看时用 fit=all。密集引脚使用图内编号和下方多列网络表，避免长列表把板面压缩到不可读。

SVG 引脚标签不会写入 PCB 丝印。需要实际板上文字时使用 text 操作；原生当前视口 PNG 只在需要编辑器实际字形或显示效果时调用。

## 铜区拓扑与孔洞

4.1 统一处理已覆盖的导线、圆弧、焊盘、过孔、实体铜和已确认单位的实际成铜。复合铜区按奇偶填充保留孔洞，机械孔从铜模型中扣除；只存在边界的铺铜不参加连通。部分未知形状、盲埋孔或成铜坐标无法确认时，coverage.complete=false。

路径返回同层可达性、换层与必经孔的模型事实。曲线按 curveToleranceMil 离散化，临界接触需原生核对；指定截面测量不能代表整块铜的全局最小宽度。铜岛不自动删除，也不据此声称已通过载流、阻抗或信号完整性验证。参见 [铜区拓扑与回执](topology-and-receipts.md)。
