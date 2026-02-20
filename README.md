# Student Finance Tracker
Here is the [Tutorial](https://youtu.be/8KBIe_j9GvU). 
Run it [here](https://dsemana.github.io/student_finance_tracker-dsemana).

## Chosen Theme
Student finance tracker is a student-focused spending tracker built around everyday student expenses (cafe runs, transport, print supplies, club events, and tuition/admin fees).

## Features List
- Add a spending entry with note, amount, category, and date.
- Edit and delete existing entries.
- Sort entries by note, amount, category, and date.
- Regex-based search across note and category.
- Toggle search matching mode (ignore case vs match case).
- Budget limit tracking with live remaining/over-limit status.
- Settings for currency symbol, currency label, and custom spending buckets.
- JSON export/import for backup and restore.
- Local persistence via `localStorage`.

## Regex Catalog (Patterns + Examples)
### 1) Description (`descRegex`)
- Pattern: `/^\S(?:.*\S)?$/`
- Meaning: must not start or end with whitespace.
- Valid examples: `"Lunch at cafeteria"`, `"Bus pass"`
- Invalid examples: `" Lunch"`, `"Dinner "`

### 2) Amount (`amountRegex`)
- Pattern: `/^(0|[1-9]\d*)(\.\d{1,2})?$/`
- Meaning: non-negative number, no leading zeros (except `0`), up to 2 decimal places.
- Valid examples: `"0"`, `"15"`, `"12.50"`
- Invalid examples: `"012"`, `"12.345"`, `"-5"`

### 3) Date (`dateRegex` + calendar validation)
- Pattern: `/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/`
- Meaning: requires `YYYY-MM-DD` shape, then validated as a real calendar date.
- Valid examples: `"2024-02-29"`, `"2025-09-29"`
- Invalid examples: `"2025-13-10"`, `"2025-09-32"`, `"2025-02-29"`

### 4) Category (`categoryRegex`)
- Pattern: `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/`
- Meaning: letters only, optional spaces or hyphens between words.
- Valid examples: `"Cafe Runs"`, `"Print Supplies"`, `"Bus-Pass"`
- Invalid examples: `"Food123"`, `"Snacks!"`

### 5) Duplicate Consecutive Word (`duplicateRegex`)
- Pattern: `/\b(\w+)\s+\1\b/i`
- Meaning: detects repeated adjacent word (case-insensitive).
- Match example: `"coffee coffee"`
- Non-match example: `"coffee tea"`

### 6) Search Regex (user input)
- Built dynamically with `new RegExp(input, flags)` in `compileRegex`.
- Valid examples: `\d+`, `coffee|bus|print`, `^club`
- Invalid example: `(` (handled safely; search is ignored)

## Keyboard Map
- `Tab` / `Shift+Tab`: move through form controls, buttons, and sortable table headers.
- `Enter` on form submit button: save entry.
- `Enter` or `Space` on sortable header: toggle sort for that column.
- Typing in search input: filters entries live.
- `Enter`/`Space` on buttons (native behavior): trigger update/delete/export/import/save preferences actions.

## A11y Notes
- Live regions:
  - Snapshot and budget status use `role="status"` with `aria-live`.
  - Budget over-limit state switches to assertive announcements.
- Field validation:
  - Error text uses `role="alert"`.
  - Invalid inputs set `aria-invalid="true"`.
- Sorting:
  - Sort headers update `aria-sort` (`none`, `ascending`, `descending`).
  - Headers are keyboard-focusable and keyboard-operable.
- Search label:
  - Includes a visually hidden (`sr-only`) label for screen reader context.
- Focus visibility:
  - High-contrast `:focus-visible` outlines on interactive controls.

## How To Run Tests
The repo includes browser-based tests in `tests.html`.

1. Start a static server from the project root:
   ```powershell
   python -m http.server 5500
   ```
2. Open:
   - App: `http://localhost:5500/index.html`
   - Tests: `http://localhost:5500/tests.html`
3. Read PASS/FAIL lines on the tests page.

Optional quick syntax checks:
```powershell
node --check scripts/ui.js
node --check scripts/storage.js
node --check scripts/validators.js
```
