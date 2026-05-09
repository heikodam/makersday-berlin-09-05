# Harness Improvement Review

Periodically review the agent corrections log, cluster patterns by root cause, and translate them into concrete harness change proposals. The output is a small exec-plan that enters the normal planning → build → review cycle.

Run this skill at the start of a housekeeping session, or whenever `agent-corrections.md` has accumulated 5+ open entries.

---

## Step 1 — Read the corrections log

Open `harness/housekeeping/agent-corrections.md` and read all entries with `status: open`.

If there are fewer than 3 open entries, this review is premature. Stop and note the entry count. Schedule a follow-up when more entries have accumulated.

---

## Step 2 — Cluster by root cause

Group the open entries by their `suspected-root-cause` field:

- `missing-skill` — tasks the agent had no playbook for
- `wrong-skill` — skills that actively misdirected the agent
- `unclear-rule` — rules that were ambiguous in practice
- `stale-knowledge` — knowledge files that did not reflect the actual codebase
- `other` — review individually

Within each cluster, look for common patterns:
- Do multiple entries point to the same skill, rule, or knowledge file?
- Is there a category of task (e.g. migration, gateway integration) that lacks coverage?
- Are there repeated misunderstandings of the same concept?

---

## Step 3 — Prioritise clusters

Score each cluster:

| Signal | Weight |
|---|---|
| 3+ entries in one cluster → same root cause | High priority |
| 2 entries, same file referenced | Medium priority |
| 1 entry, fundamental failure | Medium priority |
| 1 entry, edge case | Low priority |

Carry forward only High and Medium clusters. Note Low clusters but do not propose changes for them.

---

## Step 4 — Propose harness changes

For each High and Medium cluster, propose a concrete harness change:

- **missing-skill:** Draft the skill outline (title, When to invoke, key steps) as a planning-stage proposal. Name the file it would create.
- **wrong-skill:** Identify the specific step(s) that misdirected the agent and propose revised wording.
- **unclear-rule:** Identify the ambiguous rule and propose a clarification or example.
- **stale-knowledge:** Identify which knowledge file is stale and what needs updating. Note whether you can update it now or whether it requires investigation.

---

## Step 5 — Write an exec-plan

Create a new exec-plan at `harness/exec-plans/NNN-<jira-key>-harness-improvements/plan.md` following the standard exec-plan format. The plan should list each proposed change as a todo item, reference the correction entries that motivated it, and classify each change as:

- **New file** — a new skill, knowledge, or housekeeping file
- **Edit** — a targeted change to an existing file
- **Sweep** — a search-and-replace across multiple files

---

## Step 6 — Mark source entries

For each correction entry that was directly addressed by a proposal in Step 5, update its `status` to `promoted-to-fix` and add a line: `- **Promoted to:** <exec-plan path>`.

Entries not addressed (low-priority or `wont-fix`) should remain `open` or be updated to `wont-fix` with a brief reason.

---

## Terminal conditions

This skill is complete when:
- An exec-plan exists capturing all High and Medium cluster proposals.
- All source correction entries have their status updated (`promoted-to-fix` or retained as `open`).
- You have not started implementing changes — this is a planning-stage output. Bring the plan to a human for approval before acting on it.
