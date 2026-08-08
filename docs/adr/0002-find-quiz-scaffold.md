# ADR 0002 — Find-quiz scaffold

## Decision

Add a **Find quiz** as an optional guided loop (“tap the pin that matches this picture/emoji”), implemented later behind `quiz.js`. Design lives in `.scratch/find-quiz/`. Do not wire UI until the prototype ticket is claimed.

## Why

Free explore is fun; kids still need a low-reading way to practice *finding* places on the globe.

## Consequences

- Reuses existing Place packs / continent joins for pools.
- Globe + CardMedia stay free of quiz rules; boot will call a small quiz API when built.
