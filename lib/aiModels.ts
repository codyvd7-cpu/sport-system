// ─── AI model configuration ────────────────────────────────────────────────────
// Every AI route previously hardcoded 'gpt-4o-mini' in its own file — seven
// copies of the same string. That made model changes a seven-file edit, and
// meant nobody could see at a glance what the app was actually running.
//
// It also mattered more than it looks: gpt-4o-mini is now a DEPRECATED model
// with a scheduled removal date. When it goes, every one of those routes
// fails at once, with no single place to fix it.
//
// Models are now chosen by TASK rather than named at each call site, so
// swapping a model is one line here, and the choice can be overridden per
// deployment without a code change.

/**
 * Cheap and fast. For short, formulaic text where the structure matters more
 * than the reasoning — a parent WhatsApp message, a summary line.
 */
export const MODEL_QUICK = process.env.AI_MODEL_QUICK || 'gpt-4.1-mini';

/**
 * Stronger reasoning. For output a coach will act on: session plans that must
 * respect load and match proximity, athlete summaries that interpret trends.
 * The cost difference is trivial at this volume and the quality gap is not.
 */
export const MODEL_REASONING = process.env.AI_MODEL_REASONING || 'gpt-4.1';

/**
 * Conversational assistant. Needs to follow context across a thread.
 */
export const MODEL_ASSISTANT = process.env.AI_MODEL_ASSISTANT || 'gpt-4.1-mini';

/**
 * Shared guardrails appended to every prompt.
 *
 * These are not stylistic preferences. This app generates text about named
 * schoolchildren that gets sent to parents, so a fabricated result or an
 * invented injury is a real problem rather than an inconvenience. None of
 * the original prompts said anything about not making things up.
 */
export const AI_GUARDRAILS = `
STRICT RULES:
- Use ONLY the information provided. Never invent fixtures, results, scores,
  dates, names or statistics. If something is missing, omit it rather than
  filling the gap.
- Never identify an individual athlete as injured, unavailable or
  underperforming in anything addressed to a group.
- These are school-age athletes. Keep training volumes, intensities and
  language age-appropriate.
- Do not give medical advice, diagnose injuries, or recommend return-to-play
  timelines. Defer to the school's medical process.
- Write plainly. No marketing language.`;
