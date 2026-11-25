# Final content-closure audit (after PR #417)

This document records the remaining work after merge commit `e69afaf10fa6a8f2dfadf83dc8ffa57e5f40fa11`.
It is deliberately conservative: structural tests are not treated as proof of mathematical correctness.

## Confirmed current state

- The solved-problem library contains 600 records.
- The current exact-text comparison identifies 80 library examples matching guided question-bank prompts and leaves 520 visible by default.
- The 23 November report recorded 100 shared questions; the 24 November report recorded 95 literal matches. Those figures have not yet been reconciled against a single frozen dataset and a documented matching rule; the current CI run on the frozen main snapshot reports 80 matches, so 80/520 is the only currently verified UI count. Do not silently replace one count with another or delete records to force agreement.
- The 61-question difficulty review is recorded in PR #417: 7 moved to Basic, 34 to Intermediate, and 20 retained as Advanced.
- The 25 final-step examples named in the 24 November report must be reconciled by stable ID against the current library. Several old IDs are absent now; the records that still exist must be checked on their current content, not assumed to retain the old defect.
- The nine library diagram/table examples from the report must be rechecked against their current question text and presentation. A question rewritten to contain all needed data is acceptable without a redundant diagram.
- The lesson-coverage audit currently has 63 lessons and 320 curriculum labels, but **zero verified labels**. Automated confidence suggestions are not verified curriculum mapping.

## Work required before declaring closure

1. Freeze the exact current question-bank and library snapshots and produce three separate duplicate sets:
   - normalized exact matches;
   - near-text matches requiring manual review;
   - semantic overlaps that are not duplicates because the requested task or given data differs.
2. Reconcile the 83 / 95 / 100 historical counts by listing every example ID and question ID in each set. Preserve all examples until an explicit disposition is justified.
3. Review all 600 library examples for mathematical validity, self-contained wording, final-result visibility, correct source metadata, and genuine distinction from other examples. Record a per-ID disposition; a field-presence test is not a mathematical review.
4. Review all 609 bank solutions mathematically in batches of 100. Confirm derivations, domain restrictions, endpoint cases, signs, units, and the selected answer against the actual prompt.
5. Verify each of the 63 textbook lesson mappings against the Syrian textbook contents and lesson material. Do not promote provisional suggestions to verified mappings without evidence.
6. Reconcile the nine diagram/table examples and the 25 historical final-step IDs with current records. Explicitly mark removed or renamed IDs and their replacements, if any.
7. Review source coverage: the README currently says later-year ministry models still need extraction and review. Do not label the library curriculum-complete until those models and the remaining textbook ideas are checked.
8. Run all data, math-rendering, diagram, reference-integrity, browser, mobile, accessibility, and performance tests. Check GitHub Pages against the exact tested merge candidate.

## Closure rules

- No mass deletion based only on text similarity.
- No automatic lesson assignment presented as verified.
- No claim that 609 solutions are mathematically audited merely because all 609 have structured steps.
- No merge until the per-ID audit and required CI/browser checks are complete.

## Batch 1 — bank questions 1–100 (main snapshot, 25 November 2026)

- Scope: the first 100 records in the original `questions.js` collection (the merged bank starts with these 454 original records before supplements are appended).
- Review method: each prompt, option list, zero-based answer index, and written solution was checked together; arithmetic and algebra were independently recomputed for the inspected items.
- Confirmed defect: question ID `q-1is84v0` (dot product of `(1,2,3)` and `(2,0,-1)`) correctly computes `-1` and has answer index 3 (the fourth option), but its explanation incorrectly said “الخيار الأول”.
- Correction committed on this PR branch: the explanation now identifies “الخيار الرابع” and explicitly states its value `-1`.
- No other answer-index/option-reference contradiction was identified in this 100-record batch during this pass. This is a bounded batch result, not a claim that the remaining 509 bank questions or the library have been audited.
- Re-run the bank and browser workflows on the correction commit before treating the change as validated.
