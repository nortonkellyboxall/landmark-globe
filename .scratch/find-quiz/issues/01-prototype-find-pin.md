# 01 — Prototype: find-the-pin round

Status: resolved  
Type: prototype

## Problem

Kids explore freely but don’t get a guided “can you find X?” loop that teaches globe hunting without reading.

## Done when

- [x] `quiz.js` can start/cancel a round from a Place pool
- [x] UI: prompt emoji+photo + exit / again / hear
- [x] Globe keeps **full** pin set; correct tap opens card / ends hunt
- [x] Leaving Space or switching adventure cancels the round
- [x] `tests/quiz.check.js` covers full-pool pins + tap handling

## Answer

Shipped in `quiz.js` + boot/topbar/prompt. Options are never reduced — `pinSetForRound` returns the whole geo pool.
