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
