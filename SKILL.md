---
name: wanpe-prompt-boost
description: Boost raw text-to-video requests into director-level cinematic plans using WanPE reverse construction. Use when the user wants prompt enhancement, prompt boosting, a better T2V prompt, cinematic rewrite, shot-level plan, multi-shot screenplay for Wan, Seedance, Veo, Kling, Sora, LTX, Runway, or Hailuo, or when a short idea must become a 5-30s generatable prompt without changing the user's intent.
license: Apache-2.0
metadata:
  type: workflow
  version: "1.0"
  source_paper: "WanPE - Towards Cinematic Prompt Enhancement for Modern Text-to-Video Generation (arXiv 2609.30221)"
---

# WanPE Prompt Boost

Turn a raw user request into a video-grounded cinematic condition. Do not decorate the sentence. Author the plan a finished clip would have been captioned with.

Paper core (WanPE, arXiv 2609.30221) — two objectives, both required:

1. Semantic preservation. Every constraint in the user request must survive. Allowed moves are paraphrase and compatible elaboration. Forbidden moves are omission, substitution, speaker/object rebinding, and invented plot.
2. Video-grounded structure. The output must look like a hierarchical caption of a real 5–30s clip (video summary + timestamped shots), not like a marketing rewrite of the user's sentence.

This skill is the planning layer. Pair it with `cinematic-micro-story` when the user still needs a story/turn. Pair it with `ai-film-production-pipeline` when the job is a multi-minute film, not a single generation prompt.

## When not to use this

- The user asked for a story, logline, or festival short and did not ask for a generator-ready prompt.
- The user already delivered a complete shotlist and only wants copy-edits.
- Duration target is longer than ~60s (hand off to the film pipeline).

## Pipeline — run every stage, in order

### 0. Lock the brief

Extract, do not invent:

- Intent granularity — `intent` (premise only), `scene` (event order, no shots), or `shot` (user already named shots/camera).
- Duration (default 10s if unspecified; clamp 5–30s unless the user named another window).
- Aspect ratio, style, language of dialogue.
- Constraint set C(x) — subjects, wardrobe, actions in order, spoken lines, camera verbs the user already named, lighting, location, era, audio (speech / music / SFX / silence), brand or product rules, negatives.

Write C(x) as a short internal checklist. Every later field must be traceable to C(x) or to a compatible elaboration that does not contradict it.

### 1. Reverse-construct the finished clip

Do not expand the request forward ("add prettier adjectives"). Work backward:

1. Picture the clip that would exist if a competent director had already shot C(x) at the target duration.
2. Decide shot count from duration and event density, not from a habit:
   - 5s → 1–2 shots
   - 10s → 2–4 shots
   - 15s → 3–6 shots
   - 30s → 4–8 shots
   - If granularity is `shot`, keep the user's shot count unless a named shot is empty and must be split for time.
3. Assign timestamps that sum exactly to the duration. Cuts need a reason (new scale, new subject, new information). Do not cut on every clause.
4. For each shot, fill the realized-video fields in `references/output-schema.md`. Prefer camera verbs (push-in, track, pan, tilt, orbit, handheld, locked-off, crane, FPV) over mood adjectives.

Category adapters (apply the matching extra fields):

- Large motion — displacement, speed, posture change, impact.
- Music / sing-dance — performance, rhythm, lyric sync, body-to-beat.
- Speech / dialect — exact lines, speaker binding, tone, ambient bed.
- Animation — medium (2D/3D/stop-motion), motion cadence, line quality.
- Ad / product — hero object continuity, logo timing, claim safety.
- VFX — effect onset, integration with live plates, decay.
- Long take — path, speed envelope, what the move reveals.

### 2. Write the hierarchical condition

Default output is WanPE native form. See `references/output-schema.md`.

```
The video consists of N shots. [medium + genre]. [1-3 sentence video-level summary covering setting, visual style, narrative perspective, pacing, and audio design].

Shot k [ss.ss-ee.ee s]:
[scale + angle + lens + move]. [subjects and spatial relations]. [actions in temporal order]. [lighting]. [transition in/out]. [dialogue with speaker]. [SFX / music for this window].
```

Rules:

- Video-level block states shot count, style, world, pacing, and the audio mix once.
- Shot blocks are temporally ordered and timestamped.
- Dialogue is bound to a named speaker. Never float a line.
- If the user forbade music, write `Audio: speech and diegetic SFX only. No score.`
- If granularity is `shot`, reuse the user's shot order and verbs; complete missing fields only.

### 3. SC-GRPO self-check

Score the draft against the nine WanPE semantic dimensions before showing it. Procedure and fail codes live in `references/sc-grpo-checklist.md`.

If any dimension is a fail (omission, alteration, bad binding, temporal contradiction), repair that field and re-check. Do not ship a boost that drops a named subject, swaps who speaks, reorders the user's events, or changes the requested style.

Compatible elaboration is allowed. Example — user said "rainy alley"; adding wet asphalt reflections and neon bounce is legal. Changing the alley to a rooftop is not.

### 4. Format-adapt only on request

Native WanPE form is the default and transfers well. If the user named a generator, wrap or retarget using `references/format-adapters.md` without changing cinematic content.

Supported retargets — Wan / Wan3, Seedance, Veo, Kling, Sora, LTX, Runway, MiniMax/Hailuo.

### 5. Deliver

Always return, in this order:

1. **Boosted prompt** — the hierarchical condition, copy-paste ready. Put it in a fenced code block.
2. **Constraint ledger** — 6–12 bullets mapping C(x) to where each constraint landed. Makes fidelity inspectable.
3. **Director notes** (short) — shot count, duration math, why the first frame and the last frame are those frames, any constraint you refused to invent.

If the user asked for several variants, keep C(x) identical and vary only camera grammar, pacing, or coverage — never the story facts.

## Hard bans (forward-rewriting failure modes)

WanPE ablations show reverse construction beating forward rewriting by a wide margin. Do not:

- Emit one decorated paragraph with no shots or timestamps when duration is 8s or longer.
- Invent a second plot, a twist the user did not ask for, or extra characters "for cinematic value."
- Replace user camera language with a different move.
- Rebind dialogue to a different speaker.
- Pad with synonymous adjectives (cinematic, epic, stunning, masterpiece, 8k, highly detailed).
- Break timestamps (overlaps, gaps, sum not equal to duration).
- Change medium (live-action vs animation) unless the user did.
- Add a moral, logline, or "in a world where" frame around the prompt.

## Worked patterns

Load `references/worked-examples.md` when the request matches a category (intent-only premise, already-shot list, speech-led, animation, 30s multi-shot). Copy structure, not content.
