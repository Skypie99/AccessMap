# Architecture Decision Records (ADRs)

This directory records significant architectural decisions made for AccessMap.

## What is an ADR?

An Architecture Decision Record captures a significant decision — the context,
the options considered, the choice made, and why. It is NOT a design doc; it is
a permanent record that answers "why does this code look the way it does?"

## When to write an ADR

Write one when:
- You're choosing between two or more non-obvious technical approaches.
- A decision will be hard to reverse (schema shape, third-party service, auth model).
- You're overriding a default pattern and future maintainers might wonder why.
- A security, privacy, or accessibility constraint drives a counterintuitive choice.

## Format

```
docs/adr/NNN-short-title.md
```

Use the template below. Fill every section — especially **Consequences** (what
gets harder, what gets easier) and **Status**.

```markdown
# ADR NNN — Short title

**Date:** YYYY-MM-DD  
**Status:** Proposed | Accepted | Deprecated | Superseded by [ADR NNN]  
**Deciders:** [names or roles]

## Context

What situation prompted this decision?

## Options Considered

1. **Option A** — one-line summary
2. **Option B** — one-line summary

## Decision

Which option was chosen and why.

## Consequences

- **Positive:** ...
- **Negative / trade-offs:** ...
- **Neutral:** ...
```

## Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](001-heatmap-gradient-vs-density.md) | Heatmap: gradient display vs. density dots | Accepted | 2026-05-29 |
