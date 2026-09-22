# EasyEDA PCB Layout and Routing Skill

[简体中文](README.md) | English

This repository contains execution guidance for AI agents working on production-oriented PCB designs in EasyEDA Pro. The current version is **5.3.1**. It turns an approved schematic into a board by covering board outlines, functional partitioning, component orientation, placement, explicit routing, copper pours, silkscreen, verification, and manufacturing delivery. It is not a second schematic-review process.

## Core principles

- Treat the supplied schematic as approved input. Read PCB objects to place and route them, not to restart component selection or datasheet review.
- Produce real board progress first, then run checks that are directly relevant to the current action.
- Base placement on power loops, signal chains, return paths, connector access, assembly sides, and mechanical boundaries.
- Prefer copper areas or wide copper for high-current regions when isolation and return paths remain sound; do not replace pourable regions with many narrow traces.
- Do not use automatic routing. Route explicitly and resolve congestion by improving placement and orientation.
- Keep ordinary components unlocked by default. During full-board finishing, remove all visible reference-designator silkscreen while preserving the mandatory `Designator` identity attributes, BOM linkage, and functional text.
- Make silkscreen readable at real manufacturing scale. Connector names, pin order, and net meaning take priority over low-value reference text.
- Merge valid user interventions into the current design and continue from the latest state instead of reverting to an older plan.

See [SKILL.md](SKILL.md) for the complete workflow, gates, tool routing, and acceptance rules. Load files under `references/` and `templates/` only when the current task needs them.

## Component boundaries

| Component | Responsibility |
| --- | --- |
| `easyeda-pcb-layout-routing` | PCB engineering decisions, execution order, and acceptance criteria |
| `easyeda-pcb-mcp` | Typed operations and independent readback against the active EasyEDA PCB document |
| `easyeda-api` | Bridge, Gateway, window identity, protocols, and general public APIs |
| `easyeda-schematic-net-fanout` | Schematic design, ECO handling, and circuit presentation |
| `easyeda-eprj3` | Offline `.eprj3` generation and format validation |

## Usage

Install this directory as an AgentDock Skill or in another agent system that supports `SKILL.md`. It should be loaded when an agent is asked to create a PCB from an approved schematic, continue placement/routing/pours/silkscreen, audit user constraints, or feed stable capability gaps back into the Skill or MCP without abandoning the board task.

This repository does not provide an autorouter and does not replace final engineering review of electrical safety, current capacity, mechanics, and manufacturing output.

