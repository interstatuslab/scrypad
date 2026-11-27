# ScryPad: notes for Claude

## Unslop (Graves, 2026-11-19)
Nothing here should look or read like an AI template. Run the `unslop` skill before showing Graves a page, copy or PR.
- Verify first: build, lint and test, render desktop and phone, read the whole diff against the default branch.
- Writing: none of the "Signs of AI writing" (puffed-up or promo words, not-X-but-Y, forced threes, -ing tails, staged openers, wrap-up closers, em dashes, bold-label lists). Keep Graves's own words verbatim.
- Visuals: no feature-pill rows, icon-card grids, uniform card grids, nested cards or cliché gradients. Glow stays inside buttons. No clipped corners on bordered things. Colors, fonts and radii come from this app's tokens.
- Code: no comments that restate the code or log changes, no extra try/catch or defensive checks, no dead CSS or code, match this repo's style.
- Full guide: `docs/UNSLOP.md`. Run `scripts/slop-check.sh` before handing work back and fix or explain each hit.
- Tests: never edit, skip or loosen a test to make it pass. Report the conflict instead.
- Dependencies: confirm any new package exists on the registry and commit the lockfile.
