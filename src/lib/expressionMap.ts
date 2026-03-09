/**
 * expressionMap.ts
 *
 * Maps MetaPet game state onto one of the 27 expression SVG files.
 * Priority waterfall: critical states first, personality/form states last.
 */

import type { EyeEmotion } from "@/components/auralia/EyeSystem";
import type { FormKey } from "@/components/auralia/types";
import type { ExpandedEmotionalState } from "../../shared/auralia/guardianBehavior";

export interface ExpressionContext {
  eyeEmotion: EyeEmotion;
  expandedState: ExpandedEmotionalState | null;
  activeForm: FormKey;
  health: number;
  energy: number;
  bond: number;
  curiosity: number;
  annoyanceLevel: number;
  aiMode: string;
}

/**
 * All 27 expression SVG filenames, typed for safety.
 */
export type ExpressionSvg =
  | "01_happy.svg"
  | "02_sad.svg"
  | "03_angry.svg"
  | "04_surprised.svg"
  | "05_sleepy.svg"
  | "06_love.svg"
  | "07_cool.svg"
  | "08_king.svg"
  | "09_angel.svg"
  | "10_thinking.svg"
  | "11_evil.svg"
  | "12_energetic.svg"
  | "13_confused.svg"
  | "14_shocked.svg"
  | "15_proud.svg"
  | "16_shy.svg"
  | "17_bored.svg"
  | "18_star.svg"
  | "19_ninja.svg"
  | "20_frozen.svg"
  | "21_fire.svg"
  | "22_ghost.svg"
  | "23_rich.svg"
  | "24_sick.svg"
  | "25_dead.svg"
  | "26_happy_gold.svg"
  | "27_mysterious.svg";

/**
 * Public path prefix — SVGs live at /metapet_svgs/<filename>
 */
export const EXPRESSION_SVG_PATH = "/metapet_svgs/";

/**
 * Derive the active expression SVG from current pet state.
 *
 * Priority order (highest → lowest):
 *  1. Dead (health = 0)
 *  2. Sick (health < 30)
 *  3. Frozen / extreme exhaustion (energy < 10)
 *  4. Grumpy / angry (annoyanceLevel > 80 OR eyeEmotion grumpy)
 *  5. Scared / shocked (eyeEmotion scared → shocked; surprised → surprised)
 *  6. Sleepy (eyeEmotion sleepy OR meditation form)
 *  7. Confused (eyeEmotion confused)
 *  8. Ecstatic / fire (expandedState ecstatic OR wild form)
 *  9. Affectionate / love (expandedState affectionate)
 * 10. Melancholic / sad (expandedState melancholic)
 * 11. Mischievous / evil (expandedState mischievous)
 * 12. Transcendent / mysterious (expandedState transcendent)
 * 13. Celestial + high bond → gold happy (celestial form + bond > 80)
 * 14. Rich (sage form + bond > 70)  →  king
 * 15. Sage form → angel
 * 16. Vigilant form → king
 * 17. Very high bond + content eyes → happy_gold
 * 18. High bond → happy
 * 19. Playful / star eyes → energetic
 * 20. Contemplative / thinking
 * 21. Focused / cool
 * 22. Protective / proud
 * 23. Restless / bored
 * 24. Withdrawn / shy
 * 25. Yearning → ninja
 * 26. Overwhelmed → ghost
 * 27. Curious → energetic
 * 28. Normal + decent stats → star / happy
 * 29. Fallback → happy
 */
export function getExpressionSvg(ctx: ExpressionContext): ExpressionSvg {
  const {
    eyeEmotion,
    expandedState,
    activeForm,
    health,
    energy,
    bond,
    curiosity,
    annoyanceLevel,
  } = ctx;

  // ── Critical health states ──────────────────────────────────────────────
  if (health <= 0) return "25_dead.svg";
  if (health < 30) return "24_sick.svg";

  // ── Extreme exhaustion ──────────────────────────────────────────────────
  if (energy < 10) return "20_frozen.svg";

  // ── Anger / annoyance ──────────────────────────────────────────────────
  if (annoyanceLevel > 80 || eyeEmotion === "grumpy") return "03_angry.svg";

  // ── Fear / shock ────────────────────────────────────────────────────────
  if (eyeEmotion === "scared") return "14_shocked.svg";
  if (eyeEmotion === "surprised") return "04_surprised.svg";

  // ── Sleep / rest ────────────────────────────────────────────────────────
  if (eyeEmotion === "sleepy" || activeForm === "meditation")
    return "05_sleepy.svg";

  // ── Confusion ───────────────────────────────────────────────────────────
  if (eyeEmotion === "confused") return "13_confused.svg";

  // ── GBSP expanded emotional states ─────────────────────────────────────
  if (expandedState === "ecstatic" || activeForm === "wild")
    return "21_fire.svg";
  if (expandedState === "affectionate") return "06_love.svg";
  if (expandedState === "melancholic") return "02_sad.svg";
  if (expandedState === "mischievous") return "11_evil.svg";
  if (expandedState === "transcendent") return "27_mysterious.svg";
  if (expandedState === "overwhelmed") return "22_ghost.svg";
  if (expandedState === "yearning") return "19_ninja.svg";
  if (expandedState === "contemplative") return "10_thinking.svg";
  if (expandedState === "protective") return "15_proud.svg";
  if (expandedState === "withdrawn") return "16_shy.svg";
  if (expandedState === "restless") return "17_bored.svg";

  // ── Form-based states ───────────────────────────────────────────────────
  if (activeForm === "celestial" && bond > 80) return "26_happy_gold.svg";
  if (activeForm === "sage") return "09_angel.svg";
  if (activeForm === "vigilant") return "08_king.svg";

  // ── Stat-driven expressions ─────────────────────────────────────────────
  if (bond > 85) return "26_happy_gold.svg";
  if (bond > 70 && eyeEmotion === "content") return "01_happy.svg";

  if (eyeEmotion === "playful" || (energy > 70 && curiosity > 70))
    return "12_energetic.svg";
  if (eyeEmotion === "focused") return "07_cool.svg";
  if (eyeEmotion === "curious" || curiosity > 70) return "12_energetic.svg";

  // ── Wealth / richness (very high bond + energy) ─────────────────────────
  if (bond > 60 && energy > 60) return "18_star.svg";

  // ── Default happy ───────────────────────────────────────────────────────
  return "01_happy.svg";
}

/**
 * Full public URL for an expression SVG.
 */
export function getExpressionSvgUrl(svg: ExpressionSvg): string {
  return `${EXPRESSION_SVG_PATH}${svg}`;
}
