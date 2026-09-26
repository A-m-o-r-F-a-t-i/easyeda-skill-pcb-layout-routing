# EasyEDA PCB Layout/Routing Skill 7.2.0

Guidance for approved schematics. The model owns layout, explicit paths and analysis timing; MCP wraps native object lookup, bulk execution and factual feedback.

Requires PCB MCP 4.1.0. One 17-tool interface is registered. Every PCB coordinate, dimension, width, drill, region, measurement and SVG geometry uses mil. There is no unit switch, historical plan workflow or compatibility alias.

[Skill](SKILL.md) · [Operation examples](references/operation-recipes.md) · [Data and SVG](references/data-feedback.md) · [中文](README.md).

Run `node --test tests/*.test.mjs` for documentation and example validation. Production-board quality and live writes require separate verification.

Guidance now covers complete functional channels, reference-layer roles, return-targeted via placement, scoped refresh after native topology changes, and evidence-bounded reporting. Scenario fixtures and static checks are not model-behavior or production-board validation.
