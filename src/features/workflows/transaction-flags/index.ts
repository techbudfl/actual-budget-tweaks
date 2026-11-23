import { defineSetting } from "@features/types";
import { DATE_CELL, NEW_TRANSACTION, NOTES_CELL, TRANSACTION_ROW } from "@lib/actual-dom";
import {
	markRowNotes,
	query,
	refetchTransactions,
	selectedTransactions,
	send,
} from "@lib/actual/actual-api";
import { Page, matchesPage } from "@lib/actual/pages";
import { watchDom } from "@lib/dom/dom-watcher";
import { icon } from "@lib/icons";
import { isUuid } from "@lib/ids";
import { getValue, setValue, watchValue } from "@lib/store";
import { FLAG_ATTR, FLAG_CSS, FLAG_TAG_ATTR } from "./css";
import { DEFAULT_FLAG, type Flag, asFlag, clickedFlag, flagOf, withFlag } from "./data";
import { startFlagFilter } from "./filter";
import FlagPicker from "./FlagPicker.svelte";
import { createPopover } from "./popover";

/** The flag a click puts on, kept outside the setting's own key so it syncs as it changes. */
export const LAST_FLAG_KEY = "transaction-flags-last";

/** A transaction row the bridge has marked with its id and notes. */
const ROW = `${TRANSACTION_ROW}[data-abt-tx-id]`;
/** How long a flag just set shows before Actual's reloaded data is trusted again regardless. */
const PENDING_MS = 5000;
// The button's own events stop here, so Actual neither edits the date nor selects the row. Focus
// counts too: Actual's table opens a cell for editing when focus lands in its row.
const SWALLOWED = [
	"pointerdown",
	"mousedown",
	"mouseup",
	"click",
	"dblclick",
	"focusin",
	"focusout",
] as const;

/** Hides the pill Actual draws in the notes cell for a flag's tag, as the flag shows by the date. */
function hideFlagPills(row: Element) {
	for (const pill of row.querySelectorAll(`${NOTES_CELL} button`)) {
		const text = pill.textContent?.replace(/s/g, "") ?? "";
		const isFlag = text.startsWith("#") && asFlag(text) !== null;
		if (isFlag !== pill.hasAttribute(FLAG_TAG_ATTR)) {
			pill.toggleAttribute(FLAG_TAG_ATTR, isFlag);
		}
	}
}

function show(button: HTMLButtonElement, id: string, flag: Flag | null) {
	button.dataset.abtFlagId = id;
	const value = flag ?? "";
	if (button.getAttribute(FLAG_ATTR) === value && button.firstChild) {
		return;
	}
	const label = flag ? "Remove flag (right-click for others)" : "Flag (right-click to pick one)";
	button.setAttribute(FLAG_ATTR, value);
	button.setAttribute("aria-label", label);
	button.setAttribute("aria-pressed", String(!!flag));
	button.title = label;
	button.innerHTML = flag
		? `<span class="abt-emoji">${flag}</span>`
		: icon("flagOutline", { size: 13 });
}

export const transactionFlags = defineSetting({
	type: "checkbox",
	label: "Transaction flags",
	description:
		"Flag a transaction with a click beside its date; a Flagged button shows only those.",
	group: "Transactions",
	icon: "flag",
	writes: "Adds or removes the flag's tag (#🚩) in a transaction's notes when you click it.",
	context: {
		key: "transaction-flags",
		defaultValue: false,
	},
	css: () => FLAG_CSS,
	init: async () => {
		let lastFlag = asFlag(await getValue<unknown>(LAST_FLAG_KEY, DEFAULT_FLAG)) ?? DEFAULT_FLAG;
		const buttons = new Set<HTMLButtonElement>();
		let saving = false;
		const pending = new Map<string, { flag: Flag | null; at: number }>();
		const picker = createPopover();

		// A row that's part of a selection flags the whole selection, out-of-view rows included.
		async function targets(id: string): Promise<string[]> {
			const selected = await selectedTransactions().catch(() => [] as string[]);
			return selected.includes(id) ? selected.filter(isUuid) : [id];
		}

		async function applyFlag(ids: string[], flag: Flag | null) {
			if (saving) {
				return;
			}
			saving = true;
			try {
				const rows = await query("transactions", {
					filter: { id: { $oneof: ids } },
					select: ["id", "notes", "is_child"],
					options: { splits: "all" },
				});
				const updated = rows
					.filter((row) => !row.is_child)
					.map((row) => ({
						id: row.id,
						before: row.notes ?? null,
						notes: withFlag(row.notes, flag),
					}))
					.filter((row) => row.notes !== row.before)
					.map(({ id, notes }) => ({ id, notes }));
				if (flag && flag !== lastFlag) {
					lastFlag = flag;
					void setValue(LAST_FLAG_KEY, flag);
				}
				if (updated.length) {
					await send("transactions-batch-update", { updated });
					// Shown at once, until Actual's table has reloaded with the new notes.
					for (const { id } of updated) {
						pending.set(id, { flag, at: Date.now() });
					}
					scan();
					await refetchTransactions().catch(() => false);
				}
			} finally {
				saving = false;
			}
		}

		async function openPicker(button: HTMLButtonElement) {
			picker.close();
			const id = button.dataset.abtFlagId;
			if (!id) {
				return;
			}
			const ids = await targets(id);
			picker.open(
				FlagPicker,
				{
					current: asFlag(button.getAttribute(FLAG_ATTR)),
					count: ids.length,
					onPick: (flag: Flag | null) => {
						picker.close();
						void applyFlag(ids, flag);
					},
				},
				button,
			);
		}

		function onClick(e: MouseEvent) {
			const button = e.currentTarget as HTMLButtonElement;
			const id = button.dataset.abtFlagId;
			if (id) {
				const next = clickedFlag(asFlag(button.getAttribute(FLAG_ATTR)), lastFlag);
				void targets(id).then((ids) => applyFlag(ids, next));
			}
		}

		function onContextMenu(e: MouseEvent) {
			e.preventDefault();
			e.stopPropagation();
			void openPicker(e.currentTarget as HTMLButtonElement);
		}

		const swallow = (e: Event) => {
			e.stopPropagation();
			// A click shouldn't move focus off whatever Actual has focused.
			if (e.type === "mousedown") {
				e.preventDefault();
			}
		};

		function createButton(): HTMLButtonElement {
			const button = document.createElement("button");
			button.type = "button";
			for (const type of SWALLOWED) {
				button.addEventListener(type, swallow);
			}
			button.addEventListener("click", onClick);
			button.addEventListener("contextmenu", onContextMenu);
			buttons.add(button);
			return button;
		}

		function scan() {
			if (!matchesPage(Page.Accounts)) {
				return;
			}
			for (const button of buttons) {
				if (!button.isConnected) {
					buttons.delete(button);
				}
			}
			markRowNotes();
			const now = Date.now();
			for (const row of document.querySelectorAll<HTMLElement>(ROW)) {
				const id = row.dataset.abtTxId ?? "";
				const cell = row.querySelector<HTMLElement>(DATE_CELL);
				if (!cell || !isUuid(id) || row.closest(NEW_TRANSACTION)) {
					continue;
				}
				let button = cell.querySelector<HTMLButtonElement>(`:scope > [${FLAG_ATTR}]`);
				if (!button) {
					button = createButton();
					cell.append(button);
				}
				hideFlagPills(row);
				let flag = flagOf(row.dataset.abtNotes);
				const set = pending.get(id);
				if (set && set.flag !== flag && now - set.at < PENDING_MS) {
					flag = set.flag;
				} else {
					pending.delete(id);
				}
				show(button, id, flag);
			}
		}

		const unwatchDom = watchDom(scan);
		const unwatchValue = watchValue<unknown>(LAST_FLAG_KEY, (value) => {
			lastFlag = asFlag(value) ?? DEFAULT_FLAG;
		});
		scan();
		const stopFilter = startFlagFilter();

		return () => {
			unwatchDom();
			unwatchValue();
			picker.close();
			for (const button of buttons) {
				button.remove();
			}
			buttons.clear();
			for (const pill of document.querySelectorAll(`[${FLAG_TAG_ATTR}]`)) {
				pill.removeAttribute(FLAG_TAG_ATTR);
			}
			return stopFilter();
		};
	},
});
