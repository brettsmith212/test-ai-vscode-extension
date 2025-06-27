# Amp VS Code Extension — Improved Source-Control Experience

_A backbone spec for implementation_

---

## 1 Goals & Principles

1. **Stay in-flow** – keep developers inside native VS Code; no context-switch to a separate app.
2. **Augment, don’t replace** – raw `git diff` remains the ground-truth, layered with AI insight.
3. **On-demand detail** – annotations stay collapsed until the dev asks for more.
4. **Zero trust-tax** – every suggestion can be traced to evidence (tests, coverage, lint).

---

## 2 Feature Stack at a Glance

| Layer                      | Developer sees                                                     | API surface                                             | Purpose                                    |
| -------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------ |
| **0 Raw Diff**             | Standard split/unified view                                        | Built-in `vscode.diff`                                  | Preserve muscle memory.                    |
| **1 Inline ℹ️ Icon**       | Gutter decoration → hover rationale                                | `TextEditorDecorationType` + Comments API               | Explain _why_ a line changed.              |
| **2 Evidence Chip**        | CodeLens / hover card: tests ✔, coverage +4 %                      | `CodeLensProvider` or threaded comments                 | Provide proof to skip manual test runs.    |
| **3 File-List Decoration** | Glyph + tooltip on each file in _Changes_                          | `SourceControlResourceDecorations`                      | Triage which files to open first.          |
| **4 “Amp Review” Tree**    | Extra pane under SCM list, grouped by risk/feature                 | `createTreeView` in `scm` container                     | Higher-level overview without leaving SCM. |
| **5 `amp-diff` Webview**   | Full-screen diff w/ collapsible “story beats” & right-rail widgets | Custom Editor (`amp-diff://`), Webview (React/Tailwind) | Unlimited UI for deep dives.               |

---

## 3 User Workflow

1. **Stage** changes as usual in Source Control.
2. Click **“Review with Amp”** → opens the `amp-diff` tab.
3. Skim raw diff; hover ℹ️ icons to read rationale only where curious.
4. Expand evidence chips to view test results, coverage deltas, perf snippets.
5. Use _Amp Review_ tree to jump to risky or doc-only changes.
6. Click **Approve** (commit) or **Reject** (restore) directly inside the Webview.

---

## 4 Implementation Notes

### 4.1 APIs & Feasibility (desktop VS Code)

| Capability                | Feasible? | Notes                                                                  |
| ------------------------- | --------- | ---------------------------------------------------------------------- |
| Gutter icons & hovers     | ✔         | Decorations + markdown hovers.                                         |
| Comment threads           | ✔         | Markdown + buttons inside diff.                                        |
| Add pane under SCM        | ✔         | `TreeView` contribution to `scm`.                                      |
| Custom diff tab           | ✔         | Webview w/ full React UI; shell to `git`, run tests, tree-sitter diff. |
| Re-skin built-in Git list | ✘         | DOM is locked; decorations only.                                       |

### 4.2 Browser (Codespaces) Parity

_Same UI works,_ but heavy tasks (diff, tests) move to a small Amp backend service; no Node `child_process`.

---

## 5 Roll-out Plan

| Phase       | Scope                                                      | Duration  | Success signal                            |
| ----------- | ---------------------------------------------------------- | --------- | ----------------------------------------- |
| **Spike A** | ℹ️ decoration + rationale hover                            | 2 days    | Positive noise/clarity feedback.          |
| **Spike B** | _Amp Review_ TreeView + file glyphs                        | 1 week    | Devs navigate via tree >50 % of the time. |
| **Spike C** | `amp-diff` Webview with collapsible beats & evidence chips | 2–3 weeks | Review time ↓ 20 % vs. vanilla diff.      |

---

## 6 Architecture Sketch

```mermaid
flowchart TD
  subgraph VSCode Extension (Node host)
    A[SCM Provider] -->|decorations| B(Source Control List)
    A -->|Tree data| C(TreeView: Amp Review)
    D[Diff Hook] -->|Δ| E[Decoration Manager]
    D --> F(Webview: amp-diff)
    F <-->|RPC| G[Amp Agent (LLM API)]
    F <-->|spawn| H[Local Test Runner]
  end
```

_Legend: the extension shells to `git` & test runners locally; Webview talks back via `vscode.postMessage`._

---

## 7 Open Questions

1. **Hover brevity** – ideal rationale length before it feels noisy?
2. **Evidence default** – collapsed by default, or auto-expand on risky hunks?
3. **Grouping logic** – in _Amp Review_ tree, group by feature branch, risk, or agent?

---

## 8 Next Actions

- Generate minimal extension scaffolding (Yo Code).
- Implement decoration POC; gather internal feedback.
- Instrument timings to benchmark review speed gains.

---

### References

- VS Code **SCM & Decorations** API docs.
- Copilot & GitHub Repositories extensions for commit-box and web-host patterns.
- Tree-sitter diff example (SemanticDiff) for structural move detection.

---

_Prepared 26 Jun 2025 — America/Los_Angeles_
