# Log an Agent Correction

Write an entry in `harness/housekeeping/agent-corrections.md` whenever a human corrects agent behaviour during the apply-fixes stage or a housekeeping sweep.

## When to invoke this skill

- **During apply-fixes (004):** A human PR comment amounts to "you should have known X" — the agent made an error that a better skill, rule, or knowledge file would have prevented.
- **During housekeeping (005):** A final sweep to promote patterns from the correction log into harness improvements.

Do not log corrections for:
- Functional bugs that were not a harness gap (the agent simply made a logic error).
- Preference-only changes where no rule was violated or unclear.
- Comments the human dismissed — if they dismissed it, it is not an agent failure.

---

## Step 1 — Identify the root cause

Before writing the entry, determine which category the correction falls into:

| Root cause | Meaning |
|---|---|
| `missing-skill` | No harness skill covered this task; the agent had to guess |
| `wrong-skill` | A skill existed but pointed the agent in the wrong direction |
| `unclear-rule` | A rule existed but was ambiguous enough that the agent misapplied it |
| `stale-knowledge` | A knowledge file was out of date relative to the actual codebase |
| `other` | None of the above — describe in the detail field |

---

## Step 2 — Write the entry

Open `harness/housekeeping/agent-corrections.md` and prepend a new entry under `## Entries` using this format:

```
### YYYY-MM-DD — <PR or branch link>

- **Agent output:** <What the agent did or produced — be specific enough that a reader can reconstruct the error>
- **Human correction:** <What the human changed it to, or asked the agent to do differently>
- **Suspected root cause:** <missing-skill | wrong-skill | unclear-rule | stale-knowledge | other>
- **Detail:** <Which skill, rule, or knowledge file was missing or misleading. For `other`, explain the failure mode>
- **Status:** open
```

Keep the description factual and concise. The goal is to accumulate enough signal to identify harness improvements — not to assign blame.

---

## Step 3 — Continue with your original task

After writing the entry, return to whatever triggered this skill (applying fixes, housekeeping sweep). This is a logging step — it does not change the fix you are applying.

---

## Terminal conditions

This skill is complete when:
- An entry has been written in `agent-corrections.md` with `status: open`.
- You have resumed the task that triggered this skill.
