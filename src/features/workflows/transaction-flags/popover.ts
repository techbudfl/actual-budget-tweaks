import { onOutsideClick, positionPopover } from "@lib/dom/popover";
import { type Mounted, mountToNodeWithReturn } from "@lib/dom/svelte";
import type { Component } from "svelte";

/** One popover at a time, opened under an anchor; outside clicks and Escape close it. */
export function createPopover() {
	let mounted: Mounted | null = null;
	let stopOutside: (() => void) | null = null;

	function onEscape(e: KeyboardEvent) {
		if (e.key === "Escape") {
			e.stopPropagation();
			close();
		}
	}

	function close() {
		stopOutside?.();
		stopOutside = null;
		mounted?.destroy();
		mounted = null;
		document.removeEventListener("keydown", onEscape, true);
	}

	function open<T extends Record<string, unknown>>(
		component: Component<T>,
		props: T,
		anchor: HTMLElement,
	) {
		close();
		mounted = mountToNodeWithReturn(component, props);
		const wrap = mounted.node;
		wrap.className = "abt-popover";
		wrap.style.position = "fixed";
		wrap.style.zIndex = "1000";
		document.body.append(wrap);
		positionPopover(wrap, anchor);
		stopOutside = onOutsideClick([wrap, anchor], close);
		document.addEventListener("keydown", onEscape, true);
		wrap.querySelector<HTMLButtonElement>("button")?.focus();
	}

	return { open, close };
}
