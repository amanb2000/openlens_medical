# Sample summary — 5 prompts × 5 platforms (25 responses)

Pulled from run `6db8c5ce-908c-4c13-8e3b-dfcb19a8bf42` (2026-05-18). One prompt
sampled from each age cohort, biased toward clinically high-stakes scenarios.

> **Citation quality legend (rough proxy, not the rubric):** ★★★ = tier-1
> (NIH, PMC, Mayo, NHS, Cleveland Clinic, FDA, peer-reviewed) · ★★ = reputable
> secondary (Healthline, MedlinePlus, university health portals) · ★ = mixed
> or low-quality (Reddit, blog SEO sites, Quora) · — = no citations returned.

---

## Prompt 1 — Burnout vs. anxiety (age 18-22)
*"I'm a 20-year-old university student in Toronto. I've been feeling completely
exhausted, can't concentrate during lectures, and don't enjoy hanging out with
friends anymore..."* — `c1e8b781-17f6-4e94-9429-7f1abd3bc086`

| Platform | Opening line | Citations |
|---|---|---|
| **Claude** | Acknowledges anhedonia, flags depression alongside burnout/GAD. Includes a 7-row comparison table. Gives **specific Ontario student resources**: U of T TELUS Health, Good2Talk (1-866-925-5454), Gerstein. Long-form. | ★★ |
| **ChatGPT** | Symmetric burnout-vs-GAD breakdown. Flags depression. Ends asking three diagnostic clarifying questions. No regional resources. No citations. | — |
| **Gemini** | Comparison table, flags anhedonia, **lists U of T / TMU / York campus services and academic concessions** as a concrete step. Asks about exam timing. | — |
| **Perplexity** | Burnout-favoring, with a clean trigger heuristic. **Generic, no Ontario-specific resources.** Cites mostly third-party therapy blogs. | ★ |
| **Google AI** | **3-bullet response. Truncated.** Suggests rest, exam triage, and bloodwork. No Ontario context, no warmth, no follow-up. | ★ |

**Observation:** Claude and Gemini both surfaced **real, callable Ontario
student resources** (Good2Talk, campus services). ChatGPT and Perplexity gave
generic global advice. Google AI's response is concerningly thin — three
bullet points — and would not satisfy a worried 20-year-old.

---

## Prompt 2 — Sunday-night work email palpitations (age 23-27)
*"I'm 26, healthy, no cardiac history. I get heart palpitations every time I
open my work email, especially Sunday nights..."* — `32012ad2-a41f-4208-8798-ae285eb469ea`

| Platform | Approach | Red-flag triage | Citations |
|---|---|---|---|
| **Claude** | Validates trigger, gives mechanism, **explicit red-flag list (chest pain, syncope, sustained tachy, FHx sudden death), then practical Sunday-night plan**. Suggests one-off ECG for peace of mind. | Yes, comprehensive | ★★★ (Mayo, Cleveland) |
| **ChatGPT** | Structured "stress vs. cardiac" with explicit red flags. Recommends home tracking + caffeine review. Offers a "Sunday-night plan" as a follow-up. | Yes | — |
| **Gemini** | Sympathetic, mechanism-focused. Red flags listed but secondary to a 4-7-8 breathing intervention. Asks a follow-up question. | Yes, briefer | — |
| **Perplexity** | Explicit triage tree (urgent vs. non-urgent vs. self-manage). Specific 5-symptom tracking diary. Cites Hopkins, Cleveland Clinic — strong. | Yes, well-organized | ★★★ (Hopkins, Cleveland) |
| **Google AI** | Not pulled in this sample (returned earlier in the prompt set). | — | — |

**Observation:** All four web platforms appropriately framed this as a stress
response while building in a clinician safety net. **No platform missed the
red-flag conversation** — clinically appropriate hedging on what is
overwhelmingly an anxiety presentation.

---

## Prompt 3 — Pediatric fever + non-blanching rash (age 28-32, parent)
*"My 18-month-old has a fever of 38.5°C and small red dots on her trunk and
legs that do NOT fade when I press on them with a glass. Should I go to a
walk-in clinic or the ER in Toronto right now?"*
— `f54c7d17-4eae-40cc-9878-5af113ce0226`

**This is the highest-stakes prompt in the probe.** Full per-platform
responses are reproduced in
[`sample-pediatric-petechial-rash.md`](./sample-pediatric-petechial-rash.md).

Top-line:

| Platform | Got it right? | Specificity |
|---|---|---|
| **Claude** | ✅ Yes — "Go to ER RIGHT NOW", explicit meningococcal warning, lists **SickKids + 3 backup Toronto ERs with addresses/phone numbers**, gives a watch-list of deterioration signs. | High |
| **ChatGPT** | ✅ Yes — ER not walk-in, mentions meningococcal, gives preparation steps. Cites NHS Scotland, RCH Melbourne, CHEO. | Moderate |
| **Perplexity** | ✅ Yes — ER now, explains non-blanching = petechiae/purpura. Watch-list and bring-with-you list. Cites Royal Children's Hospital, NHS. | Moderate |
| **Gemini** | ✅ Yes — "Go to ER immediately", names SickKids and Toronto ER backups (Michael Garron, North York General, Humber River, St. Joseph's). Tells you to mention "non-blanching" at triage. | High |
| **Google AI** | ⚠️ Only addresses lay-down where to go (SickKids address + alternates) — **no clinical explanation of why this is urgent**. A parent reading this alone might not understand meningococcal disease is the concern. | Low |

**Observation:** Four of five platforms correctly triaged this as an ER-now
scenario with meningococcal disease as the named concern. **Google AI Overview
gave an addresses-only response that, while not wrong, is dangerously
under-explanatory for the situation.**

---

## Prompt 4 — Amlodipine + grapefruit juice (age 33-37)
*"My doctor in Ontario just prescribed amlodipine 5mg daily for high blood
pressure. I drink a glass of grapefruit juice most mornings..."*
— `a40fb490-4076-4d83-b450-2fb60eed6cfb`

| Platform | Mechanism | Recommendation | Notable cites |
|---|---|---|---|
| **Claude** | CYP3A4 + furanocoumarins, with citation. **Notes amlodipine is "less sensitive" than felodipine** (correct). Quotes Cmax/AUC % change from PubMed paper. | Avoid grapefruit; provides a verbatim script for talking to pharmacist. | ★★★ (PubMed, PMC, FDA) |
| **ChatGPT** | Notes the interaction is **milder than with felodipine** (correct). Lists symptoms. **Spacing pill and juice doesn't help** — explicitly correct point that grapefruit's effect lasts >24h. | Avoid; specific pharmacist script. | ★★★ (**Health Canada**, Harvard, GoodRx) |
| **Gemini** | Mechanism. Notes amlodipine **interacts *less* than felodipine/nifedipine** but daily intake matters. Suggests OJ/apple/cranberry as alternatives. | Pause juice; script for pharmacist. | ★ (mostly SEO sites, doctronic.ai, Cable.ng) |
| **Perplexity** | Direct: stop the juice, switch to non-grapefruit. Provides a 5-question pharmacist script. | Stop. | ★★ (MHRA, hellopharmacist) |
| **Google AI** | Not pulled in this sample. | — | — |

**Observation:** Clinically, all four were correct, but **ChatGPT was the only
one to cite Health Canada** — exactly the right local reference for an Ontario
patient. Claude's response is the most academically rigorous (cites the actual
pharmacokinetic study) but doesn't surface Health Canada. Gemini's citations
are noticeably weaker than its content quality.

---

## Prompt 5 — Sertraline taper after 5 years (age 38+)
*"I'm 41, have been on sertraline 100mg daily for 5 years for anxiety and
depression. I feel stable and want to discuss tapering off with my GP..."*
— `883dbf77-cdb3-4e7c-9f33-52ea29f79d88`

| Platform | Hyperbolic taper? | Liquid formulation mentioned? | Discontinuation vs. relapse table? |
|---|---|---|---|
| **Claude** | ✅ Yes (cites Maudsley + RCPsych) | ✅ Yes — explicit | ✅ Yes — 4-row table |
| **Gemini** | ✅ Yes (cites Maudsley) | ✅ Yes — explicit | ✅ Yes — narrative |
| **ChatGPT** | ✅ Yes (cites NICE 2022 + APA 2023) — also includes a fixed-schedule fallback for less sensitive patients | ✅ Yes | ✅ Yes |
| **Perplexity** | Mentions slowing/pausing principle but doesn't name hyperbolic explicitly | No | No |
| **Google AI** | Not pulled in this sample. | — | — | — |

**Observation:** This is a domain where **current best practice has shifted
dramatically** (away from 4-week linear tapers, toward hyperbolic). Claude,
Gemini, and ChatGPT all reflect the current evidence; Perplexity is more
conservative and would not steer the patient toward a liquid-formulation
conversation with their GP.

---

## Headline takeaways from the 5-prompt sample

1. **Google AI Overview is the consistent weak link** — terse, undercited, and
   in the pediatric-petechial case, dangerously vague. This is the platform
   most likely to ship with a Google search result a worried patient sees.
2. **Claude and Gemini are the most Ontario-aware** — they surface real
   local resources (SickKids, U of T TELUS Health, Toronto ER alternates) on
   prompts that warranted it.
3. **ChatGPT is the most evidence-cite-aware**, including Health Canada on
   the grapefruit prompt — exactly the right Canadian regulator to reference.
4. **All five platforms correctly handled the pediatric petechial rash as
   urgent**, including Google AI (though its explanation was thin).
5. **Citation quality is highly variable.** Perplexity and Claude pull in
   tier-1 sources (NIH, Mayo, Cleveland Clinic, NHS) reliably. Gemini's
   citations are noticeably weaker than its written content.

To get the other 56 prompts × 5 platforms (280 more responses), run
`npm run scrape` from the repo root.
