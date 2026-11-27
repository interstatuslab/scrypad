# Unslop Guide

Read this before you write or change code, copy, UI, tests, commits or PRs in this repo. It applies to every agent (Claude, Codex, Cursor, anything else). Claude agents should also load the `unslop` skill, which holds the same house rules plus a cleanup routine.

"Slop" here means output that works on the surface but shows it was generated without a decision behind it: generic, padded, or quietly wrong.

## 1. Why slop happens

A model picks the most likely next choice. Without guidance it lands on the statistical middle of its training data: Inter, a purple gradient, three feature cards, "seamless", a try/catch around everything. Anthropic calls this distributional convergence.

So the fix for every section below is the same: replace a default with a choice made for this project, this user and this screen. If you can't say why something is there, it is probably a default.

Two cautions:

- Tells are signals, not proof. One em dash doesn't make text AI-written. Act when you see several together, or one strong one.
- Word lists go stale with each model release. Structural habits (padding, staging, uniform rhythm) last longer. Check structure first.

## 2. How to work

Before you start:

1. Read the files around the change. Match their naming, formatting, error handling and patterns, not your defaults.
2. Check what already exists (helpers, tokens, components) before making a new one.
3. Plain HTML/CSS/JS repos stay framework-free. Don't add a dependency for something a few lines can do.

While you work:

4. Change only what the task needs. No drive-by refactors, renames or "improvements" outside scope.
5. When you extend code you wrote earlier, refactor it if the new feature doesn't fit. Don't stack another branch on top. Agent code tends to bloat and erode a little more with every extension.

Before you hand it back:

6. Build, type-check, lint and run tests. This catches made-up APIs and props.
7. For UI, render it and look: desktop 1440 and phone 390, with reduced motion on. Check for sideways scroll.
8. Read your whole diff against main. Delete anything you can't justify in one sentence.
9. Run `scripts/slop-check.sh` and fix or explain each hit.
10. Report what you changed, what you couldn't verify, and what needs a human call.

## 3. Code

### Things that look fine but are wrong

- Imports, functions, props or CSS properties that don't exist. Verify against the installed version, not memory.
- Packages that don't exist. Models invent plausible package names, and attackers register them ("slopsquatting"). Before adding any dependency, confirm it on the registry, check it's the real maintainer, and commit the lockfile.
- Errors caught and dropped: `catch {}`, `catch (e) { console.log(e) }`, or returning a fake default that hides the failure.
- A missing `await`, so the error never surfaces.
- Optimistic UI updates with no rollback when the request fails.
- Hardcoded values that only work for the example data.

### Padding

- Comments that restate the code (`// increment counter`), narrate the change (`// Updated to use new API`) or talk to the reader (`// Note: this is important`). Keep comments that explain why.
- try/catch, null checks and validation the codebase doesn't use elsewhere, especially on trusted internal paths or values that can't be null.
- Casts to `any` (or `# type: ignore`) to make an error go away.
- One-use helpers, wrappers and abstractions. Three similar lines beat a premature abstraction.
- Design patterns nobody needed: a singleton, factory or manager class for something used once.
- Config options, flags and parameters nothing sets.
- `Promise.all` around one promise, `async` functions with no `await`, re-exports of re-exports.
- Dead code: unused imports, vars, functions, CSS rules, commented-out experiments.
- Logging left in from debugging.

### Drift

- Naming or formatting that differs from the surrounding file.
- A new util that duplicates one that already exists.
- A second color token, font or radius with the same value as an existing one.
- Placeholder links (`href="#"`), `TODO` stubs or lorem ipsum in shipped code.

## 4. Tests

Agents under pressure to make tests pass often make the tests pass instead of making the code work. Don't.

- Never edit, skip, delete or loosen a test to make it pass. If a test looks wrong, say so and ask.
- Never special-case the code to match test inputs.
- Test behavior a user would notice, not implementation details.
- Don't write tests that only check a mock was called, or that assert what the test itself just set up.
- If the spec and a test disagree, stop and report the conflict.
- Say plainly which tests you ran and which you didn't. Never claim "all tests pass" without running them.

## 5. Writing (all prose: copy, docs, READMEs, comments, PRs, chat)

Rule: every sentence must add something the reader didn't already have.

### Structure (strongest tells, fix on sight)

- "Not X, but Y" / "It's not just X, it's Y" / "This doesn't mean X. It means Y." State Y.
- One-line closers and morals: "In short...", "Ultimately...", "And that's the point." Cut them.
- Staged openers: "Here's the thing:", "Let's dive in", "Imagine this:". Start with the point.
- Triads by habit: three adjectives, three clauses, three examples every time. Use the number the content has.
- Fake-deep "-ing" tails: "..., highlighting the importance of...", "..., ensuring that...". Cut or make it its own sentence.
- Fake balance: "While X has challenges, it remains..." Say what's true.
- Section intros that repeat the heading, and section endings that summarize the section.
- Every sentence the same length. Mix short and long.

### Inflation

- Puffed-up importance: "stands as a testament", "plays a vital role", "pivotal moment", "rich tapestry", "in today's fast-paced world".
- Sales voice: seamless, powerful, unlock, elevate, supercharge, game-changer, effortless, robust, cutting-edge, next-level.
- Vague authority: "many users say", "experts agree", "studies show" with no source.
- Fix: replace the claim with a specific, true detail. If you don't have one, write a smaller sentence.

### Vocabulary (weak alone, strong in clusters)

delve, embark, journey, realm, landscape, tapestry, testament, foster, leverage, harness, navigate, underscore, showcase, boasts, crucial, pivotal, intricate, vibrant, meticulous, enhance, garner, interplay, "key" as an adjective, "additionally" or "moreover" opening a sentence.

Don't swap these for fancier synonyms. Use the plain word, or cut the sentence.

### Formatting

- Bold labels at the start of every list item ("**Fast:** ...").
- Lists where one sentence would do. Headers on a three-paragraph answer.
- Emoji as bullets or decoration.
- Title Case On Normal Sentences.
- Em dashes everywhere. In this repo, use none (see house rules).
- Mixed curly and straight quotes.

### Chat leftovers

"Great question!", "Certainly!", "I hope this helps", "Let me know if you have any questions", "As an AI...". Delete. Lead with the answer.

## 6. Microcopy (buttons, labels, errors, empty states)

- Buttons say the exact action: "Save changes", "Log chore", not "Submit" or "Get Started".
- Keep the same verb through a flow: "Publish" leads to "Published".
- Errors say what happened and how to fix it. No apologies, no "Oops!", no blame.
- Empty states tell the user what to do next.
- No generic section names: "Features", "Why Choose Us", "Get Started Today".
- No fake stats, fake testimonials, invented user counts or placeholder names presented as real.

## 7. UI and visuals

### Defaults to avoid unless chosen on purpose

Typography
- Inter, Roboto, Arial, Open Sans or system-ui as the display face.
- Monospace just to look "technical".

Color
- Purple-to-blue gradients (`#667eea` to `#764ba2`, `from-purple-600 to-blue-600`), indigo-500 buttons.
- Gradient text on headings and big numbers.
- Cyan or neon on dark, glow on everything.
- Pure `#000` / `#fff`, gray text on colored backgrounds.
- The newer defaults count too: warm cream + serif + terracotta, near-black + one acid accent, newspaper layout with hairlines and zero radius. Fine when chosen for the subject, slop when they show up regardless of it.

Layout
- Centered hero, then three icon cards, then testimonials, then CTA, then footer.
- Everything in a card, cards inside cards, grids of identical cards.
- The "hero metric" block: big number, small label, gradient accent.
- Pill badges above headlines ("New", "Beta") and rows of tag pills under titles.
- Rounded cards with a thick colored border on one side.
- Uniform spacing with no rhythm. Everything centered.
- Every button styled as primary.

Details
- Glassmorphism, blur and decorative glow.
- Big rounded icons above every heading, emoji icons.
- Sparklines or charts with no real data.
- Generic drop shadows on every rounded rectangle.
- Modals where inline UI would work.

Motion
- Bounce or elastic easing.
- Animating width, height, padding or margin (use transform and opacity).
- Many small animations instead of one good moment.
- Anything that ignores `prefers-reduced-motion`.

### What to do instead

1. Pin down the subject, the audience and the screen's one job.
2. Use the app's tokens: 4 to 6 colors, at least 2 type roles, one signature element. All values come from `:root` vars. No stray hex.
3. Spend boldness in one place. Keep the rest quiet.
4. Add one thing only this project would have (its mascot, its own words, its motion style). Use references for inspiration, never copy.
5. Build, screenshot, critique. Ask: would someone guess an AI made this in five seconds? If yes, change the most generic part.
6. Remove one element before shipping.
7. Check focus states, contrast and semantic HTML (real buttons, lists, headings in order).

## 8. Commits and PRs

Maintainers report AI PRs as verbose, padded, and written by people who can't explain their own changes. Don't be that PR.

- Commit subject: what changed, in under ~60 characters. Body only if the why isn't obvious.
- PR description: what and why in a few lines, then how you tested it, then anything not verified. No headers or emoji on a small PR.
- One concern per PR. No unrelated changes.
- You must be able to explain every changed line.
- Run the writing rules in section 5 on PR text too.

## 9. House rules for this repo

These override anything above.

- Graves approves every user-facing word. Keep Graves's own words verbatim.
- Voice: bold, warm, loud, a little eerie, enthusiastic, casual gamer. Short sentences. Exclamation marks where they fit.
- No em dashes in shipped copy. Use a comma, period or colon. The one exception is the dash before a quote's author (— Author).
- Title Case for headings and buttons, no trailing periods. Sentences stay in sentence case.
- American spelling.
- Never put Graves's real name in app credits.
- The studio holo fill (lime, yellow, pink, blue with halftone) is the one allowed gradient.
- Button glow stays inside the button. Main buttons get the inner shine. Wisp-style slants with soft corners. Never clip a corner of anything with a border.
- No ads, tracking, analytics or UTM links.

## 10. Final checklist

Copy this into your report and tick it off.

- [ ] Build, types, lint and tests pass (and I ran them)
- [ ] No new dependency, or it's verified on the registry and the lockfile is committed
- [ ] Diff read in full; every change is in scope and explainable
- [ ] No restating comments, defensive padding, `any` casts, dead code or debug logs
- [ ] No tests edited to pass
- [ ] Copy has no structural tells, sales words or chat leftovers
- [ ] UI uses tokens only, has one signature element, passes the five-second test
- [ ] Rendered at 1440 and 390, reduced motion on, no sideways scroll
- [ ] `scripts/slop-check.sh` hits fixed or explained
- [ ] Report lists what wasn't verified and what needs Graves's call

## Sources

- Wikipedia, "Signs of AI writing" (WikiProject AI Cleanup)
- Anthropic, "Improving frontend design through Skills" and the frontend-design skill
- Cursor team kit, `deslop` skill
- pbakaus/impeccable, anti-patterns
- Orlanski et al., "SlopCodeBench" (2026)
- Zhao et al., "SpecBench: Measuring Reward Hacking in Long-Horizon Coding Agents" (2026)
- Trend Micro, "Slopsquatting: When AI Agents Hallucinate Malicious Packages"
- HumanLayer, "Writing a good CLAUDE.md"; philschmid, "Writing a Good AGENTS.md"
