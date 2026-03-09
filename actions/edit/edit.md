# File Edit Format

This project uses an AI-friendly file editing protocol inspired by modern AI coding tools
(Aider, Cursor, Claude Code, Codex CLI).

The goal is to make patches:

- predictable for LLMs
- readable for humans
- compatible with Git workflows
- robust for automated application

---

## Default Editing Method

The default method for modifying files is **Unified Diff**.

Unified diff is the same format used by `git diff`.

Example:

```diff
--- a/AGENT.md
+++ b/AGENT.md
@@
-Do not act from memory.
+Do not act from memory when a rule exists.
```

Rules:

- Always include file paths.
- Only include the minimal required change.
- Do not rewrite entire files if a diff is sufficient.

---

## Whole File Rewrite

If a change affects most of a file, return the entire file.

Example:

```file AGENT.md
# Project Agent Guide

Full new file content here.
```

Rules:

- Use this when more than ~50% of the file changes.
- Prefer diff for smaller edits.

---

## Search / Replace Blocks

When the exact line location may shift,
use a **search/replace block**.

Example:

```patch
FILE: rules/engineering/testing.md

SEARCH
Old paragraph text.

REPLACE
New paragraph text.
```

Rules:

- SEARCH must uniquely identify the block.
- Replace only the minimal section required.

---

## When Editing JSON

If the file is structured JSON,
use **JSON Patch (RFC 6902)**.

Example:

```json
[
  { "op": "replace", "path": "/name", "value": "New Name" }
]
```

Only use this for real JSON documents.

---

## Priority Order

When producing edits:

1. Use **Unified Diff**
2. Use **Whole File Rewrite** if diff becomes large
3. Use **Search/Replace** if position is unstable
4. Use **JSON Patch** only for JSON documents

---

## Goal

The edit format must remain:

- deterministic
- minimal
- easy to review
- safe to apply automatically
