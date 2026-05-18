# Author initial patient prompt set + medical-quality rubric

## Goal

Stand up the two missing pieces of the workflow described in `README.md`:

1. `prompts/patient-questions.json` — a first real set of patient-style prompts.
2. `rubrics/medical-quality.md` — the grading rubric used by `scripts/analyze.ts`.

## Prompt set

Twenty-five patient-question **templates** were drafted, organized into five age
cohorts that reflect the kinds of questions Dr. Bhargava's IM Care patients
actually bring to GPT/Claude/Perplexity/Gemini:

- **18–22 ("Immediate Impact")** — mental health labeling, sexual health & privacy,
  skincare interactions, supplements, student-benefit navigation
- **23–27 ("Career & Preventative")** — ergonomics, stress vs. cardiac, nutrition,
  shift-work sleep, pre-visit preparation
- **28–32 ("Family & Reproductive")** — fertility, pediatric red-flag triage,
  postpartum mental health, benefit comparison, environmental exposure
- **33–37 ("Chronic & Longevity")** — lab interpretation, screening, caregiver onboarding,
  drug/supplement interactions, specialist wait-list advocacy
- **38–42+ ("Complex Management")** — perimenopause, imaging report translation,
  symptom diaries, metabolic workup, antidepressant tapering

Each template carries placeholders (`[City Name]`, `[Antidepressant]`, etc.) that would
produce noisy answers if sent to an LLM verbatim. They are therefore expanded into
**2–3 fully-instantiated variants per template** (≈60 prompts total), grouped by a
shared `variant-of-<slug>` tag so the analyzer can do side-by-side comparison.

## Taxonomy change

The Ontario-centric prompts (OHIP, LifeLabs, Loblaws, AQHI) need a geography axis.
Adding the following custom attributes:

- `geo-canada`, `geo-ontario`, `geo-toronto`, `geo-ottawa`, `geo-hamilton`,
  `geo-sudbury`, `geo-rural-on`

These will be reflected in `CLAUDE.md` under the attribute taxonomy section and
pushed into the OpenLens project via `add_prompt_attribute` before the first run.

## Rubric

`rubrics/medical-quality.md` will use a **1–5 numeric score per criterion + one-line
narrative**, with an overall verdict. Criteria, per the README:

1. Clinical accuracy
2. Safety / appropriate hedging
3. Recency vs. current guidance
4. Local relevance (IM Care / Ontario / Canada handling)
5. Citation quality (UpToDate, NIH, Mayo vs. forums)
6. Hallucination risk (confident-wrong vs. honest uncertainty)

The rubric will be cached on every analyzer call (`scripts/analyze.ts`) — see
`README.md` Step 3.

## Out of scope for this PR

- Pushing the prompts into the OpenLens project (`add_prompt_attribute` +
  `add_prompt`) — separate ticket once the JSON is reviewed.
- Implementing `scripts/scrape.ts` and `scripts/analyze.ts` — separate ticket.

## Acceptance criteria

- [ ] `prompts/patient-questions.json` validates as JSON and follows the schema in `CLAUDE.md`.
- [ ] Every prompt has at least one age, one question-type, and one clinical-domain tag.
- [ ] Variants share a `variant-of-<slug>` tag.
- [ ] All attributes are lowercase-hyphenated (per the normalization rule).
- [ ] `rubrics/medical-quality.md` exists with all six criteria, anchor descriptions, and an overall-verdict section.
- [ ] `CLAUDE.md` taxonomy table updated with the geo axis.
