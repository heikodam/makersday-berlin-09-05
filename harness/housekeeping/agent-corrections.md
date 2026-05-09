# Agent Corrections Log

Append-only log of human corrections to agent behaviour. Each entry records what the agent did, what the human corrected it to, and the suspected root cause. Patterns in this log feed the harness-improvement review cycle.

**Do not delete or edit existing entries.** To close an entry, update its `status` field only.

See `harness/skills/housekeeping/log-agent-correction.md` for the how-to guide on writing entries.

---

## Format

```
### YYYY-MM-DD — <PR or branch link>

- **Agent output:** <What the agent did or produced>
- **Human correction:** <What the human changed it to, or asked the agent to do differently>
- **Suspected root cause:** <missing-skill | wrong-skill | unclear-rule | stale-knowledge | other>
- **Detail:** <Optional: which skill, rule, or knowledge file was missing or misleading>
- **Status:** open | promoted-to-fix | wont-fix
```

---

## Entries

<!-- New entries go here, most recent first -->
