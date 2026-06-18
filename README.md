# Custom Checkboxes

An Obsidian plugin for configuring custom checkbox variants and rendering each one with a custom SVG icon.

Obsidian recognizes any single character between `[ ]` as a task marker — e.g. `- [x]`, `- [/]`, `- [?]`. This plugin lets you assign a name, an SVG icon, a color, and a "completed" flag to each character, then renders those icons in both Reading view and Live Preview.

## Features

- **Custom icons per variant** — paste any SVG source and it'll be sanitized and rendered in place of the bracket character.
- **Quick toggle** — short-click an empty checkbox to mark it with your default character; short-click a checked one to clear it.
- **Variant menu** — long-press, shift-click, or right-click a checkbox to open a popup of all configured variants.
  - **Drag-to-select** — keep the pointer down after a long-press and release over the variant you want.
  - **Keyboard** — `↑`/`↓`/`Home`/`End` to navigate, `Enter` to pick, `1`–`9` to jump straight to a row, `Esc` to dismiss.
- **Editor command** — "Open custom checkbox menu at cursor" (bind it to a hotkey to open the menu without the mouse).
- **Completed-state styling** — variants flagged as "completed" apply a strikethrough / muted style to the whole task line.
- **Works in Reading view *and* Live Preview** — both can be toggled independently in settings.

## Usage

1. Install and enable the plugin.
2. Open *Settings → Custom Checkboxes*.
3. Add or edit variants. Each variant has:
   - **Character** — the single character that appears between the brackets (e.g. `x`, `/`, `?`).
   - **Name** — shown in the variant menu.
   - **SVG source** — the icon to render. Anything that parses as `<svg>…</svg>` works; `currentColor` will be honored so the **Color** field can theme it.
   - **Color** — optional CSS color (`#hex`, `rgb(…)`, or an Obsidian variable like `var(--text-accent)`).
   - **Mark as completed** — when on, task lines with this character get strikethrough styling.
4. Use the variants from any task list:

   ```markdown
   - [ ] Pending task
   - [x] Done
   - [/] In progress
   - [?] Question
   - [!] Important
   ```

## Settings reference

| Setting | What it does |
| --- | --- |
| **Icon size** | CSS length (e.g. `1.15em`, `18px`) for the rendered checkbox. |
| **Default 'checked' character** | What an empty box becomes when short-clicked. Default `x`. |
| **Enable in Reading view** | Toggle the reading-view post-processor. Restart Obsidian after changing. |
| **Enable in Live Preview / Source** | Toggle the live-preview integration. Restart Obsidian after changing. |

## Development

```bash
npm install            # install deps (uses --legacy-peer-deps for React)
npm run dev            # esbuild watch
npm run build          # tsc + esbuild production
```
