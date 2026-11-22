/**
 * Shared motion vocabulary for the whole site.
 *
 * Every entrance, exit and hover animation in this project eases with the
 * same curve: a fast, confident start that settles gently — the "help
 * answers fast" feel. Defining it once keeps the personality consistent
 * and makes a future retune a one-line change instead of a hunt across
 * every component.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The emergency curtain uses its own steeper curve on purpose: a splash
 * lift should read as a stage curtain, not as content easing into place.
 * Kept here so the one exception is documented next to the default.
 */
export const CURTAIN_EASE = [0.76, 0, 0.24, 1] as const;
