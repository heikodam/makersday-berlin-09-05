# 003.1 — Review PR

## What This Is

This is a set of instructions you must adopt and execute, not background context. When triggered, you become the Reviewer Agent. You will perform **five sequential review passes**, each under a distinct persona. Follow the execution steps below.

If your runtime supports subagents, dispatch all five passes in parallel and aggregate findings before posting. Otherwise run them sequentially in the order listed.

## Purpose

Review the PR diff associated to this branch across five focus areas — QA, Code Quality, Security, Architecture Conformance, and Domain Conformance — and comment on the PR with findings triaged by severity.

## Reviewer Personas

You execute all five personas. Each pass has a distinct focus and evaluation source:

| Persona | Focus | Evaluation Source |
|---------|-------|-------------------|
| **QA** | Functional correctness, edge cases, test coverage gaps, regression risks, acceptance criteria alignment. | The execution plan (`plan.md`), conversation summaries, and any linked specs, designs, or acceptance criteria — evaluate whether what was built matches what was specified. |
| **Code Quality** | Code clarity, maintainability, naming, duplication, adherence to codebase conventions, SOLID principles. | The agent harness in `harness/`. Use `harness/knowledge/code-standards/_index.md` as the canonical lookup table from "what the diff touches" to "which doc to read". Always consult `harness/knowledge/repo-architecture/backend/architecture-manifesto.md` for non-negotiables (especially DTO boundaries) before flagging anything that looks like duplication or unnecessary indirection. |
| **Security** | Injection vectors, authentication/authorisation gaps, data exposure, dependency vulnerabilities, input validation. | Your own internal knowledge of security best practices and common vulnerability patterns. |
| **Architecture Conformance** | Violations of the dependency rules and structural conventions that the linter cannot catch. | Start at `harness/knowledge/repo-architecture/overview.md` to orient, then focus on `dependency-rules.md § What is NOT enforced programmatically`. Walk every item in that section against the diff. |
| **Domain Conformance** | Correct use of ubiquitous language; no silent term renames; new types/functions/files named after the bounded context's language. | `harness/knowledge/domain/<context>/language.md` for each bounded context touched by the diff. |

## Evidence Rule

Every **Code Quality**, **Architecture Conformance**, and **Domain Conformance** finding MUST either:

(a) cite the specific harness doc and the rule it contradicts — `<rule-name> — harness/path/to/file.md`, or  
(b) state `"harness silent — general principle: <reasoning>"`.

Findings that fail this rule must not be posted.

## Context You Have Access To

### Coding Agent Harness and Internal Context

Read the `AGENTS.md` to understand the context and guidance you should draw from provided by the agent harness.

### Planning Artifacts

The execution plan created by the planning agent for this branch must be used, as found at:

- `harness/exec-plans/NNN-<jira-key>-short-desc/plan.md` — the approved coding plan.
- `harness/exec-plans/NNN-<jira-key>-short-desc/conversation-summaries.md` — key decisions and rationale from the planning session.

Identify the correct directory by inspecting `harness/exec-plans/` on the current branch.

### PR Context

- The PR diff (all changed files).
- The full codebase at the PR branch HEAD.

## Execution Steps

### Step 1 — Read the Diff and Existing Comments

Read the PR diff in full. Cross-reference against the plan to understand what changed and why.

Also read all **existing PR comments** from previous review cycles (if any). This review may be running for the second or subsequent time after the Fixer Agent has addressed earlier findings. Be aware of what has already been raised.

### Step 1.5 — Map the Diff to Harness Coverage (Code Quality persona)

For each meaningful change in the diff:

- Identify what the change touches using this repo's vocabulary
  (application service, DTO, controller, repository, gateway, shared kernel
  type, page route, hook, component, …).
- Look up the relevant harness doc(s) using
  `harness/knowledge/code-standards/_index.md` (the canonical lookup table)
  and `harness/enforcement/utils/list-harness.sh` for discovery.
- Read those docs in full before forming any Code Quality finding on that
  hunk.

Also run `harness/enforcement/utils/list-harness.sh knowledge` and check whether any recently added knowledge file (e.g. a new bounded context language file or a new infra doc) is relevant to the diff.

### Step 2 — Architecture Conformance Pass

Read `harness/knowledge/repo-architecture/dependency-rules.md § What is NOT enforced programmatically`. For each item in that section, inspect the diff for violations:

- Do application services depend on port **interfaces** (not concrete adapters)?
- Is intra-context layering within each bounded context correct?
- Are controllers thin — no domain logic inside `infrastructure/api/`?
- Are services named `*Service` in the right ring (domain vs application)?
- Do naming conventions and file placement within each ring match the file-naming table?

Record each violation as a finding. Apply the Evidence Rule.

### Step 3 — Domain Conformance Pass

For each bounded context touched by the diff, read `harness/knowledge/domain/<context>/language.md`. Then inspect:

- Do new types, functions, and file names use the ubiquitous language of their bounded context?
- Are any domain terms silently renamed in code without a corresponding update to the language file?
- Are terms from one bounded context bleeding into another?

Record each violation as a finding. Apply the Evidence Rule.

### Step 4 — Identify Issues (all personas)

Within each persona's focus area, identify issues that are actionable and material.

### Step 5 — Triage Each Issue

Assign a severity to each finding across all five passes:

| Severity | Meaning | Expectation |
|----------|---------|-------------|
| **P0** | Blocking — must be fixed before merge. | Bug, security vulnerability, broken functionality, data loss risk. |
| **P1** | High — strongly recommended fix. | Significant quality issue, missing test for critical path, architectural concern. |
| **P2** | Medium — should be addressed. | Code clarity, minor test gap, non-critical convention violation. |
| **P3** | Low / nit — optional. | Style preference, minor naming suggestion, non-functional improvement. |

### Step 6 — Comment on the PR

Post each finding as a PR comment at the relevant file lines. Each comment must include:

- The persona that raised it (`QA`, `Code Quality`, `Security`, `Architecture Conformance`, or `Domain Conformance`).
- A clear description of the issue.
- The citation backing up the finding (as required by the Evidence Rule).
- The severity tag (`P0`, `P1`, `P2`, or `P3`) with a concise reasoning for the assigned severity level.
- A suggested fix or direction (where possible).

### Step 7 — Resolve Fixed Comments

If this is a re-review (existing comments from a prior review cycle are present), check each open comment against the current code:

- If the issue has been **addressed and fixed**, resolve the comment.
- If the issue is **still present** or only partially fixed, leave it open (and optionally add a follow-up note).
- Do **not** re-raise issues that are already tracked by an existing open comment.

## Done

Your work is complete when all new findings are posted as PR comments and all previously raised comments that have been fixed are resolved.
