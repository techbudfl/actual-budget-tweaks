import { SELECTED_TRANSACTIONS_MENU } from "@lib/actual-dom";
import { markMenuKeys, query, selectedTransactions } from "@lib/actual/actual-api";
import { Page, matchesPage } from "@lib/actual/pages";
import { watchDom } from "@lib/dom/dom-watcher";
import { isUuid } from "@lib/ids";
import { MENU_ITEM_ATTR } from "./css";
import { flagOf } from "./data";

/** Of these transactions, the ones with a flag (split children are never flagged). */
async function flaggedOf(ids: string[]): Promise<string[]> {
	if (!ids.length) {
		return [];
	}
	const rows = await query("transactions", {
		filter: { id: { $oneof: ids } },
		select: ["id", "notes", "is_child"],
		options: { splits: "all" },
	});
	return rows.filter((row) => !row.is_child && flagOf(row.notes)).map((row) => row.id);
}

/**
 * Built from Actual's own Delete item, so it has the same size and type; Actual draws its hover
 * from React state, so ours gets it from CSS (css.ts).
 */
function menuItem(like: HTMLElement, label: string, onPick: () => void): HTMLButtonElement {
	const item = like.cloneNode(false) as HTMLButtonElement;
	for (const attr of [...item.attributes]) {
		if (attr.name === "id" || attr.name.startsWith("data-") || attr.name.startsWith("aria-")) {
			item.removeAttribute(attr.name);
		}
	}
	item.type = "button";
	item.setAttribute(MENU_ITEM_ATTR, "");
	item.setAttribute("role", "menuitem");
	const text =
		(like.querySelector("span")?.cloneNode(false) as HTMLElement) ?? document.createElement("span");
	text.textContent = label;
	const spacer = document.createElement("div");
	spacer.style.flex = "1";
	item.append(text, spacer);
	// Actual's own items act on press; this one's events stop here, so Actual's menu doesn't see them.
	for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"]) {
		item.addEventListener(type, (e) => e.stopPropagation());
	}
	item.addEventListener("click", (e) => {
		e.stopPropagation();
		onPick();
	});
	return item;
}

// Actual's popover closes on Escape, as after picking one of its own items.
function closeMenu(menu: Element) {
	menu.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
}

/**
 * Adds "Remove flag" after Delete in the menu for selected transactions, while any of them has a
 * flag. It removes the flag from all of them, rows scrolled out of view included.
 */
export function startRemoveFlagItem(removeFlags: (ids: string[]) => Promise<void>): () => void {
	// Menus already looked at; a menu opened again is a new element.
	const seen = new WeakSet<Element>();

	async function decorate(menu: Element) {
		markMenuKeys();
		const remove = menu.querySelector<HTMLElement>('button[data-abt-menu-key="delete"]');
		if (!remove) {
			return;
		}
		const flagged = await flaggedOf((await selectedTransactions().catch(() => [])).filter(isUuid));
		if (!flagged.length || !remove.isConnected || menu.querySelector(`[${MENU_ITEM_ATTR}]`)) {
			return;
		}
		remove.after(
			menuItem(remove, "Remove flag", () => {
				closeMenu(menu);
				void removeFlags(flagged);
			}),
		);
	}

	function scan() {
		if (!matchesPage(Page.Accounts)) {
			return;
		}
		const menu = document.querySelector(SELECTED_TRANSACTIONS_MENU);
		if (menu && !seen.has(menu)) {
			seen.add(menu);
			void decorate(menu).catch(() => undefined);
		}
	}

	const unwatch = watchDom(scan);
	scan();
	return () => {
		unwatch();
		for (const item of document.querySelectorAll(`[${MENU_ITEM_ATTR}]`)) {
			item.remove();
		}
	};
}
