# Pi config repo

This repository is a portable Pi setup you can clone to other devices.

## What it gives you

- dark UI defaults
- manual model selection
- step-by-step workflow
- `tasks/`-first planning
- risky-command guard
- reusable prompts and skills

## Install

Clone or sync this repo to `~/.pi/agent`.

```bash
git clone <repo-url> ~/.pi/agent
```

Or sync from an existing clone:

```bash
./install.sh ~/.pi/agent
```

## Notes

- Choose the model manually with `/model` or `Ctrl+L`.
- Keep active work in `tasks/<name>.md` inside each project.
- The repo intentionally avoids tracking secrets, sessions, and auth files.

## Layout

- `settings.json` — global Pi settings
- `AGENTS.md` — global workflow guidance
- `APPEND_SYSTEM.md` — extra system instructions
- `prompts/` — reusable slash commands
- `skills/` — reusable capabilities
- `extensions/` — local TypeScript extensions
- `project-template/` — files to copy into new projects
