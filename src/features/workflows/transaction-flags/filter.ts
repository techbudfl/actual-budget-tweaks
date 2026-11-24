import { ACCOUNT_NAME, TRANSACTION_TABLE } from "@lib/actual-dom";
import { markFilterNames, setNamedFilter } from "@lib/actual/actual-api";
import { Page, matchesPage } from "@lib/actual/pages";
import { watchDom } from "@lib/dom/dom-watcher";
import { type Mounted, mountToNodeWithReturn } from "@lib/dom/svelte";
import { type Flag, filterName, filterOf, flagQuery } from "./data";
import FlagFilterButton from "./FlagFilterButton.svelte";
import FlagFilterMenu from "./FlagFilterMenu.svelte";
import { createPopover } from "./popover";
import { flagFilter } from "./state.svelte";

const OURS = "data-abt-flag-filter";

const TOOLBAR_SHAPE = "div:has(> div:empty):has(> div > input)";

/**
 * The account page's toolbar, as findAccountToolbar() in lib/actual/native-ui.ts finds it, but
 * also while a filter is applied: that one only looks at the header's last child, and applied
 * filters add their row of chips after the toolbar. A copy, so this tweak leaves the shared
 * helper as it is; the tidier way would be to fix that helper for everything that uses it.
 */
function flagsToolbar(): HTMLElement | null {
	const name = document.querySelector(ACCOUNT_NAME);
	for (let el = name?.parentElement; el?.parentElement; el = el.parentElement) {
		if (el !== el.parentElement.firstElementChild) {
			continue;
		}
		for (let child = el.parentElement.lastElementChild; child;) {
			if (child !== el && child.matches(TOOLBAR_SHAPE)) {
				return child as HTMLElement;
			}
			child = child.previousElementSibling;
		}
	}
	return null;
}

/** The account view's named filters that are ABT's flag filters, read off the table. */
function flagFilterNames(): string[] {
	markFilterNames();
	const raw = document.querySelector<HTMLElement>(TRANSACTION_TABLE)?.dataset.abtFilterNames;
	try {
		const names: unknown = JSON.parse(raw ?? "[]");
		return Array.isArray(names) ? names.filter((name) => filterOf(name) !== null) : [];
	} catch {
		return [];
	}
}

/**
 * A Flagged button in the account toolbar. It adds a filter chip to Actual's own filter bar, so
 * the chip's × removes it too, and it combines with other filters as any of Actual's does.
 */
export function startFlagFilter(): () => Promise<void> | undefined {
	let button: Mounted | null = null;
	const menu = createPopover();

	// Replaces any flag filter with this one; null takes them all off.
	function filterBy(flag: Flag | "any" | null) {
		menu.close();
		const add =
			flag === null
				? null
				: {
						customName: filterName(flag === "any" ? null : flag),
						queryFilter: flagQuery(flag === "any" ? null : flag),
					};
		void setNamedFilter(flagFilterNames(), add);
	}

	function openMenu(anchor: HTMLElement) {
		menu.open(
			FlagFilterMenu,
			{
				current: flagFilter.active,
				onPick: (flag: Flag | null) => filterBy(flag ?? "any"),
				onClear: () => filterBy(null),
			},
			anchor,
		);
	}

	function removeButton() {
		menu.close();
		button?.destroy();
		button = null;
	}

	function sync() {
		const toolbar = matchesPage(Page.Accounts) ? flagsToolbar() : null;
		if (!toolbar) {
			removeButton();
			flagFilter.active = null;
			return;
		}
		const active = filterOf(flagFilterNames()[0]);
		if (flagFilter.active !== active) {
			flagFilter.active = active;
		}
		if (button?.node.isConnected && button.node.parentElement === toolbar) {
			return;
		}
		removeButton();
		button = mountToNodeWithReturn(FlagFilterButton, {
			onToggle: () => filterBy(flagFilter.active ? null : "any"),
			onMenu: openMenu,
		});
		button.node.setAttribute(OURS, "");
		button.node.style.display = "contents";
		// With the actions, before Actual's empty flex spacer.
		const spacer = [...toolbar.children].find((c) => c.matches(":empty"));
		if (spacer) {
			spacer.before(button.node);
		} else {
			toolbar.append(button.node);
		}
	}

	const unwatch = watchDom(sync);
	sync();
	return () => {
		unwatch();
		removeButton();
		flagFilter.active = null;
		const names = flagFilterNames();
		return names.length ? setNamedFilter(names, null).then(() => undefined) : undefined;
	};
}
