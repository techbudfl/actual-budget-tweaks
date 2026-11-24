import type { Flag } from "./data";

/** The account view's flag filter: any flag, one flag, or none. */
export const flagFilter = $state<{ active: Flag | "any" | null }>({ active: null });
