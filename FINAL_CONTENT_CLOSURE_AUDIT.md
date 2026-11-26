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

## Batch 2 — bank questions 101–200 (main snapshot, 25 November 2026)

- Scope: original-bank records 101–200 in `questions.js`.
- Reviewed the 100 prompts, options, answer indices, and written derivations, including vector geometry, scalar products, planes, sequences, derivatives, logarithms, exponentials, integrals, complex numbers, combinatorics, and probability.
- No definite numerical/algebraic answer-key mismatch was established in this batch during this pass.
- Open content-verification item: `q-1cp7mbm` is explicitly dependent on the supplied graph image `assets/question-11-graphs.png`; the text-only record does not independently establish that option “الرسم C” is the correct derivative graph. Keep this item open until the asset is inspected against the derivative sign/monotonicity of the displayed function.
- Open curriculum-classification item: `q-zcqhy6` is a complex-number/trigonometric-form simplification currently filed under “التحليل التوافقي”. The calculation is consistent with \(e^{5ix}\), but the topic label should be checked against the Syrian textbook unit before changing it.
- Batch status: mathematical text/answer pass completed; image-grounded answer and curriculum label remain pending evidence. Do not count those two checks as closed.

### Batch 1 — additional internal-duplication review

- Candidate pair: original-bank records 25 and 53 both ask for \\(\\lim_{x\\to2}\\frac{x^2-4}{x-2}\\) and both resolve to 4. Their wording differs, but the mathematical task and data are equivalent; classify as a likely duplicate, not merely a shared-topic similarity.
- Candidate pair: original-bank records 22 and 90 both ask for the number of arrangements of three distinct elements taken all together and both resolve to \\(3!=6\\). The second changes “elements” to “letters” without changing the task; classify as a likely duplicate.
- These pairs are recorded for a later editorial disposition. Neither record was deleted or hidden in this pass. A final decision should consider whether one item has a distinct intended pedagogical role or source provenance.
- Contrast: records 1 and 54 use the same removable-discontinuity expression but ask different questions (limit versus the value needed for continuity), so they are not duplicates.

## Batch 2 — original-bank questions 101–200

- Re-derived representative multi-step items from this range, including vector relations (101–103), dot products and angles (104–113), plane equations and incidence (114–123), sequence limits and sums (166–170), coordinate changes (173), derivative-at-zero (174), tangent constraints (175), and complex arguments (200). Their displayed results and answer indices agree with the recomputation in this pass.
- No new definite numerical or answer-index error was confirmed in the inspected items 101–200.
- Graphic-dependent question 176 still needs a separate visual check of the actual rendered graph and its derivative correspondence; its text solution alone cites the source's designation of graph C and is not sufficient evidence for mathematical closure.
- Additional likely duplicate pairs requiring editorial disposition (no deletions made): 59/130 (same sequence-limit expression \\(\\frac{4n+3}{2n-1}\\)); 65/137 (same \\(\\ln(e^{-2})\\) evaluation); 69/140 (same equation \\(e^{2x}=e^6\\)); 48/160 (same count \\(4!\\)); 89/161 (same selection count \\(C_6^2\\)); 83/156 (same expansion \\((1+i)^2\\)). Question 125 also repeats the same limit task as 25/53. These are exact or near-exact task repeats, not merely shared-topic items.
- Question 168's proposed sequence \\(y_n=1/(1-n)\\) is increasing to 0 while \\(x_n=\\ln(1+e^{-n})\\) is decreasing to 0; their difference tends to zero. It is consistent with the standard neighboring-sequences criterion based on opposite monotonicity and a vanishing difference.
- This batch review is bounded to the original-bank records 101–200. It does not close the visual audit or the rest of the 609-question bank.

## Batch 3 — original-bank questions 201–300

- Recomputed representative counting/probability, sequence, vector/plane, complex-number, limit, and derivative items in this range. Confirmed the displayed numerical results for the inspected multi-step items, including 201–216, 218–241, 259–265, and 267–300.
- **Confirmed answer-explanation mismatch:** question ID `q-158u3ih` (record 266) derived the correct expression for \\(u_{n+1}-u_n\\), and the answer index selected the third option, but the final sentence incorrectly named “الخيار الثاني”. Corrected the explanation on this PR branch to state the equivalent expression and identify “الخيار الثالث”.
- This defect was a mismatch between the written explanation and the selected answer index; the mathematical expression and selected option were already correct.
- No other definite calculation or answer-index defect was confirmed in the inspected records in this batch. This does not certify the source-dependent or diagram-dependent questions without their actual visual assets and rendered presentation.
- The update is awaiting its post-change validation workflows. No question was removed in this batch.

## Batch 4 — original-bank questions 301–400

- Recomputed a broad sample of the calculus, integration, analytic geometry, complex-number, combinatorics, and probability items in this range, including questions 301–321, 323–340, and 353–400. The recomputed results and answer indices agreed in the inspected items.
- No new definite mathematical calculation error was confirmed in the inspected items 301–400.
- Further likely repeated tasks requiring editorial disposition (not deleted): 328/398 (committee of one engineer and two workers from 3 engineers and 5 workers); 329/399 (assign three distinct offices among 8 people); 330/400 (choose 5 questions from 8 without order). These are functionally the same tasks with changed wording/order of choices.
- Diagram-dependent items in this range still require rendered-asset verification; text-only checking cannot establish that their referenced diagram is present, legible, and consistent with the solution.
- The answer-explanation correction for question 266 was committed separately; validation was restarted after the previous run was cancelled by subsequent branch updates. No merge is authorized until the restarted validation and browser workflows finish successfully.

## Batch 2 — bank questions 101–200 (main snapshot, 25 November 2026)

- Scope: original `questions.js` records 101–200.
- Independently rechecked vector operations, dot products, plane equations and incidence, complex-number operations, combinatorics, probability, sequence limits and sums, derivatives, logarithms/exponentials, and definite integrals. The displayed answer indices and written derivations were cross-checked against the options for the reviewed records.
- No definite algebraic or answer-key defect was confirmed in the text-verifiable items in this batch.
- **Pending visual verification:** question 176 depends on `assets/question-11-graphs.png` and asks which candidate graph is the derivative. Its answer cannot be certified from the text alone; the actual image and curve/derivative sign relationship must be inspected before this record is marked closed.
- The audit is not complete for this batch until question 176's image is inspected. No conclusion is made here about bank questions 201–609 or the 600 solved examples.

## Batch 3 — bank questions 201–300 (main snapshot, 25 November 2026)

- Scope: original questions.js records 201–300.
- Independently recomputed the reviewed combinatorics and probability counts, vector/plane/geometry calculations, complex-number transformations, sequence recurrences and sums, limits, derivatives, and logarithmic/exponential results.
- Confirmed and corrected one mathematical condition omission: question q-1fl5f0a allowed the degenerate case a=0, in which all listed geometric and arithmetic terms can be zero and the ratio q is not determined. The prompt now explicitly states a≠0; the updated text produces stable ID q-9g9uyf.
- Question 266 has a real option-reference mismatch on main: answer index 2 selects the third option, while the main-branch explanation says second. The PR branch already corrects the explanation to say third; retain this correction and verify it after merge.
- No additional definite error was confirmed in the text-verifiable items during this pass. The review of question 176's graph image remains pending from batch 2.
- This is a bounded review of records 201–300, not closure of the remaining bank or solved-example library.

## Batch 4 — bank questions 301–400 (main snapshot, 25 November 2026)

- Scope: original questions.js records 301–400.
- Recomputed the reviewed derivative/variation, integration and area, analytic geometry, complex-number, combinatorics, and probability results. The explicit ordinal references to answer options in this batch did not show a mismatch with the stored answer indices.
- No definite mathematical or answer-key defect was confirmed in the text-verifiable records in this batch.
- A validation run after adding the nonzero condition to question 267 exposed a synchronization issue: the matching detailed guide still contained the old prompt text, leaving one question without attached steps. The guide prompt was updated to match the corrected question. This is a guide-attachment correction, not a mathematical reversal of the derivation.
- The run that exposed the mismatch failed at detailed-solution-guide coverage (608/609); the corrected branch now contains the matching prompt in both questions.js and solution-guides.js. A fresh validation run is still required to confirm closure.
- Question 176's image-based derivative selection from batch 2 remains pending visual verification.


## Batch 5 — original-bank questions 401–454 (main snapshot, 26 November 2026)

- Scope: the remaining 54 records in the original 454-question bank, covering combinatorics, probability, complex numbers and their geometric applications, vectors, sequences, differentiation, logarithms, exponentials, and definite integration.
- Checked every prompt, stored zero-based answer index, option ordering, and written solution in this range. Recomputed the combinatorial counts, binomial probabilities and moments, conditional probability/independence calculations, binomial coefficients and powers, complex roots and transformations, vector products and distances, tangent/derivative results, exponential equation, recurrence/sequence sum, and definite integral.
- No definite numerical, algebraic, or answer-index mismatch was found in these 54 records during this pass.
- **Likely duplicate requiring editorial disposition:** records 419 and 442 ask for the solution set of the same equation (z(z^2+4z+29)=0), with the same result (z=0) or (z=-2\pm5i). Their wording and option order differ, but the mathematical task and data are equivalent. Neither record was deleted or hidden. Record 420 asks only for the roots of the quadratic factor, so it is a narrower subtask and is not automatically classified as a duplicate of 419/442.
- Similar probability records 405–408 and 412–416 use related binomial distributions but ask for different probabilities or moments; they are not duplicates solely because they share a model.
- This is a completed text-and-answer audit of original-bank records 401–454 only. It does not close questions 455–609, visual assets, the 600-example library, curriculum mappings, or source coverage.


## Batch 6 — original-bank questions 480–529 and assumption corrections (26 November 2026)

- Scope: 50 consecutive supplementary questions, covering sequence differences and limits, distances and tangent spheres, trigonometric bounds, logarithmic-function analysis, variation-table reasoning, scalar products, geometric sequences, probability distributions, and complex numbers.
- Recomputed the answer and worked solution for all 50 records. The numerical/algebraic answer indices agree with their corresponding options in this batch.
- **Question 498:** the original wording inferred roots from monotonic variation ranges but did not explicitly state continuity. Added the explicit assumption that (f) is continuous, which makes the intermediate-value argument valid and supports the claimed count of two roots.
- **Question 520:** the original wording supplied only a direction vector for line (d), then concluded that it is perpendicular to line (AB). Orthogonal direction vectors alone do not establish that two lines intersect in 3D. Added that (d) passes through (A); since (AB) also passes through (A), the perpendicularity conclusion is now justified.
- **Question 525:** checked the distribution by unordered pairs from the multiset ({0,0,1,1,2}); the probabilities are (1/10,2/5,3/10,1/5), agreeing with the stored answer.
- These are wording/assumption corrections, not changes to the intended answer keys. No questions were deleted or hidden.
- This pass covers only records 480–529. The remaining supplementary records 530–594, the 600-example library, full lesson mapping, image/table assets, and source verification remain open.


## Batch 7 — supplementary questions 530–579 and curriculum-label corrections (26 November 2026)

- Scope: 50 questions spanning planes and spheres, exponential functions, combinatorics, conditional probability and Bayes' theorem, sequences, complex numbers, integration, logarithmic differentiation, and variation.
- Recomputed each answer and solution in the batch. The stored answer indices match the displayed options for the checked items.
- **Curriculum mapping correction:** questions 561 and 562 concern the Cartesian equation of a plane and point-to-plane distance, respectively. Their topic was incorrectly labeled "الجداء السلمي في الفراغ"; both are now labeled "المستقيمات والمستويات في الفراغ". Question 563 remains under scalar product.
- Rechecked question 574: (f'(x)=(e^x(1-x)-1)/(1-x)le0) for (x<1), with equality only at (x=0); the function is still strictly decreasing despite the isolated zero derivative.
- Rechecked the probability distributions in questions 575–577 using combinations from the stated urn populations; the selected answers agree with the calculated probabilities.
- No further mathematical answer-key correction was needed in this 50-question batch.
- This pass covers only records 530–579. Remaining supplementary records 580–594, the 600-example library, complete textbook/lesson mapping, diagrams/tables, and source provenance verification remain open.
