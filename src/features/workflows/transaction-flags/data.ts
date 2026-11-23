/**
 * A flag is one of these emoji, kept in a transaction's notes as a tag ("#🚩"), so Actual's own
 * tag filters and rules see it and it outlives ABT as plain text. Other emoji tags aren't flags.
 */
export const FLAGS = ["🚩", "🟠", "🟡", "🟢", "🔵", "🟣", "⭐", "❓"] as const;
export type Flag = (typeof FLAGS)[number];
export const DEFAULT_FLAG: Flag = "🚩";

// Emoji keyboards may add the emoji presentation selector (U+FE0F); it doesn't change the flag.
const bare = (text: string) => text.replace(/️/g, "");

/** The flag this text names ("🚩", "#🚩"), or null. */
export function asFlag(value: unknown): Flag | null {
	if (typeof value !== "string") {
		return null;
	}
	const text = bare(value.trim()).replace(/^#/, "");
	return (FLAGS as readonly string[]).includes(text) ? (text as Flag) : null;
}

// A flag tag stands alone: after the start or a space, before a space, another tag, or the end.
const FLAG_TAG = new RegExp(`(^|\\s+)#(${FLAGS.join("|")})\\uFE0F?(?=\\s|#|$)`, "gu");

/** The first flag in a transaction's notes, or null. */
export function flagOf(notes: string | null | undefined): Flag | null {
	for (const match of (notes ?? "").matchAll(FLAG_TAG)) {
		return match[2] as Flag;
	}
	return null;
}

/**
 * The notes with any flag taken out and `flag` (if any) added at the end, as Actual's rules
 * append. A transaction keeps one flag, so setting one replaces the last. Null when nothing's left.
 */
export function withFlag(notes: string | null | undefined, flag: Flag | null): string | null {
	const text = notes ?? "";
	const unflagged = text.replace(FLAG_TAG, "");
	const kept = unflagged === text ? text : unflagged.trim();
	const next = flag ? (kept ? `${kept} #${flag}` : `#${flag}`) : kept;
	return next === "" ? null : next;
}

/** A click: a flagged transaction loses its flag, an unflagged one gets the last flag used. */
export const clickedFlag = (current: Flag | null, last: Flag): Flag | null =>
	current ? null : last;

/** The name of the filter ABT adds to the account view; Actual shows it as the filter's chip. */
export const FILTER_NAME = "Flagged";

/** The filter's chip name: "Flagged" for any flag, "Flagged 🔵" for one. */
export const filterName = (flag: Flag | null) => (flag ? `${FILTER_NAME} ${flag}` : FILTER_NAME);

/** Which flag a chip name filters by: a flag, "any", or null when it isn't one of ABT's. */
export function filterOf(name: unknown): Flag | "any" | null {
	if (name === FILTER_NAME) {
		return "any";
	}
	return typeof name === "string" && name.startsWith(`${FILTER_NAME} `)
		? asFlag(name.slice(FILTER_NAME.length + 1))
		: null;
}

/**
 * The query for transactions whose notes carry the flag, or any flag: the pattern Actual's own tag
 * filters use, as its $like normalises the text first, which emoji don't come through.
 */
export function flagQuery(flag: Flag | null): Record<string, unknown> {
	const flags = flag ?? `(${FLAGS.join("|")})`;
	return { notes: { $regexp: String.raw`(^|[^#])#${flags}\uFE0F?([\s#]|$)` } };
}
