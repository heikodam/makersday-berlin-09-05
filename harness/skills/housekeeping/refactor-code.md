# Refactoring

Systematically improve the internal structure of existing code without changing its external behaviour. This skill translates the principles from Martin Fowler's *Refactoring: Improving the Design of Existing Code* into a two-phase process: first audit and plan, then implement with approval.

**Cardinal rule:** Refactoring and feature work are two separate activities. Wear one hat at a time. If you discover missing behaviour during a refactoring pass, stop, switch hats, add a failing test and implement the behaviour, then switch back.

---

## Overview

| Phase | Goal | Output | Requires human? |
|-------|------|--------|-----------------|
| **Phase 1 — Audit & Plan** | Scan the codebase for code smells, prioritise findings, and propose concrete refactorings | An exec-plan document in `harness/exec-plans/` | Yes — human reviews and approves before Phase 2 |
| **Phase 2 — Implement** | Execute the approved refactorings in small, tested, committed steps | Clean code + commits | No — but human can review commits |

---

# Phase 1 — Audit & Plan

The goal of Phase 1 is *analysis only*. Do not change any source code. The output is a written plan that a human can review, adjust, and approve.

---

## Step 1.1 — Scope

Determine what code to audit. This can come from:

- A human-specified scope (e.g. "audit the library module", "look at `app/backend.server/application/library/`")
- The code you are about to change for a feature or fix (campsite rule — audit what is in the way)
- A full-codebase sweep (only when explicitly requested)

If no scope is given, ask the human before proceeding.

---

## Step 1.2 — Detect Smells

Read the code within the agreed scope. For each file or module, check against the smell catalog below. Record every smell you find — do not fix anything.

### Function / Method-Level Smells

| Smell | How to spot it |
|-------|---------------|
| **Long Function** | Function body exceeds ~15–20 lines, or you need to scroll to understand it. Multiple levels of abstraction in a single body. |
| **Duplicated Code** | Same or near-identical logic appears in two or more places. Copy-paste with minor variations. |
| **Too Many Parameters** | Function takes 4+ parameters. Often a sign that a concept is missing. |
| **Flag Arguments** | A boolean parameter that makes the function do two different things. Callers pass `true` or `false` to toggle behaviour. |
| **Dead Code** | Functions, branches, or variables that are never reached. Exports with zero consumers. |

### Data / State Smells

| Smell | How to spot it |
|-------|---------------|
| **Primitive Obsession** | Using raw strings, numbers, or booleans to represent domain concepts (e.g. a `string` for an email address, a `number` for currency). |
| **Data Clumps** | The same group of fields or parameters travels together across multiple functions or objects. |
| **Mutable Data** | Objects or variables that are mutated in multiple places, making it hard to track state changes. |
| **Temporary Field** | A field on an object that is only set in some circumstances and `undefined` otherwise. |

### Module / Class-Level Smells

| Smell | How to spot it |
|-------|---------------|
| **Large Class / Module** | A single file does too many things. More than one "reason to change." |
| **Feature Envy** | A function uses more data or methods from another module than from its own. |
| **Shotgun Surgery** | A single conceptual change requires edits across many unrelated files. |
| **Divergent Change** | One module is changed for multiple unrelated reasons (opposite of shotgun surgery). |
| **Middle Man** | A class that delegates almost everything to another class, adding no value. |
| **Speculative Generality** | Abstractions, parameters, or extension points that exist "in case we need them" but have no current consumer. |
| **Message Chains** | Long accessor chains like `a.b().c().d()` coupling the caller to the entire navigation structure. |

### Project Code-Standards Violations

The smell tables above cover universal code smells. You must also check the scoped code against this project's own conventions in `harness/knowledge/code-standards/`.

1. Open `harness/knowledge/code-standards/_index.md` — it maps task types to the relevant standards files.
2. Based on what the scoped code touches (React components, hooks, backend services, API endpoints, error handling, naming, TypeScript/Zod usage, etc.), read the relevant standards files listed there.
3. For each file read, check whether the scoped code violates any convention it defines. Record violations as findings alongside the classical smells above — noting which standard was violated and where.

Do not front-load every standards file. Only read those that are relevant to the code under audit.

---

## Step 1.3 — Prioritise

Not every smell is worth fixing. Score each finding against these criteria:

1. **Is it in the way?** Does the smell make current or upcoming work harder — understanding, extending, or debugging the code?
2. **Is it frequently changing?** Code that changes often benefits most from clarity. Stable, rarely-touched code can tolerate more mess.
3. **Is it causing bugs?** Mutable state, unclear conditionals, and duplicated logic are common bug factories.
4. **Is it blocking testability?** If you cannot write a test for a module because of tangled dependencies, that is a high-priority target.

Rank findings into tiers:

- **High** — Actively causing pain or blocking work. Fix in this pass.
- **Medium** — Would improve the codebase but is not urgent. Include in the plan as optional.
- **Low** — Minor style or clarity issue. Note it but do not propose a refactoring action.

---

## Step 1.4 — Propose Refactorings

For every High and Medium finding, propose a concrete fix:

- **Classical smells** — select a refactoring from the catalog (see [Refactoring Catalog](#refactoring-catalog--quick-reference) below) and describe the mechanical steps.
- **Code-standards violations** — reference the specific standard (file path and rule) and describe what the code should look like to conform. The fix may be a catalog refactoring (e.g. *Rename* to match naming conventions) or a targeted alignment that doesn't map to a named refactoring (e.g. switching from a `type` to an `interface` per `typescript-and-zod.md`).

---

## Step 1.5 — Write the Exec-Plan

Create a directory at `harness/exec-plans/NNN-<gr-key>-refactor-<scope-slug>/` (where `<gr-key>` matches the `gr_xxx` ticket file in `jira-tickets/todo/`, e.g. `001-gr_001-refactor-library-service`) following the standard naming convention in `harness/exec-plans/README.md`. Write the plan at `plan.md` inside that directory. Use the following template:

```markdown
# Refactoring Plan: <Scope Description>

Date: <YYYY-MM-DD>
Status: PENDING APPROVAL

## Scope

<What was audited and why.>

## Summary

<2–3 sentence overview of the health of the audited code and the overall thrust of the proposed changes.>

## Test Coverage

<Current state of test coverage for the scoped code. Note any gaps that need characterisation tests before refactoring can begin.>

## Proposed Refactorings

### R1 — <Short title>

- **Priority:** High | Medium
- **Smell / Violation:** <Smell name from the catalog, or "Standards violation: <standard file>" for code-standards findings>
- **Location:** <File(s) and function(s) affected>
- **Description:** <What is wrong and why it matters — 2–3 sentences.>
- **Proposed refactoring:** <Refactoring name from the catalog, or description of the standards-alignment fix>
- **Plan:** <Concrete steps to apply the refactoring. What will be extracted, moved, renamed, etc.>
- **Risk:** <What could go wrong. Side effects, missing tests, performance concerns.>

### R2 — <Short title>

...repeat for each proposed refactoring...

## Items Noted but Not Proposed

<List any Low-priority smells observed during the audit. One line each. These are documented for awareness but no action is proposed.>

## Execution Order

<Numbered list of the R-items above in the order they should be implemented. Earlier refactorings should not depend on later ones. Group related changes that should be committed together.>
```

---

## Step 1.6 — Present for Approval

Present the exec-plan to the human. Explicitly ask:

1. Are there any refactorings you want to **remove** from the plan?
2. Are there any you want to **add**?
3. Do you want to **change the priority** of any item?
4. Is the **execution order** correct?
5. Are there any areas where you want **characterisation tests** written before refactoring begins?

Do not proceed to Phase 2 until the human explicitly approves the plan. Update the plan's `Status` field to `APPROVED` once approval is given.

---

# Phase 2 — Implement

Execute the approved exec-plan. Follow the plan's execution order. Each R-item is implemented as a self-contained unit with its own commit.

---

## Prerequisites

Before starting implementation:

1. **Confirm tests pass.** Run the full test suite. Do not start if tests are red.
2. **Commit (or stash) the current state.** You need a clean rollback point.
3. **Write characterisation tests** for any gaps flagged in the plan. Commit these tests separately before starting refactoring work.

---

## Step 2.1 — Implement Each Refactoring

For each R-item in the approved execution order:

### The Rhythm

```
1. Read the R-item from the exec-plan
2. Select the refactoring from the catalog (or the referenced code standard for standards-violation items)
3. If the R-item touches an area covered by a code-standards file (see _index.md), read that file now — the refactored code must conform to it
4. Apply the smallest mechanical step
5. Run tests → green? Continue. Red? Revert the last step.
6. Repeat 4–5 until the refactoring is complete
7. Check for dead code left behind (unused imports, orphaned types)
8. Run the linter — fix anything introduced
9. Commit with type "refactor"
10. Update the exec-plan: mark the R-item as DONE
11. Move to the next R-item
```

**Never take a step so large that you cannot revert it instantly.** If tests go red and you cannot fix the failure within a minute, revert and take a smaller step.

### Commit Format

Commit after each logically complete refactoring. Use commit type `refactor`. The summary should name the smell that was addressed and the refactoring applied:

```
Summary: Extract calculateTotal to eliminate duplicated invoice logic

Type: refactor

Details
- Extracted shared total-calculation logic from printReport and emailReport into calculateTotal
- Removed duplicated tax computation
- Introduced InvoiceLine type to replace raw tuple parameters
```

---

## Step 2.2 — Final Verification

After all R-items are implemented:

1. **Run the full test suite.** Everything must pass.
2. **Run the linter.** No new warnings.
3. **Review naming.** Now that the structure is cleaner, do the names still make sense?
4. **Update the exec-plan status** to `COMPLETED`.

---

# Refactoring Catalog — Quick Reference

The refactorings below are grouped by the smells they address. Each entry names the refactoring, describes the mechanical steps, and gives a brief before/after example. These are referenced by name in exec-plan R-items.

---

## Extracting and Inlining

### Extract Function

**When:** A code fragment can be grouped together and named — the body of a loop, one branch of a conditional, or a block that does "one thing" within a longer function.

**Mechanics:**
1. Create a new function named after *what* it does (not *how*).
2. Copy the extracted code into the new function.
3. Identify variables that are scoped to the extracted code — pass them as parameters or let them be closures.
4. Replace the original code with a call to the new function.
5. Test.

```typescript
// Before
function printReport(invoice: Invoice) {
  console.log(`Invoice: ${invoice.id}`);
  let total = 0;
  for (const line of invoice.lines) {
    total += line.quantity * line.price;
    if (line.taxable) {
      total += line.quantity * line.price * 0.1;
    }
  }
  console.log(`Total: ${total}`);
}

// After
function printReport(invoice: Invoice) {
  console.log(`Invoice: ${invoice.id}`);
  const total = calculateTotal(invoice.lines);
  console.log(`Total: ${total}`);
}

function calculateTotal(lines: InvoiceLine[]): number {
  let total = 0;
  for (const line of lines) {
    total += line.quantity * line.price;
    if (line.taxable) {
      total += line.quantity * line.price * 0.1;
    }
  }
  return total;
}
```

### Inline Function

**When:** A function body is as clear as its name, or the function is a trivial wrapper that adds indirection without value.

**Mechanics:**
1. Verify the function is not polymorphic (not overridden in subclasses).
2. Replace every call site with the function body.
3. Remove the function.
4. Test.

### Extract Variable

**When:** An expression is complex and its intent is unclear.

**Mechanics:**
1. Declare a `const` with a descriptive name.
2. Assign the expression to it.
3. Replace the original expression with the variable.
4. Test.

```typescript
// Before
if (order.quantity * order.unitPrice > 1000 && order.customer.loyaltyTier !== "gold") { ... }

// After
const orderTotal = order.quantity * order.unitPrice;
const isLargeOrderFromNonGoldCustomer = orderTotal > 1000 && order.customer.loyaltyTier !== "gold";
if (isLargeOrderFromNonGoldCustomer) { ... }
```

### Inline Variable

**When:** A variable name says no more than the expression itself, or it gets in the way of further refactoring.

---

## Encapsulation

### Encapsulate Variable

**When:** Widely accessed data needs a controlled access point — especially before moving data between modules.

**Mechanics:**
1. Create a getter (and setter if needed) for the variable.
2. Replace all direct accesses with the getter/setter.
3. Restrict the visibility of the variable.
4. Test.

### Replace Primitive with Object

**When:** A primitive carries domain meaning beyond its raw type.

```typescript
// Before
function notify(email: string) { ... }

// After
class EmailAddress {
  constructor(private readonly value: string) {
    if (!value.includes("@")) throw new Error("Invalid email");
  }
  toString() { return this.value; }
}

function notify(email: EmailAddress) { ... }
```

### Introduce Parameter Object

**When:** Several parameters always travel together.

```typescript
// Before
function findEvents(startDate: Date, endDate: Date, region: string) { ... }

// After
interface DateRange { start: Date; end: Date; }
function findEvents(range: DateRange, region: string) { ... }
```

### Extract Class

**When:** A class does two distinct things or has subsets of fields that always appear together.

**Mechanics:**
1. Decide what responsibility to extract.
2. Create a new class for that responsibility.
3. Move the relevant fields and methods to the new class.
4. Create an instance of the new class inside the old one and delegate.
5. Update the public interface — expose the new class or forward calls.
6. Test.

---

## Moving Features

### Move Function

**When:** A function references more elements from another module than from its own (feature envy).

**Mechanics:**
1. Examine everything the function references.
2. Determine the best target module.
3. Move the function to the target.
4. Update all call sites.
5. Test.

### Replace Loop with Pipeline

**When:** A loop body processes a collection through multiple conceptual stages (filtering, mapping, accumulating).

```typescript
// Before
const results: string[] = [];
for (const person of people) {
  if (person.age >= 18) {
    results.push(person.name.toUpperCase());
  }
}

// After
const results = people
  .filter((p) => p.age >= 18)
  .map((p) => p.name.toUpperCase());
```

### Split Loop

**When:** A single loop does two unrelated things (e.g. computes a sum *and* finds a maximum). Splitting loops rarely hurts performance and makes each loop easier to extract into its own function.

---

## Simplifying Conditionals

### Decompose Conditional

**When:** A complex conditional (`if`/`else if`/`else`) has non-trivial tests or bodies.

**Mechanics:**
1. Extract the condition into a function with a descriptive name.
2. Extract the then-body and else-body into their own functions.
3. Test.

```typescript
// Before
if (date >= plan.summerStart && date <= plan.summerEnd) {
  charge = quantity * plan.summerRate;
} else {
  charge = quantity * plan.regularRate + plan.regularServiceCharge;
}

// After
if (isSummer(date, plan)) {
  charge = summerCharge(quantity, plan);
} else {
  charge = regularCharge(quantity, plan);
}
```

### Replace Nested Conditionals with Guard Clauses

**When:** A function has a deeply nested `if`/`else` tree with an expected "normal" path.

```typescript
// Before
function payAmount(employee: Employee): number {
  let result: number;
  if (employee.isSeparated) {
    result = 0;
  } else {
    if (employee.isRetired) {
      result = retiredAmount();
    } else {
      result = normalPayAmount(employee);
    }
  }
  return result;
}

// After
function payAmount(employee: Employee): number {
  if (employee.isSeparated) return 0;
  if (employee.isRetired) return retiredAmount();
  return normalPayAmount(employee);
}
```

### Replace Conditional with Polymorphism

**When:** A switch/case or chain of `if`/`else if` selects different behaviour based on a type code, and this switch appears in multiple places.

**Mechanics:**
1. Create a base class/interface with the varying method.
2. Create a subclass/implementation for each case.
3. Replace the conditional with a polymorphic call.
4. Test.

### Introduce Special Case (Null Object)

**When:** Multiple sites check for a special-case value (often `null` or `undefined`) and apply the same default logic.

**Mechanics:**
1. Create a special-case object that encapsulates the default behaviour.
2. Replace the `null`/`undefined` checks with the special-case object.
3. Test.

---

## Simplifying API Boundaries

### Separate Query from Modifier

**When:** A function both returns a value and produces a side effect. Callers cannot get the value without triggering the side effect, or vice versa.

**Mechanics:**
1. Create a pure query function that returns the value.
2. Change the original function to return `void`.
3. Update call sites to use the query where they need the value.
4. Test.

### Remove Flag Argument

**When:** A boolean parameter makes a function behave in two fundamentally different ways.

**Mechanics:**
1. Create two separate functions, one for each behaviour.
2. Replace each call site with the appropriate function.
3. Remove the original function.
4. Test.

```typescript
// Before
function setDimension(name: string, value: number, metric: boolean) { ... }

// After
function setMetricDimension(name: string, value: number) { ... }
function setImperialDimension(name: string, value: number) { ... }
```

### Preserve Whole Object

**When:** You extract several values from an object and pass them individually to a function. Passing the whole object reduces parameter count and makes the function resilient to new fields.

---

## Dealing with Inheritance and Delegation

### Replace Subclass with Delegate

**When:** Inheritance is being used for code reuse rather than true polymorphism, or when a class needs to vary along more than one axis.

**Mechanics:**
1. Create a delegate class for the varying behaviour.
2. Add a field on the host class referencing the delegate.
3. Move the subclass-specific methods to the delegate.
4. Remove the subclass.
5. Test.

### Collapse Hierarchy

**When:** A superclass and subclass are no longer sufficiently different to justify the separation.

**Mechanics:**
1. Choose which class to keep.
2. Pull all members into that class.
3. Remove the empty class and update references.
4. Test.

---

# Decision Heuristics

Use these heuristics when you are unsure whether to propose a refactoring or how far to go:

| Situation | Guidance |
|-----------|----------|
| **"Should I refactor this now or later?"** | If you are about to modify the code for a feature or fix, refactor first to make the change easier. If you are not about to change it, leave it. Refactoring is not a separate phase — it is preparation for change. |
| **"How do I know when to stop?"** | When the code clearly expresses its intent and the change you came to make is easy to implement. You are not aiming for perfection — you are aiming for "good enough to work with." |
| **"Is this refactoring too risky?"** | If you don't have tests, write tests first. If the refactoring touches a critical hot path, take smaller steps and commit more frequently. If you're unsure about the target design, try it in a branch. |
| **"Won't this hurt performance?"** | Almost never measurably. Refactoring toward clarity makes performance problems *visible* — and visible problems are easy to optimise. Never sacrifice clarity for speculative performance. Profile first, optimise second. |
| **"There are too many smells — where do I start?"** | Start with the code you are about to change. Apply the campsite rule: leave it better than you found it. Don't attempt a whole-codebase cleanup in one pass. |
| **"I found a missing behaviour during refactoring."** | Stop refactoring. Switch to feature work: write a failing test, implement the behaviour, get to green. Then switch back to refactoring. Two hats, never both at once. |

---

# Anti-Patterns

| Anti-pattern | Why it hurts | What to do instead |
|---|---|---|
| Big-bang refactoring | High risk of introducing bugs; hard to revert; demoralising when it breaks | Work in small, tested steps. Commit after each one. |
| Refactoring without tests | No safety net to catch behaviour changes | Write characterisation tests first, then refactor |
| Mixing refactoring with feature work | You cannot tell if a test failure is from the refactoring or the new feature | Wear one hat at a time. Commit the refactoring before starting the feature. |
| Refactoring for its own sake | Wastes time on code nobody will touch again | Only refactor code that is in the way of current work or demonstrably causing problems |
| Speculative design during refactoring | Introduces abstractions for future needs that may never materialise | Refactor toward the *current* requirement. Three strikes (Rule of Three), then abstract. |
| Renaming things to "better" names without a clear reason | Churn in version control, confusing diffs, no real improvement | Rename only when the current name actively misleads or when the concept it represents has genuinely changed |
| Skipping the plan and jumping to implementation | Risk of doing unnecessary work, misaligned priorities, or changes the human would reject | Always complete Phase 1 and get approval before writing code |

---

# Reference

- Martin Fowler — *Refactoring: Improving the Design of Existing Code* (2nd edition, 2018)
- Martin Fowler & Kent Beck — "Bad Smells in Code" (Chapter 3 of the above)
- Kent Beck — *Test Driven Development: By Example* (2002) — companion for the testing prerequisite
