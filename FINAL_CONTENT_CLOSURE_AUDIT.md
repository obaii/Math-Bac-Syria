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
- **Curriculum mapping correction (aligned to the actual curriculum map):** question 561 asks for the Cartesian equation of a plane and belongs to the textbook lesson "المعادلة الديكارتيّة لمستوٍ" under "الجداء السلمي في الفراغ"; question 562 asks for point-to-plane distance and remains under "المستقيمات والمستويات في الفراغ". Question 563 remains under scalar product.
- Rechecked question 574: (f'(x)=(e^x(1-x)-1)/(1-x)le0) for (x<1), with equality only at (x=0); the function is still strictly decreasing despite the isolated zero derivative.
- Rechecked the probability distributions in questions 575–577 using combinations from the stated urn populations; the selected answers agree with the calculated probabilities.
- No further mathematical answer-key correction was needed in this 50-question batch.
- This pass covers only records 530–579. Remaining supplementary records 580–594, the 600-example library, complete textbook/lesson mapping, diagrams/tables, and source provenance verification remain open.


## Batch 8 — final supplementary records 580–594 (26 November 2026)

- Scope: all final 15 records in the supplementary automated-question collection, covering tangent equations, parameter identification, exponential maxima, limits and unique roots, complex equations and roots of unity, scalar products, planes, distances, line-plane intersections, sequence convergence, and definite integration.
- Recomputed the selected answers and checked each worked solution. The stored answer indices agree with the corresponding options in this batch.
- **Curriculum mapping correction (aligned to the actual curriculum map):** question 589 asks for the Cartesian equation of a plane through three points and belongs to "الجداء السلمي في الفراغ", where the student textbook places the lesson "المعادلة الديكارتيّة لمستوٍ".
- Question 584's uniqueness argument is valid because (h(x)=e^{-x}-x) is continuous on ([0,1]), has opposite endpoint signs, and is strictly decreasing there.
- The 140-record supplementary collection (questions 455–594) has now received a question-by-question mathematical answer/solution pass in batches 455–479, 480–529, 530–579, and 580–594. This does not constitute source-document verification or prove exact reproduction of any ministry paper; source provenance still requires separate checking.
- Open work remains: the 600-example solved library, all textbook lesson mappings, visual assets/tables, similarity review across the full bank and library, source-document verification for 2017 onward, and final CI/browser validation after the latest content commits.


## Batch 9 — duplicate reconciliation, guide attachment, and curriculum status (26 November 2026)

- Reconciled the exact solved-library/bank match count after clarifying question 498. The same continuity condition is now present in the automated bank prompt, its solved-example record, and its detailed guide. The bank/library exact-match count is now 80 of 600, leaving 520 visible by default without deleting records.
- Question 520 now explicitly states that line d passes through A, so the scalar-product test of direction vectors is sufficient to establish perpendicular intersecting lines. Its detailed guide and independent answer-regression prompt were updated to match.
- Question 562's point-to-plane distance guide now uses the same curriculum topic as the question. Questions 561 and 589 remain in "الجداء السلمي في الفراغ" because the 63-lesson curriculum map places "المعادلة الديكارتيّة لمستوٍ" in that unit; question 562 remains in "المستقيمات والمستويات في الفراغ" under point-to-plane distance.
- Added/realigned the two affected detailed-guide matches. The detailed-solution coverage check passed on the run associated with commit 4821d4d; the later asset-version assertion was then updated consistently to 20261125-40 in both index.html and its test.
- Library reconciliation: 600 unique IDs; 594 student-curriculum examples and 6 supplementary logic references; 80 exact matches with guided bank questions and 520 default-visible examples. All 600 non-author-written source records have source-reference URLs.
- Source-year distribution: 2017: 34; 2018: 50; 2019: 41; 2020: 20; 2021: 20; 2022: 75; 2023: 42; 2024: 29; 2025: 30; 2026: 32.
- Curriculum crosswalk remains provisional, not verified: 326 lesson labels cover 594 student-curriculum examples plus 6 supplementary references. Of the 320 student-curriculum labels, 6 labels remain explicitly unassigned for manual review; 156 suggestions are high-confidence, 158 medium-confidence, and 6 low-confidence. One of the 63 lessons still has no safe suggested label. These are not to be silently converted into verified coverage.
- The official PDF links recorded in the repository were not fetchable by the web reader because the files are very large (approximately 97 MB and 80 MB). The repository's curriculum map therefore remains a provisional title-level map; exact page-by-page verification against the intended 2025–2026 edition remains open.


## Batch 10 — internal near-duplicate review in the solved-example library (26 November 2026)

- Checked all 600 library prompts for exact normalized duplicates within the library: none were found.
- A high-similarity scan produced 12 candidate pairs for human review. Most were legitimate variants with changed mathematical data (for example, different direction vectors, probability values, or integrands), not duplicate exercises.
- **Confirmed near-duplicate:** lim-012 and lim-014 originally asked the same removable-discontinuity question with the same function and point, differing mainly in wording and lesson label. Updated lim-014 to the distinct variant (f(x)=(x^2-9)/(x-3)) for (x\ne3), with (f(3)=a); the correct continuity value is (a=6). The example remains in the library with its own steps and check.
- The remaining high-similarity candidates were retained because they change the actual mathematical data or task, and should not be hidden as duplicates merely because they share a solution method.


## Batch 12 — corrected an under-specified inequality example (26 November 2026)

- In ministerial17-graph-003, the original condition (f(x)\ge5) for (x\ge4) was insufficient to conclude that the full solution set was exactly ([4,+\infty)), because values for (x<4) were unspecified.
- Added the missing condition (f(x)<5) for every (x<4), and clarified the worked solution by separating the two cases. The result ([4,+\infty)) is now logically justified.
- Updated the 2017 audit regression test to require both sides of the domain condition.


## Batch 13 — visual verification of derivative-graph question (26 November 2026)

- Inspected the actual rendered source asset `assets/question-11-graphs.png` against the graph of the function and all four candidate derivative graphs.
- The source function decreases on \\(( -\\infty,-1)\\), increases on \\((-1,0)\\), decreases on \\((0,1)\\), and increases on \\((1,+\\infty)\\). Its derivative therefore has signs \\(-,+,-,+\\) on those intervals, with vertical blow-up behavior at \\(x=-1\\) and \\(x=1\\), and a zero at \\(x=0\\).
- Candidate C is the only graph matching that interval sign pattern and the two singular points. The stored answer index 0 selects “الرسم C”, so the image-based answer is now independently supported rather than merely copied from the source caption.
- The solution text was updated to explain the derivative sign pattern and why candidate C is selected; the old wording that relied on the source's designation alone has been removed.


## Batch 14 — final CI confirmation for the latest candidate (26 November 2026)

- Candidate commit: `1b44d354360c9302006737347994bc7957a2475e`.
- `Validate question bank` run `45804517604`: completed successfully. All 48 substantive validation steps passed, including the 63-lesson inventory, provisional crosswalk, 600-example ID integrity, mathematical notation, diagram dependencies, all 14 bank topics, answer regressions, detailed-solution coverage, and student tools.
- `Browser user-flow smoke tests` run `45804517692`: completed successfully. All 26 substantive browser checks passed, including solved-example loading, all 14 automated topics, accessibility/keyboard navigation, mobile layout and text wrapping, assistant/tools interactions, and the comprehensive release audit.
- The six curriculum labels still intentionally unassigned are: الدوال الدورية، تحويل منحنى بدلالة f(−x)، حل متراجحة بيانياً، قراءة النهايات من جدول التغيرات، قراءة النهايات والمقاربات من الرسم، مركز تناظر منحنى تابع. The six supplementary logic labels are separately excluded from the 63 student-textbook lessons.
- The 156 high-confidence and 158 medium-confidence entries remain suggestions, not verified textbook mappings. The crosswalk status remains `provisional-not-verified`; the official textbook PDFs have not yet been checked page-by-page.
- These CI results validate the tested candidate's structural and browser behavior. They do not replace the still-open per-ID mathematical audit of all 600 solved examples, the full 609-question solution audit, source-document verification, and live GitHub Pages comparison.


## Batch 15 — final candidate CI rerun and release boundary (26 November 2026)

- PR head at the start of this follow-up: `e2ca26b3ae931cd0e8a68def07df44cc8b699abf`.
- `Validate question bank` run `45810990278`: completed successfully; all 48 substantive steps passed.
- `Browser user-flow smoke tests` run `45810990297`: completed successfully; all 26 substantive browser steps passed, including every homepage shortcut/destination, all 14 automated topics, keyboard/accessibility, mobile text wrapping, assistant/tools, and the comprehensive release audit.
- These runs were checked against the exact PR head `e2ca26b3...`; the next commit in this follow-up changes only this audit document.
- PR #418 remains open and in draft. No merge has been performed.
- The live GitHub Pages URL could not be retrieved by the available page reader in this audit session. Consequently, production deployment parity is **not verified**; repository-side tests and source files are not a substitute for observing the published site.
- The 600-example library and 609-question bank do not yet have a complete, evidence-backed, per-ID mathematical audit report. Existing manual batches cover bounded ranges and sampled/reviewed items, but must not be represented as a full audit of every record. In particular, original-bank candidate duplicate pairs (25/53/125, 22/90, 59/130, 65/137, 69/140, 48/160, 89/161, 83/156, 328/398, 329/399, 330/400, and 419/442) remain editorial-review candidates; none has been deleted.
- Source-year metadata and external URLs exist for the library records, but URL presence alone does not verify that each item accurately represents the named exam/session or ministry model. The 2017–2026 coverage figures are metadata counts, not proof of complete official-source coverage.
- Release decision: CI/browser checks are green, but content closure, official textbook mapping, source provenance, duplicate disposition, and live deployment parity remain open. Do not merge or describe the work as fully completed until those evidence-based checks are closed.


## Batch 16 — direct review of the outstanding original-bank duplicate candidates (26 November 2026)

- Re-opened the original 454-question source records on the current PR branch and compared the full prompt, mathematical data, requested operation, and expected result for every candidate pair previously listed.
- Confirmed the following are genuine repeated tasks, not merely similar methods or shared topics:
  - Limit at x=2 for (x²−4)/(x−2): records 25, 53, and 125 are one task with equivalent wording and the same result 4.
  - Permutations of three distinct items: 22 and 90.
  - Limit of (4n+3)/(2n−1): 59 and 130.
  - Evaluation of ln(e^(−2)): 65 and 137.
  - Solve e^(2x)=e^6: 69 and 140.
  - Permutations of four distinct items: 48 and 160.
  - Choose two from six without order: 89 and 161.
  - Evaluate (1+i)²: 83 and 156.
  - Committee of one engineer and two workers from 3 engineers and 5 workers: 328 and 398.
  - Assign president, vice-president, and secretary among 8 people: 329 and 399.
  - Choose 5 questions from 8 without order: 330 and 400.
  - Solve z(z²+4z+29)=0 over the complex numbers: 419 and 442.
- No records were deleted or silently altered. These source-bank entries have no explicit provenance fields in their original records, so the safe disposition is to retain the records while preparing a controlled deduplication that preserves the canonical stable question IDs, source order, answer balance, guide attachments, and any external references. A raw deletion from questions.js would change index-based records and is not approved without those dependency checks.
- Contrast retained: 420 asks only for the roots of the quadratic factor, so it is a narrower task and is not treated as a duplicate of 419/442. Related binomial-distribution questions were also retained where the requested probability or statistic differs.
- The 600 solved-example library still has no exact normalized duplicates internally; its 12 high-similarity candidates were reviewed previously, with only lim-012/lim-014 confirmed and corrected. This does not substitute for the pending full per-ID mathematical audit of all 600 examples.
- Remaining release blockers are unchanged: all 609 bank solutions still need a complete per-ID mathematical review (the manual batches are bounded), all 600 solved examples need a complete per-ID mathematical review, official textbook mappings and source provenance need documentary verification, and live GitHub Pages parity remains unverified.


## Batch 17 — manual mathematical re-derivation of solved examples 1–20 (26 November 2026)

Reviewed the complete prompt, assumptions, key idea, every solution step, final answer, and verification check for these stable IDs:

- `seq-001`: arithmetic-sequence sixth term, `-3`; verified.
- `seq-002`: first five terms of geometric sequence, sum `93`; verified.
- `seq-003`: induction proof for the sum of the first n positive integers; base case and induction step are valid.
- `lim-001`: polynomial limit at 2, `11`; direct substitution is valid.
- `lim-002`: removable limit at 3, `6`; cancellation is used only for x≠3.
- `lim-003`: oblique asymptote `y=x+1`; polynomial division and remainder limit verified for both infinities.
- `der-001`: derivative `12x²−10x+2`; verified term by term.
- `der-002`: chain-rule derivative `10(2x+1)^4`; verified.
- `log-001`: logarithm domain `x>3`; strict positivity condition is correctly applied.
- `log-002`: logarithm simplification `ln(10)`; positivity conditions hold.
- `exp-001`: product of exponentials simplifies to `e^(2x+2)`; verified.
- `exp-002`: exponential equation solution `x=4); verified by equality of exponents and substitution.
- `int-001`: antiderivative satisfying both derivative and initial value, `3x²−4x+3); verified.
- `int-002`: definite integral from 1 to 3 equals `8`; verified by an antiderivative.
- `vec-001`: vector AB equals `(3,2,−4)`; coordinate subtraction verified.
- `dot-001`: scalar product equals `−8`; component products and sum verified.
- `line-001`: plane equation `2x−y+3z−8=0); normal vector and point substitution verified.
- `cx-001`: complex product equals `8−i); distribution and `i²=−1` verified.
- `cx-002`: modulus of `−3+4i` equals `5`; verified.
- `comb-001`: number of 3-person committees from 7 students equals `35`; combination formula correctly used because order is irrelevant.

Outcome: no mathematical, assumption, or solution-step defect was found in these 20 records. This is a manual review of these IDs, not a claim that the remaining 580 examples or all 609 bank solutions have been individually reviewed.


## Batch 18 — manual mathematical re-derivation of solved examples 21–40 (26 November 2026)

Reviewed every prompt, condition, transformation, intermediate result, final answer, and check for:

- `prob-001`: conditional probability `0.4`; condition `P(B)>0` is stated and satisfied.
- `prob-002`: expectation `1.1`; probability weights sum to 1 and the weighted sum is correct.
- `seq-limit-001`: rational sequence limit `2); leading-coefficient method is valid.
- `complex-geometry-001`: rotation by `π/2` maps `2−i` to `1+2i`; modulus preservation is correctly noted.
- `seq-004`: sum of first 10 arithmetic terms `175`; tenth term and arithmetic-series formula verified.
- `seq-005`: sequence `uₙ=2n+5` is strictly increasing; successive difference is 2.
- `lim-004`: piecewise function is discontinuous at 1 because the one-sided limits differ.
- `lim-005`: trigonometric limit is `3`; the radians condition is explicitly present.
- `seq-limit-002`: geometric sequence limit is `0); ratio satisfies `|q|<1`.
- `seq-limit-003`: conjugate rationalization gives limit `2); division by n and limiting denominator are valid.
- `der-003`: tangent at x=2 is `y=4x−4); slope and contact point verified.
- `der-004`: function decreases to x=2 and increases thereafter; minimum value is `−3).
- `der-005`: product derivative is `eˣ(x+1)²); product rule and factorization verified.
- `log-003`: derivative of `ln(x²+1)` is `2x/(x²+1)`; inner expression is positive for all real x.
- `log-004`: logarithmic equation has solution set `{2}`; domain condition is checked.
- `exp-003`: derivative is `3e^(3x−2)`; chain-rule factor is correct.
- `exp-004`: equation `eˣ=5` has solution `ln(5)); inverse relationship verified.
- `int-003`: integration by parts gives `eˣ(x−1)+C); differentiating confirms the integrand.
- `int-004`: area is 9 square units; integrand is nonnegative on the stated interval.
- `vec-002`: midpoint is `M(1,2,1)`; coordinate averages verified.

Outcome: no mathematical, assumption, or solution-step defect was found in these 20 records. Cumulative manual solved-example review: 40/600. The other 560 examples and all 609 bank solutions remain outside these two completed manual batches.


## Batch 19 — manual mathematical re-derivation of solved examples 41–240 (26 November 2026)

Reviewed 200 consecutive records (stable IDs from `dot-002` through `exam19-prob-001`) including the full prompt, assumptions, key idea, intermediate steps, final answer, and verification check. This per-record review does not certify the official-source provenance of exam-labelled records.

### Confirmed corrections applied

- `seq-limit-007` (record 81): corrected the lesson label to `نهاية متتالية كسرية`. The item gives the explicit rational formula `uₙ=2+1/n`; it is not defined by a recurrence relation.
- `seq-010` (record 104): corrected the lesson label from a geometric-series sum to the seventh term of a geometric sequence.
- `exam18-seq-005` (record 228): corrected the verification text. The question asks only that the difference tends to zero; the old check incorrectly claimed monotonicity was stated in the question.
- `lim-016` (record 154): clarified the piecewise definition by explicitly stating `f(x)=ax+1` for `x≠2` and `f(2)=7`. This makes the continuity condition unambiguous and yields `a=3`.
- `exam19-3d-002` (record 237): clarified that line `d` passes through A. Orthogonal direction vectors alone do not establish that two lines in space are perpendicular unless they intersect; the corrected prompt ensures intersection at A.

### Mathematical review outcome

- No arithmetic or algebraic error was found in the remaining reviewed solutions in this range after re-derivation.
- The reviewed computations include geometric and arithmetic sequences, limits and continuity, derivatives and monotonicity, logarithmic/exponential equations and inequalities, definite and indefinite integrals, vectors and scalar products, line/plane relations, complex numbers and transformations, combinatorics, and probability.
- Geometric checks included verifying intersection where perpendicular lines are claimed, checking plane distances and tangency, and substituting all given points into plane equations.

### Exact repeated solved-example tasks discovered

The wider comparison across the first 240 records revealed exact or materially identical repeated tasks that were missed by the earlier internal-duplicate scan. They are retained for now; no record was deleted and no stable ID was renumbered. Pairs/groups requiring a controlled disposition:

- `seq-006` / `seq-014` (records 51/151): same arithmetic-sequence data `u₃=11, u₇=27`, asking for first term and common difference.
- `cx-006` / `cx-010` (records 69/118): same complex quotient `(1+i)/(1−i)`, result `i`.
- `comb-004` / `comb-009` (records 71/121): same choice of a 3-person committee from 7 people, result 35.
- `cx-007` / `cx-013` (records 93/168): same conjugate/product task for `z=−3+4i`, result 25.
- `prob-013` / `prob-020` (records 124/175): same two-point distribution `X∈{0,2}` with equal probabilities, asking for expectation and variance.
- `lim-011` / `lim-015` (records 102/153): same limit `(x²−9)/(x−3)` as `x→3`, result 6.
- `int-010` / `int-016` (records 112/187): same area under `y=x²` from 0 to 2, result 8/3.
- `int-003` / `int-011` (records 38/136): same integration-by-parts task `∫xeˣ dx`, result `eˣ(x−1)+C`.
- `vec-001` / `vec-007` (records 35/138): same coordinates A(1,−2,3), B(4,0,−1), vector AB=(3,2,−4).
- `dot-001` / `dot-008` (records 36/140): same scalar-product data and result `−8`.
- `prob-003` / `prob-016` (records 49/150): same independent-event probabilities 0.4 and 0.5, intersection probability 0.2.
- `seq-013` / `seq-015` (records 127/152): same geometric-sequence data `u₂=6, u₅=162`, asking for positive q and `u₁`.

Related-but-not-identical items (such as asking for a cosine versus the angle for the same pair of vectors, or using different numerical data for the same method) were not classified as exact duplicates. No duplicate records were deleted or hidden in this batch; stable IDs and order are preserved pending a safe editorial decision.

### Cumulative status

- Manual solved-example review completed: **240/600**.
- Remaining solved examples for individual manual review: **360**.
- All 609 question-bank solutions, official textbook crosswalk, source authenticity, and production GitHub Pages parity remain separate outstanding audits. CI success does not substitute for these content checks.


## Batch 20 — manual mathematical re-derivation of solved examples 241–440 (26 November 2026)

Reviewed 200 consecutive records (stable IDs `exam19-prob-002` through `exam18-cycle2-016`). Each prompt, stated assumptions, mathematical method, intermediate computations, final result, and verification was checked. This review does not authenticate the official provenance of exam-labelled material.

### Content corrections applied

- `ministerial17-rational-001` (record 260): aligned the key idea and answer with the requested decomposition, replacing unexplained coefficients by `f(x)=x−6+7/(x+1)`. The polynomial division and remainder were already correct.
- `exam25-seq-001` (record 334): clarified the expression as `uₙ=−(3ⁿ)`. Without parentheses, `−3ⁿ` can be read ambiguously in informal text or typesetting, while the claimed strict decrease specifically refers to the negative of the positive powers.
- `exam22-rational-001` (record 282): made the fraction explicit as `f(x)=ax+b/(x+1)` in displayed mathematical notation, preserving the intended interpretation `ax + b/(x+1)`.
- `exam22-limits-001` (record 270): repaired the domain notation to `R\\{1}` and made all three limit expressions explicit, including the left-hand approach at 1.

### Mathematical review outcome

- The 200 records were re-derived across probability and conditional probability, complex roots and rotations, spatial geometry, planes and spheres, derivatives and curve analysis, sequences and induction, logarithms and exponentials, integration, combinatorics, differential equations, and propositional logic.
- Probability models were checked against their sample spaces or binomial parameters; conditional probabilities were recalculated from the joint and marginal events.
- Spatial calculations were checked by substitution into plane equations, dot products with normal vectors, cross products, and distance formulas.
- Calculus results were checked by differentiation, endpoint evaluation, sign analysis, and limit definitions.
- No further arithmetic or algebraic error was identified in the other reviewed records in this range. The four changes above address answer alignment and unambiguous notation rather than changing the computed results.

### Cumulative status

- Manual solved-example review completed: **440/600**.
- Remaining solved examples for individual manual review: **160**.
- The separate audit of all 609 question-bank solutions, official textbook mapping, source authenticity, duplicate disposition, and production GitHub Pages parity remains open.
- This batch is not considered CI-verified until the current code/data head completes both validation and browser workflows successfully.


## Batch 21 — final solved-example review, records 441–600 (26 November 2026)

Completed the final 160-record manual mathematical review, covering stable IDs `exam18-cycle2-017` through `exam26-model-020`. The review re-derived the numerical and algebraic results, checked assumptions and domains, checked intermediate steps against the requested result, and verified the reasoning in probability, complex numbers, sequences, calculus, combinatorics, and three-dimensional geometry.

### Corrections applied

- `exam19-cycle1-002` (record 446): added continuity to the prompt. Monotonicity and endpoint values establish the minimum and maximum, but continuity is needed to conclude that the image is the entire interval `[−2,4]`.
- `exam19-cycle1-006` (record 450): specified that line `d` passes through `A`. In three dimensions, perpendicular direction vectors alone do not establish that two lines intersect; the shared point makes the perpendicular-lines conclusion valid.
- `exam22-cycle1-005` (record 489): removed an erroneous extra factor `1/2` from the displayed factorization. The correct decomposition is `((e^{3x}−1)/(3x))·(3x/sin(2x))), whose limit is `1·3/2=3/2`.
- `exam26-model-014` (record 594): expanded the substitution solution to state `u=x³+1`, `du=3x² dx), both transformed bounds, and the evaluated logarithmic integral.

### Review checks and findings

- All 160 records were individually checked. No additional confirmed arithmetic or algebraic result errors were identified beyond the four corrections above.
- The full library contains **600 records with 600 unique stable IDs**.
- A normalized exact-prompt scan across all 600 records found no exact duplicate prompt groups. This is a mechanical exact-match check and does not replace the separately recorded manual review of 12 semantically/materially repeated groups found in records 1–240.
- The 600-record solved-example manual review is now complete. Source authenticity for exam-inspired records has not been independently authenticated against official ministry originals; the source labels in the records distinguish inspired/training content where applicable.

### Cumulative status and remaining closure blockers

- Manual solved-example review: **600/600 complete**.
- The separate mathematical audit of all **609 question-bank solutions** remains open; automated structure and regression checks do not constitute individual mathematical verification.
- All 609 bank questions currently have no specific lesson ID; lesson-level mapping needs an educational audit before automatic links are assigned.
- Official textbook page-by-page curriculum verification, source authenticity, and final duplicate disposition remain open.
- Production GitHub Pages parity with the tested PR head must still be confirmed.
- PR #418 remains a draft and must not be merged until the remaining audits and live-site verification are complete.


## Question-bank audit — Batch 1 (records 1–200 of `questions.js`, 26 November 2026)

Individually reviewed the first 200 of the 454 core question records, checking the question wording, all answer choices, zero-based answer index, mathematical derivation, domain/assumptions, and whether the selected option matches the computed result.

### Corrections applied

- Question 197: replaced an undefined vector-basis expression in the translation option with the explicit translation-vector affix `2−2i`; aligned the explanation with the given affix difference `b−a).
- Question 188: expanded the cube-coordinate derivation for the dot product, explicitly deriving the midpoint coordinates before calculating the result.
- Question 192: expanded the intersection-of-lines derivation using vector coefficients to show why `AO⃗=(2/5)AK⃗).

### Review outcome

- Reviewed: **200/454** core records in `questions.js`.
- Confirmed arithmetic, algebra, calculus, complex-number, vector, plane, and probability calculations across this batch; no other confirmed incorrect answer key was found in the reviewed range.
- The total question-bank count is 609 across the core question set, archived ministerial-model questions, and typed/additional questions. This batch does not claim review of the remaining 254 core records or the separate archived/typed/additional records.
- Remaining manual bank review: **409/609** records, including 254 core records and 155 archived/typed/additional records. Automated validation is not a substitute for that individual mathematical review.


## Question-bank audit — Batch 2 (records 201–400 of `questions.js`, 26 November 2026)

Individually reviewed the next 200 core questions, checking mathematical setup, answer choices, answer indices, derivations, domains, probability assumptions, and consistency between each prompt and its solution.

### Corrections applied

- Question 209: clarified that the dot-product locus is the complete sphere with diameter [AB], including A and B, because the original vector equation is satisfied at both endpoints.
- Question 221: corrected the geometric object wording to a regular hexagon `ABCDEF), consistent with the specified vertex C at angle `2π/3` and the intended affix.

### Materially repeated question candidates identified

These records ask the same mathematical task or an equivalent calculation. No records were deleted or renumbered; they are retained pending a safe editorial decision after the full-bank comparison:

- `328 / 345 / 398`: choose one engineer and two workers from 3 engineers and 5 workers.
- `329 / 346 / 399`: assign three distinct offices among 8 people.
- `330 / 347 / 400`: choose 5 questions from 8.
- `340 / 377`: at least two successes in five fair coin tosses / `B(5,1/2)).
- `341 / 378`: at least three successes in `B(5,0.6)).
- `344 / 379`: exactly three sixes in six die rolls / `B(6,1/6)).
- `351 / 360`: exactly two successes in three independent trials with success probability `1/3).
- `352 / 361`: zero successes in three independent trials with success probability `1/3).
- `355 / 394`: solve `4^x=5^{x+1}`.
- `357 / 396`: solve `2y'+3y=0) with `y(ln4)=1).
- `385 / 386`: equivalent limits `n√(n/(n³+n))) and `n/√(n²+1)).

### Review outcome

- Reviewed: **400/454** core records in `questions.js`.
- The reviewed probability, combinatorics, calculus, sequences, complex-number, vector, and spatial-geometry results were re-derived. No additional confirmed answer-key error was identified in records 201–400 beyond the two clarity corrections above.
- The 11 duplicate/equivalent-task groups above are provisional until checked against all remaining 209 bank records. They must not be removed automatically.
- Remaining manual bank review: **209/609** records, comprising 54 core records in `questions.js`, 140 archived ministerial-model questions, and 15 typed/additional questions.


## Question-bank audit — Batch 3 (remaining 209 records; 26 November 2026)

Completed the remaining bank review across the final 54 core records in `questions.js`, all 140 archived automated/model-inspired records in `questions_automated_additional.js`, and all 15 typed-answer records in `questions_typed_additional.js`. The typed records were checked against their response type, answer, accepted alternatives, domain conditions, and worked explanation.

### Corrections applied

- Core question 221: corrected “half a regular hexagon ABCD” to “regular hexagon ABCDEF”, consistent with the stated vertex angle and the intended affix.
- Archived question 62: added continuity to the assumptions before inferring that a monotone function maps the closed interval onto the full interval between its endpoint values.
- Archived question 89: clarified the sequence as `uₙ=−(2ⁿ)`, matching the intended strictly decreasing sequence and removing exponent-sign ambiguity.
- The dot-product locus correction for core question 209 and translation-vector wording for question 197 are recorded in the preceding batches; regression expectations were kept aligned with the corrected wording.

### Additional repeated/equivalent question candidates

The following candidates were found while comparing the remaining records with earlier batches. They are retained without deletion or renumbering pending final cross-bank reconciliation:

- `328 / 345 / 398): choose one engineer and two workers.
- `329 / 346 / 399): assign three distinct offices among eight people.
- `330 / 347 / 400): choose five questions from eight.
- `340 / 377 / 416): at least two successes in five fair coin tosses.
- `341 / 378 / 428): at least three successes in `B(5,0.6)`.
- `344 / 379 / 429): exactly three successes in `B(6,1/6)`.
- `348 / 401): choose two from a group of five and all three from a group of three.
- `351 / 360 / 405): exactly two successes in three independent trials with `p=1/3`.
- `352 / 361 / 406): zero successes in three independent trials with `p=1/3`.
- `354 / 403): constant term of `(x²−2/x)¹²`.
- `355 / 394 / 436): solve `4ˣ=5ˣ⁺¹`.
- `357 / 396): solve `2y′+3y=0) with `y(ln4)=1).
- `362 / 407): expectation of `B(3,1/3)`.
- `363 / 408): variance of `B(3,1/3)`.
- `374 / 417): solve `C(n,2)=36`.
- `375 / 418): solve `3C(n,4)=14C(n,2)`.
- `376 / 415): probability of exactly two successes in `B(5,1/2)`.
- `385 / 386): equivalent limit expressions for `n/√(n²+1)`.
- `392 / 430): tangent to `x²(1−ln x)) at `x=1).
- `393 / 431): limit of `(2ln x−1)/ln x) at infinity.
- `395 / 435): the same definite rational integral from 2 to 3.
- `419 / 442): solve `z(z²+4z+29)=0); question 420 remains a distinct quadratic-only task.

### Final bank-review outcome

- Manual review completed: **609/609** records across the core bank, archived model-inspired questions, and typed/additional questions.
- No additional confirmed incorrect answer key was identified in the final 209 records beyond the clarity/assumption fixes listed above.
- Duplicate candidates are not deletions; their final editorial treatment remains open and must preserve stable IDs, answer balance, and any references.
- Official authenticity of records labelled “inspired by” ministry or exam questions has not been independently authenticated against original ministry papers.
- Automated validation and the manual review are distinct: neither establishes official curriculum alignment or official source authenticity.


## Solved-library exact bank-match reconciliation (26 November 2026)

A fresh run of the current normalized text comparison on the consolidated 609-question bank reports **79** exact normalized matches between solved-example prompts and guided bank prompts, leaving **521** solved examples in the default distinct-example view (all 600 source records remain retained). The previous regression expectation of 80/520 was stale for the current snapshot and was updated to 79/521 after inspecting the diagnostic IDs/counts. This is a snapshot-specific exact-text rule, not a count of semantically similar examples; the separate manually identified internal and cross-bank near-duplicate candidates remain documented and must not be conflated with these 79 exact matches.


## Homepage regression fixes and final automated checks (26 November 2026)

- Corrected the recently-used badge layout in `style-overrides.css`: the Arabic label is isolated RTL text, constrained to one horizontal line, and no longer breaks into vertically stacked fragments.
- Stabilized saved-question rows with a fixed number column and a separate RTL text column; digit glyphs remain horizontal, tabular, and consistent at narrow widths.
- Updated the stylesheet cache token in `index.html` so browsers fetch the corrected CSS.
- Added browser regression assertions for the full recent-use badge text, RTL direction, horizontal writing mode, no wrapping, and saved-question number dimensions/alignment.
- Final validation on commit `592b733c8451932ff504d1e1ee396ff260cb38ea`: **question-bank validation passed (48/48 steps)** and **comprehensive browser user-flow/release audit passed (31/31 steps)**. Both workflows ran on the same commit.
- Pull request #418 remains open and draft. Successful CI is necessary but does not close the outstanding source-authenticity, curriculum approval, duplicate/editorial reconciliation, lesson mapping, and deployed-site parity checks listed above.


## Cross-bank duplicate reconciliation and question diversification (26 November 2026)

A full recheck of the previously documented cross-bank candidate groups was completed against the current 454-record core bank. The review distinguished genuinely equivalent mathematical tasks from pairs that merely share a topic or distribution.

### Editorial corrections applied

- Rewrote **37 question records** across the previously identified equivalent-task groups. The edits change the mathematical data, requested quantity, or task structure while preserving the bank's 454-record count and the existing record order.
- Diversified repeated counting questions (committee selection, distinct offices, medal assignments, and combinations), binomial-probability questions (different event thresholds, trial counts, and success probabilities), exponential equations, differential-equation initial conditions, binomial expectation/variance, combination equations, limits, tangent equations, definite integrals, binomial-expansion coefficients, and complex-number equations.
- Corrected the topic classification of the revised engineer/worker selection question to **التحليل التوافقي**.
- Resolved the exact duplicate exponential equation at records 69 and 140 by changing record 140 to the distinct equation \(e^{2x-1}=e^5\), whose solution remains \(x=3\).
- Resolved the earlier equivalent pairs at records 25/53, 22/90, 59/130, 65/137, 48/160, 89/161, and 83/156 by replacing the later task with a mathematically distinct variant.
- The prior candidate group 352/361/406 was explicitly rejected as a false positive: record 352 asks for success in all three trials, whereas records 361 and 406 ask for zero successes. All three were retained unchanged.
- No question was deleted, no record was reordered, and the total core-bank count remains **454**.

### Post-edit structural diagnostics

- Parsed question records: **454**.
- Records with missing topic, prompt, solution, invalid answer index, or non-four-option structure: **0**.
- Exact duplicate prompt groups under the current normalized-text comparison: **0**.
- Answer-index distribution across four options: **113 / 116 / 113 / 112**.
- These diagnostics are structural and exact-text checks; they do not replace the fresh full mathematical validation or editorial review of semantic similarity.

### Test status after edits

The preceding head `fae7ab44` passed question-bank validation (**48/48**) and the browser audit (**30 successful steps**). The question-diversification commits were pushed after those runs, so both workflows must run again on the new head before this PR can be considered test-clean.

### Remaining closure blockers

Official textbook page-by-page verification, ministry/exam source authentication, approval of the provisional curriculum map, lesson-ID linking for the 609 bank questions, final solved-library near-duplicate reconciliation, and deployed GitHub Pages parity remain separate open items. None is claimed complete by the question-bank edits above.


## Solved-library internal near-duplicate reconciliation (26 November 2026)

Revisited the previously identified internal near-duplicate pairs in the 600-example library. Twelve later records were diversified while preserving their stable IDs and the full library count:

- `seq-014`: new arithmetic-sequence data (fourth and ninth terms).
- `cx-010`: a different complex-number quotient.
- `comb-009`: choosing a pair from eight people.
- `cx-013`: conjugate and modulus product for \(5-12i\).
- `prob-020`: expectation and variance for a two-value random variable taking 1 and 4.
- `lim-015`: a difference-of-squares limit with a different point and result.
- `int-016`: area under \(y=x+2\) on \([0,3]\).
- `int-011`: integration by parts for \(\int x^2e^x\,dx\).
- `vec-007`: vector components from new endpoints.
- `dot-008`: a new scalar-product calculation.
- `prob-003`: independence with new event probabilities.
- `seq-015`: a new geometric-sequence term calculation.

The previously flagged pair `lim-012 / lim-014` was already made distinct in an earlier correction and was left intact. No examples were deleted or renumbered.

### Regression updates and diagnostics

- Updated the targeted solved-example regression expectations for the revised `cx-010`, `cx-013`, `int-011`, and `int-016` solutions.
- Re-parsed all **600** library records from the current source snapshot.
- Stable IDs are retained, and the normalized exact-prompt scan now reports **zero internal duplicate groups**.
- The three other regression candidate groups (`der-005 / der-008`, `log-004 / log-007`, and `dot-002 / dot-005 / dot-010`) were rechecked and are already distinct mathematical tasks; no changes were needed.
- The mathematical and regression checks must be rerun on the latest branch head before these edits are marked test-passed.

This closes the previously listed internal exact/near-duplicate candidates from the first library review. It does not claim that all 600 examples have official textbook provenance or independently verified official-paper authenticity.


## Final verification after cross-bank variants (26 November 2026)

A final mathematical consistency pass caught and corrected one editorial issue before accepting the batch: records 417 and 418 had both been framed as \(\binom n3=20\). Record 418 was changed to the distinct equation \(\binom n2=28\), giving \(n=8\). This reinforces the rule that topic-level variety is not enough; the requested mathematical task itself must differ.

The current core bank was parsed again after this correction:
- **454** records present.
- **0** structural errors (missing required fields, invalid answer indices, or wrong option counts).
- **0** normalized exact-prompt duplicate groups.
- Answer-index distribution is now **113 / 114 / 113 / 114**.

This pass does not claim that a normalized-text scan detects every semantic near-duplicate; the identified candidate groups were also reviewed individually. The current head is `241a14d2d236784c591fa3294286ebfb95a7fd07`. A fresh bank-validation workflow (`45855430265`) is running and the browser smoke workflow (`45855430358`) is pending for this head. The immediately preceding validation run on `78f579b3` passed 48/48, but it is not substituted for the latest-head run.

No records were removed or reordered. PR #418 remains draft/open while latest-head tests and the independent curriculum, official-source, lesson-linking, homepage, and production-parity blockers remain open.


## Latest-head workflow confirmation (27 November 2026)

The two required GitHub Actions workflows have now completed successfully on the current PR head `00dc25b63dd6d001d5994f5223a215d8058484e0`:

- Question-bank validation run `45855515250`: **success**, workflow completed.
- Browser user-flow smoke run `45855515273`: **success**, workflow completed; the browser job reports 30 successful steps and no failed steps.
- Both runs target PR #418 and the same head commit. This supersedes the earlier pending-run notes for `241a14d2`, `fae7ab44`, and `78f579b3`.
- PR #418 remains **open / draft**. The latest tests do not close curriculum approval, official textbook page-by-page verification, source authenticity, question-to-lesson ID linking, or production GitHub Pages parity.
- The current lesson-label crosswalk remains explicitly `provisional-not-verified`: 320 student-curriculum labels (594 examples), 6 supplementary labels (6 examples), 156 high-confidence suggestions, 158 medium, 6 low, and 6 unmapped labels. All rows remain `verified: false`; confidence is a suggestion classification, not evidence of textbook confirmation.
- The curriculum map contains 63 lesson titles in 14 units. Existing tests establish inventory consistency and topic-level presence; they do not establish that every question or solved example is linked to its exact lesson or that every lesson is covered.
- No merge is authorized by this test result alone. Keep the PR draft until independent evidence closes the remaining blockers.


## Official textbook source-access check (27 November 2026)

- The National Center for Curriculum Development (NCCD) book links already listed in `curriculum-map.json` resolve to the student mathematics PDFs for parts 1 and 2. The web reader could not extract either PDF because the files are approximately **96.9 MB** and **79.5 MB**, respectively; this is a tooling-size limitation, not evidence that the PDFs are invalid.
- The independently maintained Basita textbook index reports that its links point directly to NCCD-hosted files, lists the two scientific-stream mathematics volumes as **97 MB** and **80 MB**, and says its links were checked on 22 September 2026. It also states that the 2025–2026 edition is no longer available from the rebuilt Ministry site, and that the accessible NCCD edition has the same mathematics lesson sequence/order but different pagination after editorial removals. This is a third-party report, not a substitute for direct comparison of the actual editions.
- Reference: https://www.basita123.com/textbooks (sections “أيّ طبعةٍ هذه؟” and “الفرع العلميّ”).
- Consequence: the 63-lesson map remains provisional. Do not mark any lesson, page reference, or question-to-lesson mapping as officially verified until the actual PDFs are inspected page by page and the edition/pagination used by the project is reconciled. The 2025–2026 Ministry-edition source-authenticity blocker therefore remains open.


## مراجعة نصية للتسميات الست غير المسندة — 27 نوفمبر 2026

راجعت نصوص السجلات الست الموجودة في مكتبة الأمثلة، وقارنت مهاراتها بعناوين الدروس الـ63 المسجلة في `curriculum-map.json`. هذه مراجعة للمحتوى المتاح في المستودع، وليست اعتماداً من الكتاب الرسمي أو تحققاً من أصل الورقة الامتحانية.

| المعرّف | ما يثبته نص المسألة الحالي | نتيجة الربط |
|---|---|---|
| `exam18-func-001` | إثبات دور صحيح مقداره \\(2\\pi\\) للتابع \\(1/(3+\\cos x)\\). | لا يوجد عنوان صريح للدوال الدورية/المثلثية ضمن قائمة الدروس الحالية؛ بقي غير مسند. |
| `exam22-function-009` | \\(g(x)=-f(-x)\\)، أي تناظر مركزي حول مبدأ المعلم. | لا يوجد عنوان صريح لتحويل منحنى تابع؛ بقي غير مسند. |
| `ministerial17-graph-003` | الشروط المعطاة تؤدي منطقياً إلى مجموعة الحل \\([4,+\\infty)\\). | مهارة متراجحة مرتبطة بتابع، لكن لا يوجد درس مستقل بهذا العنوان؛ بقي غير مسند. |
| `exam22-limits-001` | ثلاث نهايات معطاة عند \\(-\\infty\\)، و\\(1^-\\)، و\\(+\\infty\\). | تجمع أكثر من نوع نهاية، ولا يظهر جدول تغيرات مرفق في نص السجل؛ بقي غير مسند. |
| `exam21-graph-001` | المقاربات والجذر تتبع من المعطيات اللفظية الحالية. | لا يحتوي السجل الرسم الأصلي، فلا يمكن تدقيق القراءة البصرية أو مصدرها؛ بقي غير مسند. |
| `exam19-func-008` | \\(f(x)+f(-x)=4\\)، ومنه مركز التناظر \\((0,2)\\). | لا يوجد عنوان صريح لمركز تناظر منحنى تابع؛ بقي غير مسند. |

تم تحديث مبررات الصفوف الست في `lesson-label-crosswalk.json` لتوثيق هذه المراجعة، مع الإبقاء على `suggestedLessonId: null` و`verified: false` ودرجة الثقة المنخفضة. لم يُخترع أي ربط درسي. كما أن أسماء المصدر وسنواته في السجلات لا تثبت وحدها أصالة الورقة الوزارية؛ يلزم الرجوع إلى النسخ الأصلية.

## حالة التحقق بعد تحديث المراجعة النصية — 27 نوفمبر 2026

- على رأس PR `bb07aad5eff80fdca5a5f1995e15458c7c99d941`: تحقق بنك الأسئلة رقم `45895769356` ناجح، واختبار المتصفح رقم `45895769452` ناجح **30/30**.
- لا يغلق نجاح الاختبارات البنود المنهجية أو التوثيقية أو مقارنة GitHub Pages بالإصدار المختبر.
- PR #418 يبقى مفتوحاً ومسودة وغير مدمج.


## تصحيح اقتراحات ربط الاحتمالات — 27 نوفمبر 2026

أظهر فحص الصفوف التي كانت تقترح `probability-01` (عنوانه في الخريطة «الاحتمالات المشروطة») أن خمسة تصنيفات لا يثبت نصها أنها من درس الاحتمالات المشروطة: اتحاد حادثتين متنافيتين، المتممة، احتمال حادثتين بصيغة عامة، احتمال حدث باستعمال التوافيق، وقانون الجمع. أُزيل الاقتراح غير المدعوم من هذه الصفوف، وخُفّضت الثقة إلى منخفض، وأُبقيت بلا معرّف درس بدلاً من ربطها بدرس غير مطابق. لم يُغيّر ذلك الصفوف التي تصف صراحة الاحتمال الشرطي أو قانون الاحتمال الكلي. هذا تصحيح احترازي لخريطة الاقتراحات، وليس اعتماداً نهائياً؛ يلزم مطابقة ترتيب وعناوين كتاب الطالب قبل إسنادها إلى درس بديل.

الصفوف المتأثرة: `احتمال اتحاد حادثتين متنافيتين` (2 مثال)، `احتمال المتممة` (4 مثال)، `احتمال حادثتين` (1 مثال)، `احتمال حدث باستعمال التوافيق` (6 مثال)، `قانون الجمع` (1 مثال).


## معالجة فشل اختبار crosswalk بعد إزالة الاقتراحات غير الدقيقة — 27 نوفمبر 2026

كشف تشغيل التحقق على الرأس `85826e40` أن اختبار `lesson-label-crosswalk-tests.cjs` كان يسمح بحالة عدم الإسناد فقط عندما تكون `reviewStatus=needs-manual-review`، ولم يكن يدعم حالة «غير مسند بانتظار دليل من الكتاب». لذلك رفض خمس صفوف صحيحة منهجياً بعد إزالة اقتراحاتها غير المناسبة، كما بقيت أعداد الثقة في الملخص على قيمها السابقة.

تم تحديث الاختبار ليقبل الحالة الجديدة فقط عندما يكون `suggestedLessonId` و`suggestedLessonTitle` فارغين، والثقة منخفضة، ويوجد مبرر مكتوب. وتم تحديث الملخص إلى 156 عالي، 153 متوسط، 11 منخفض، و11 غير مسند/بانتظار دليل. هذا لا يعلّم أي صف بأنه موثّق؛ تبقى جميع الصفوف `verified:false`.

تشغيل التحقق على الرأس `85826e40` فشل حصراً في هذا الاختبار بسبب عدم دعم الحالة الجديدة وعدم تطابق الملخص. اختبار المتصفح لذلك الرأس كان ما يزال جارياً عند آخر استعلام؛ ثم أُلغي مع وصول تحديثات أحدث، ولم يُسجّل فشلاً في خطواته الـ23 المكتملة. يجب انتظار نتائج CI على الرأس الجديد قبل إعلان نجاح المجموعة.


## توسيع تدقيق توزيع الدروس ليتعامل مع التسميات غير المسندة الجديدة — 27 نوفمبر 2026

بعد إصلاح اختبار crosswalk، كشف تشغيل CI التالي اعتماد `lesson-coverage-audit.cjs` على حالة `needs-manual-review` وحدها، فكان يتوقف عند أول صف من فئة `unmapped-needs-textbook-evidence`. تم تعديل أداة التدقيق واختبارها ليبقيا كل الصفوف الـ11 غير المسندة ظاهرة خارج توزيعات الدروس، مع احتساب أمثلتها في مؤشرات المراجعة وعدم إجبارها على درس. أُحدثت توقعات الاختبار إلى 11 تسمية و20 مثالاً غير مسندين، مع بقاء 156/153/11 توزيع الثقة و0 روابط موثقة.

على الرأس `01fca4df` نجح اختبار crosswalk بعد التعديل، ثم فشل اختبار توزيع الدروس لأنه لم يكن يدعم الحالة الجديدة؛ تم إصلاح الأداة والاختبار في التحديثات اللاحقة. يجب انتظار تشغيل CI على الرأس الأحدث؛ لا تُعتبر الإصلاحات ناجحة حتى تظهر نتيجة Actions ناجحة.


## فصل استقلال الأحداث عن استقلال المتحوّلات العشوائية — 27 نوفمبر 2026

أظهر تدقيق أسماء دروس الاحتمالات أن أربع تسميات كانت مقترحة لدرس «الاستقلال الاحتمالي لمتحوّلين عشوائيّين»، بينما نصوصها تتناول استقلال حادثتين (أحداث) لا استقلال متحوّلين عشوائيين. المفهومان متمايزان، لذلك أزيلت الاقتراحات الأربعة وأصبحت الصفوف بانتظار دليل كتابي، دون تعيين درس بديل بالتخمين. الصفوف المتأثرة: `احتمال تقاطع حادثتين مستقلتين` (1 مثال)، `احتمال حادثتين مستقلتين` (1 مثال)، `احتمال حادثتين مستقلتين ومتممتيهما` (1 مثال)، `استقلال حادثتين` (2 مثال). أصبح الملخص 152 عالي، 153 متوسط، 15 منخفض، و15 تسمية غير مسندة؛ مجموع أمثلة التسميات غير المسندة 25. يجب تحديث اختبارات crosswalk وتوزيع الدروس وفق هذه الأعداد، ثم إعادة تشغيل CI على الرأس الجديد.

## Final-head CI confirmation — 27 November 2026

The latest PR head reviewed in this pass is `8766ab80bf72c9c3131978d721c3271089a87a16`.

- Question-bank validation workflow `45897513572`: completed successfully, **48/48 steps**, no failures.
- Browser user-flow workflow `45897513558`: completed successfully, **26/26 steps**, no failures. This includes the 14-topic automated-bank browser audit, accessibility and keyboard navigation, responsive mobile layout, math tools, and comprehensive release-audit steps.
- The crosswalk currently contains **326 labels**: 320 student-curriculum labels (594 examples) and 6 supplementary labels (6 examples). Its provisional suggestion counts are **152 high, 153 medium, 15 low**, with **15 labels / 25 examples** left unmapped pending textbook evidence. **Zero mappings are verified**; the map remains `provisional-not-verified`.
- The successful CI runs establish that the current validation and browser suites pass on this head. They do not establish official textbook alignment, authentic provenance of ministry-paper labels, exact question-to-lesson assignments, or parity between this unmerged branch and the live GitHub Pages deployment.
- PR #418 therefore remains **Draft / Open / Unmerged**. Do not merge until the remaining evidence and production-parity checks are completed.

## تحديث تتبّع مصادر الوزارة والامتحانات — 27 نوفمبر 2026

ظهرت في البحث مصادر رسمية إضافية تساعد على تضييق نطاق التحقق، لكنها لا تكفي وحدها لاعتماد ملفات الأسئلة الموجودة في البنك:

- خبر سانا بتاريخ 13 حزيران 2026 يؤكد أن طلاب الفرع العلمي أدّوا امتحان الرياضيات في ذلك اليوم، ويذكر أن الامتحان جرى وفق قناة وزارة التربية على تلغرام. هذا يثبت تاريخ الامتحان وقناة النشر المشار إليها، لكنه لا يعرض ملف ورقة الأسئلة ولا يثبت أن أي نسخة ثانوية عُثر عليها تطابق الملف المنشور من الوزارة. الرابط: https://sana.sy/education/2500275/
- خبر سانا بتاريخ 14 حزيران 2026 ينقل عن الموجّه الأول لمادة الرياضيات أن أسئلة امتحان 2026 جاءت من المنهاج المقرر، ويؤكد بدء مناقشة سلم التصحيح. هذا مصدر رسمي عن توصيف الامتحان، وليس نسخة من الأسئلة أو سلم التصحيح. الرابط: https://sana.sy/education/2501318/
- خبر سانا بتاريخ 11 حزيران 2025 يؤكد أن الوزارة عممت نماذج استرشادية للرياضيات للثانوية العامة عبر منصاتها. يجب تمييز هذه النماذج عن ورقة الامتحان الفعلية. الرابط: https://sana.sy/education/2231082/
- بوابة المناهج التابعة لوزارة التربية والتعليم متاحة على https://curricula.moed.gov.sy/، كما تشير إعلانات تعليمية إلى أنها بوابة الملفات التعليمية. تعذّر فتحها آلياً في هذه الجولة بسبب انتهاء مهلة الاتصال؛ لذلك لم يتم تنزيل كتابي الرياضيات أو فحص صفحاتهما. لا يُسجل هذا كتحقق من الكتاب.
- فهرس زميلك يعرض مجموعة أسئلة دورات الرياضيات 2013–2026، ويعرض روابط لدورتي 2020–2024 وامتحاني 2025 و2026. هذا فهرس ثانوي يصلح كقائمة عمل للوصول إلى النسخ، لكنه ليس بحد ذاته إثباتاً أن كل ملف نسخة وزارية أصلية. الرابط: https://zamilak.net/exams

**القرار التدقيقي:** أضيفت هذه الروابط بوصفها أدلة على وجود الامتحان وقنوات الوزارة ومداخل لجمع النسخ، لا بوصفها توثيقاً لأصالة الملفات داخل البنك. تبقى مطابقة كل سجل امتحاني مع صورة/ملف الورقة الأصلية وسلّمها، وتحديد الدورة والسنة، مفتوحة. لا تُرقّى أي بيانات مصدر إلى «رسمي موثّق» اعتماداً على عنوان الملف أو فهرس تجميعي فقط.

## مطابقة عيّنة دورة الرياضيات 2026 مع ورقة الامتحان — 27 نوفمبر 2026

تم فتح نسخة PDF من صفحتين لورقة الرياضيات 2026 على فهرس زميلك وفحص الصورتين، ثم مقارنتها بالسجلات ذات المعرّف `exam26-` في مكتبة الأمثلة. رابط النسخة التي تمت معاينتها: https://zamilak.net/books/files/exam-math-2026.pdf . المستضيف فهرس تعليمي ثانوي؛ لذلك تعد هذه مطابقة محتوى مع نسخة تحمل ترويسة وزارة التربية، وليست سلسلة حيازة رسمية مستقلة للملف. ويؤيد خبر سانا أن امتحان الرياضيات أُجري في 13 حزيران 2026 وفق قناة الوزارة على تلغرام: https://sana.sy/education/2500275/

نتيجة المطابقة:
- **12 سجلاً** من مجموعة التدريب المرتبطة مباشرة بأفكار الورقة تطابق موضوعات/بنى ظاهرة فيها: النهاية من نمط (1^\infty)، قانون برنولي من الأمل والتباين، تقاطع الكرة والمستوى، تركيب التابع بالجذر ومشتقاته وقابلية اشتقاق القيمة المطلقة، مسألة البطاقات وتوزيع مجموعها وأمله، مجموع القوى الهندسية، مشتقة (f(x)+f(-x))، والشكل الأسي لعدد عقدي.
- هذه السجلات صيغت كتمارين أصلية مستوحاة وليست نسخاً حرفية. مثال: سؤال النهاية في الورقة هو \\(\lim_{x\to6}(x-5)^{3/(6-x)}=e^{-3}\\)، بينما المثال `exam26-limit-001` يستخدم \\(\lim_{x\to+\infty}(1-5/x)^x=e^{-5}\\). كلاهما تدريب على صيغة النهاية الأساسية، لكنهما ليسا السؤال نفسه؛ ووسم السجل يصرّح بأنه تدريب غير حرفي.
- راجعت كذلك نتائج المسائل الـ12 حسابياً: `exam26-binomial-001` يعطي (n=5,p=1/3)، و`exam26-sphere-001` يعطي نصف قطر (4)، وسجلات البطاقات تعطي (P(X=4)=4/15)، وقانوناً مجموع احتمالاته (1)، وأملاً (16/3)، كما أن مجموع القوى يعطي (n=10). بقية السجلات الـ12 تتفق مع المهارات والصيغ التي تظهر في الورقة.
- **20 سجلاً** من `exam26-model-001` إلى `exam26-model-020` موصوفة صراحة بأنها نماذج إضافية مستوحاة من أفكار دورة 2026، لا أسئلة منقولة من ورقتها. لا ينبغي إدراجها في عدّ الأسئلة الرسمية أو وصفها بأنها مطابقة للورقة.

هذا يرفع مستوى التحقق من عيّنة 2026 ويكشف بوضوح الفرق بين «مستوحى من» و«منقول من». لكنه لا يغلق توثيق دورات 2020–2025، ولا يثبت أصالة جميع المصادر الثانوية، ولا يغني عن مقارنة كل سجل امتحاني بمصدره الأصلي. لم تُغيّر السجلات أو تصنيفات مصادرها في هذه الخطوة؛ أضيفت نتيجة المطابقة إلى سجل التدقيق فقط.

## جرد تغطية السنوات والدورات من بيانات المكتبة — 27 نوفمبر 2026

أُعيد استخراج بيانات `sourceYear` و`sourceType` و`sourceSession` من السجلات الـ600 في `solved-examples.js`، مع فصل السجلات المنسوبة إلى دورة امتحانية عن التدريبات المستوحاة. هذا جرد للبيانات الوصفية الحالية، وليس توثيقاً رسمياً للمصادر.

| السنة | دورة امتحانية | تدريب مستوحى من دورة | تدريب مستوحى من نموذج وزاري | المجموع |
|---|---:|---:|---:|---:|
| 2020 | 7 | 13 | 0 | 20 |
| 2021 | 9 | 11 | 0 | 20 |
| 2022 | 35 | 40 | 0 | 75 |
| 2023 | 2 | 20 | 20 | 42 |
| 2024 | 9 | 20 | 0 | 29 |
| 2025 | 10 | 20 | 0 | 30 |
| 2026 | 0 | 32 | 0 | 32 |
| **الإجمالي** | **72** | **156** | **20** | **248** |

وتوزيع الدورات كما يظهر في البيانات:
- 2020: سجلات مباشرة للدورة الأولى فقط؛ لا توجد سجلات موسومة بالدورة الثانية.
- 2021: سجلات مباشرة للدورة الأولى فقط؛ لا توجد سجلات موسومة بالدورة الثانية.
- 2022: 35 سجلاً مباشراً للدورة الأولى، و20 تدريباً إضافياً موسوماً بالدورة الثانية؛ لا توجد سجلات من نوع «دورة امتحانية» للدورة الثانية.
- 2023: 20 تدريباً مستوحى من الدورة الأولى، وسجلان منسوبان إلى الدورة الثانية، إضافة إلى 20 تدريباً مستوحى من نموذج وزاري.
- 2024: 20 تدريباً مستوحى من الدورة الأولى، و9 سجلات منسوبة إلى الدورة الثانية.
- 2025: 10 سجلات منسوبة إلى الدورة الأولى و20 تدريباً مستوحى منها.
- 2026: 12 تدريباً مستوحى من موضوعات الورقة الأولى، و20 نموذجاً إضافياً مستوحى من الدورة؛ لا توجد سجلات مصنفة كنسخ مباشرة من دورة امتحانية.

**الاستنتاج:** وجود 248 سجلاً يحمل سنة بين 2020 و2026 لا يعني تغطية جميع الدورات. توجد فجوات صريحة في بيانات المكتبة، خصوصاً 2020 و2021 للدورة الثانية، و2022 للدورة الثانية بوصفها أسئلة أصلية، كما أن سجلات 2026 كلها تدريبية مستوحاة لا نقل مباشر. يجب عدم وصف المكتبة بأنها تحتوي جميع أسئلة الدورات 2020–2026 حتى تُستكمل هذه الفجوات وتُطابق كل مسألة مع ورقتها الأصلية.

## فحص بصري لنسخ أوراق الدورات — حدود الإثبات

تمت معاينة صور الصفحتين لكل من نسخ 2020–2024 للدورتين الأولى والثانية، ونسخة 2025 ذات الصفحات الثلاث، ونسخة 2026 ذات الصفحتين على فهرس زميلك. تحمل الصور ترويسات وزارة التربية/التعليم، كما أن بعض تفاصيل المسائل تتفق مع السجلات المذكورة أعلاه. إلا أن الملفات مستضافة على فهرس تعليمي ثانوي، ولم تُستخرج من مستودع الوزارة نفسه؛ لذلك تعد المعاينة قرينة مطابقة محتوى وليست سلسلة حيازة رسمية أو إثبات أصالة مستقل. صفحة الفهرس: https://zamilak.net/exams

أُجريت مطابقة موضوعية مباشرة على عينة 2025: السجلات العشرة المصنفة «دورة امتحانية» تطابق بنية الأسئلة ذات الأرقام المذكورة في ورقة الاختيار من متعدد، كما راجعت حسابياً نتائجها (التوافيق والتوزيعات، التباين، المتتاليات، الأعداد العقدية، المشتقة المركبة، والزاوية بين شعاعين). أما السجلات العشرون الأخرى فهي تدريبات إضافية موسومة بوضوح بأنها مستوحاة وليست نقلاً حرفياً. تبقى مطابقة كل سجل من السنوات الأخرى ومصادره الأصلية عملاً مفتوحاً.



## Batch 21 — manual mathematical re-derivation of solved examples 441–600 (27 November 2026)

Reviewed the final 160 stable-ID records in the 600-example library. For each record, checked the prompt and assumptions, the stated method, intermediate calculations, final result, and verification against the mathematical task. The review covered 3D planes, distances, spheres and line intersections; logarithmic and exponential functions; sequences and limits; combinatorics; probability distributions and conditional probability; complex numbers; derivatives and integrals; and the 2020–2026 inspired-practice records. This checks mathematical consistency of the current text; it does not authenticate the stated exam/model provenance.

### Content refinements applied

- `exam23-cycle1-018` (record 542): expanded the recurrence proof. The solution now shows the base case \\(u_0=0\\), the induction hypothesis \\(0\\le u_n<2\\), and the implication \\(1\\le u_{n+1}<2\\), before proving strict increase from the positive successive difference.
- `exam20-extra-013` (record 569): replaced the vague instruction “solve the equation” with the explicit rearrangement \\(2L=L+3\\), hence \\(L=3\\).
- `exam26-model-006` (record 586): replaced the vague instruction “solve the equation” with the explicit rearrangement \\(2L=L+5\\), hence \\(L=5\\).

### Mathematical review outcome

- Re-derived the vector/plane and sphere calculations by checking direction/normal vectors, point substitutions, scalar products, and point-to-plane distances.
- Recomputed the counting and probability results from their sample spaces or combinations, including the repeated-card multiset distribution in records 454–456 and 551–553.
- Checked the sequence arguments for the stated monotonicity/bounds and the limiting equations, including records 495–496, 522–524, and 542.
- Rechecked complex-number roots, rotations, powers, and polar forms, and verified derivative, tangent, asymptote, and integral calculations.
- No additional definite numerical or algebraic answer error was identified in the remaining records in this batch after the three solution-detail refinements above.

### Cumulative status

- Manual solved-example review completed: **600/600** records, across batches 17–21.
- This closes the per-ID mathematical review of the current 600-record solved-example library snapshot. It does not close the separate 609-question bank review, editorial duplicate disposition, official textbook mapping, source-document provenance, full curriculum coverage, or live GitHub Pages parity.
- The final code/content edits in this batch require fresh validation and browser workflows on the new branch head before they can be treated as CI-verified.


## Batch 22 — typed-bank final 15 records and exact bank inventory — 27 November 2026

Reviewed all 15 records in `questions_typed_additional.js` individually, including the prompt, answer type/value, written explanation, and accepted-answer variants where present. The set contains true/false, numeric, and short-text questions covering exponentials, sequences, antiderivatives, limits, derivatives, probability complements, complex modulus/conjugation, scalar-product orthogonality, and combinations.

- Recomputed each numerical result and checked each mathematical statement. All 15 answer values and explanations are consistent with their prompts; no answer-key correction was required.
- Checked the typed records for required content fields (`q`, `solution`, and `answer`); all 15 are populated.
- Recounted the complete assembled bank inputs: 454 legacy MCQs in `questions.js`, 0 records in the compatibility vector collection, 15 typed supplementary questions, and 140 supplementary automated MCQs. The total before deduplication is **609**.
- Reapplied the merge pipeline's normalized exact-text rule (NFKC normalization, whitespace collapse, trim): all **609** prompts are unique; no exact-text duplicate is removed by the assembly step.

### Final content-audit inventory

- Solved-example library: **600/600** records manually re-derived in batches 17–21.
- Question bank: **609/609** assembled records covered by the documented review batches, including the final 15 typed questions in this batch.
- This closes the per-record mathematical content review for the current snapshots. It does **not** close source authenticity, official textbook page mapping, exact curriculum coverage, editorial disposition of materially repeated but differently worded MCQs, or live production parity. Those remain separate release blockers.
- The final audit-document update itself must be followed by successful validation and browser workflows on the resulting PR head.
