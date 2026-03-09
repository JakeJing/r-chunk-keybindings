# R Chunk Keybindings

A lightweight Positron / VS Code extension that adds keyboard shortcuts for navigating and inspecting R code chunks in `.Rmd` and `.qmd` files.

---

## Features

- Jump to the start or end of an R chunk with a single keystroke
- Select the entire chunk including fences
- Select the word under the cursor
- Send `View()` or `head()` of the word / selection directly to the R console
- Automatically strips trailing pipes (`%>%` or `|>`) before calling `head()`
- Returns editor focus after console execution

All shortcuts are scoped to R Markdown (`.Rmd`) and Quarto (`.qmd`) files only, so they never interfere with other file types.

---

## Keybindings

| Command | Shortcut (Mac) | Shortcut (Win/Linux) | Description |
|---|---|---|---|
| R Chunk: Select Whole Chunk | `Ctrl+S` | `Ctrl+S` | Select the entire chunk including the ` ```{r} ` and ` ``` ` fences |
| R Chunk: Move to Chunk Start | `Ctrl+A` | `Ctrl+A` | Move cursor to the first line inside the chunk, then center the viewport |
| R Chunk: Move to Chunk End | `Ctrl+E` | `Ctrl+E` | Move cursor to the last line inside the chunk, then center the viewport |
| R: Select Word at Cursor | `Ctrl+W` | `Ctrl+W` | Select the full word under the cursor (R-aware: includes `.` in names like `my.data.frame`) |
| R: View Object at Cursor | `Cmd+U` | `Ctrl+U` | Run `View(<word or selection>)` in the R console |
| R: Head Object at Cursor | `Cmd+H` | `Ctrl+H` | Run `head(<word or selection>)` in the R console, strip trailing pipes, return focus to editor |

> **Note:** Shortcuts only activate when `editorLangId` is `rmd` or `quarto`, so default editor shortcuts are preserved in all other file types.

---

## Chunk Navigation Details

### `Ctrl+S` — Select Whole Chunk

Selects everything from the opening ` ```{r ...} ` fence to the closing ` ``` ` fence (inclusive). Useful for copying, cutting, or running the whole block.

### `Ctrl+A` — Move to Chunk Start

Moves the cursor to column 0 of the first line of code inside the chunk (the line after the opening fence), then vertically centers the viewport.

### `Ctrl+E` — Move to Chunk End

Moves the cursor to column 0 of the last line of code inside the chunk (the line before the closing fence), then vertically centers the viewport.

---

## Console Commands Details

### `Cmd+U` — View Object

Resolves the target in this order:

1. If text is selected, uses the selection
2. Otherwise expands to the full word at the cursor (R-aware regex: `/[\w.]+/`)

Then runs:

```r
View(<target>)
```

### `Cmd+H` — Head Object

Same word resolution as `View`, but additionally **strips trailing pipes** before wrapping in `head()`.

For example, if your cursor is on or you have selected:

```r
df %>%
  filter(x > 1) %>%
```

The extension strips the dangling `%>%` and runs:

```r
head(df %>% filter(x > 1))
```

Focus is automatically returned to the editor after execution.

#### Supported pipe operators

| Pipe | Example |
|---|---|
| magrittr `%>%` | `df %>% filter(x > 1) %>%` → `head(df %>% filter(x > 1))` |
| native `\|>` | `df \|> filter(x > 1) \|>` → `head(df \|> filter(x > 1))` |

---

## Chunk Detection

Chunks are detected using regular expressions:

| Pattern | Matches |
|---|---|
| `` /^```\{r.*?\}/ `` | Opening fences: `` ```{r} ``, `` ```{r label, echo=FALSE} `` |
| `` /^```\s*$/ `` | Closing fences: ` ``` ` alone on a line |

The extension walks upward from the cursor to find the opener and downward to find the closer, so all commands work regardless of where the cursor is inside the chunk.

---

## Console Execution Strategy

The extension tries three strategies in order to send code to R:

1. **Positron native API** — `acquirePositronApi().runtime.executeCode('r', code, true, false)` *(preferred in Positron)*
2. **Positron built-in command** — `workbench.action.executeCode.console` with `{ langId: 'r', code }`
3. **Terminal fallback** — finds a terminal named `R` or creates one and uses `sendText`

This ensures the extension works in Positron, VS Code with the R extension, or any other VS Code-based IDE.

---

## Requirements

- [Positron](https://github.com/posit-dev/positron) **or** VS Code `^1.75.0` with the [R extension](https://marketplace.visualstudio.com/items?itemName=REditorSupport.r)
- Files must be `.Rmd` (language ID `rmd`) or `.qmd` (language ID `quarto`)

---

## Installation

### From the Marketplace

Search for **R Chunk Keybindings** in the Extensions panel (`Cmd+Shift+X`) and click **Install**.

### From a `.vsix` file

```bash
# Package locally
npm install -g @vscode/vsce
vsce package

# Install in Positron / VS Code
# Extensions panel → ··· menu → Install from VSIX...
```

---

## Extension Settings

This extension does not contribute any settings. All behaviour is controlled via the keybindings defined in `package.json`.

---

## Known Issues

- `Ctrl+A` and `Ctrl+E` override the default "select all" and "go to line start" shortcuts **inside `.Rmd` / `.qmd` files only**. If you need those defaults, rebind the commands via **Preferences → Keyboard Shortcuts**.
- `Cmd+H` on macOS may conflict with the system **Hide Window** shortcut. If so, rebind it in **Preferences → Keyboard Shortcuts**.

---

## Release Notes

### 0.0.1

Initial release:

- `rChunk.selectWholeChunk` — select whole chunk with fences
- `rChunk.moveToChunkStart` — jump to chunk start with viewport centering
- `rChunk.moveToChunkEnd` — jump to chunk end with viewport centering
- `r.selectWord` — R-aware word selection (supports dotted names)
- `r.viewObject` — send `View()` to R console
- `r.headObject` — send `head()` to R console with pipe stripping and focus return

---

## Contributing

Issues and pull requests are welcome at [github.com/your-username/r-chunk-keybindings](https://github.com/your-username/r-chunk-keybindings).

---

## License

[MIT](LICENSE)
