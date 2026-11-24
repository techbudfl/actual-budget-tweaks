import { desktopOnly } from "@lib/actual/pages";
import { DATE_CELL, TRANSACTION_ROW } from "@lib/actual-dom";

/** The flag button ABT adds to a transaction's date cell; set to the flag while it has one. */
export const FLAG_ATTR = "data-abt-flag";
/** Actual's pill for a flag's tag in the notes cell, hidden as the flag shows beside the date. */
export const FLAG_TAG_ATTR = "data-abt-flag-tag";
/** The Remove flag item ABT adds to Actual's menu for selected transactions. */
export const MENU_ITEM_ATTR = "data-abt-flag-menu-item";

const ROW = TRANSACTION_ROW;

export const FLAG_CSS = desktopOnly(`
	/* Floats over the date cell's right end, so Actual's own layout is left alone. */
	[${FLAG_ATTR}] {
		position: absolute;
		top: 0;
		bottom: 0;
		right: var(--abt-space-1);
		z-index: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 20px; /* raw: square hit area around a 13px glyph */
		height: 20px; /* raw: square hit area around a 13px glyph */
		margin: auto 0;
		padding: 0;
		border: none;
		border-radius: var(--abt-radius-sm);
		background: none;
		color: var(--abt-muted);
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.1s, background-color 0.1s;
		--abt-emoji-size: var(--abt-text-sm);
	}

	${ROW}:hover [${FLAG_ATTR}] {
		opacity: 0.6;
	}

	[${FLAG_ATTR}]:not([${FLAG_ATTR}=""]),
	${ROW}:hover [${FLAG_ATTR}]:hover,
	[${FLAG_ATTR}]:focus-visible {
		opacity: 1;
	}

	[${FLAG_ATTR}]:hover {
		background: var(--abt-ink-3);
	}

	[${FLAG_ATTR}]:focus-visible {
		outline: 2px solid var(--abt-accent-4);
		outline-offset: -2px;
	}

	/* Out of the way while the date is being edited. */
	${DATE_CELL}:focus-within > [${FLAG_ATTR}] {
		display: none;
	}

	[${FLAG_TAG_ATTR}] {
		display: none !important;
	}

	/* Actual hovers its menu items from React state; this one is ABT's, so CSS does it. */
	[${MENU_ITEM_ATTR}]:hover {
		background-color: var(--color-menuItemBackgroundHover) !important;
		color: var(--color-menuItemTextHover) !important;
	}
`);
