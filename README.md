# EasyEDA PCB Layout/Routing Skill 7.1.0

面向已确认原理图的 PCB 设计 Skill。AI 决定布局、显式路径和分析时机；MCP 负责简化原生操作、批量执行和事实反馈。

依赖 PCB MCP 4.1.0。默认仅有一套 17 工具接口，所有 PCB 坐标、尺寸、线宽、孔径、区域、测量与 SVG 几何固定使用 mil，不提供单位切换、旧计划链或兼容别名。

入口：[SKILL.md](SKILL.md)。操作示例：[operation-recipes.md](references/operation-recipes.md)。开发验证：[verification-contract.md](references/verification-contract.md)。

英文：[README.en.md](README.en.md)。运行 `node --test tests/*.test.mjs` 检查文档与示例；真实 PCB 设计效果和真实写入需要独立验证。
