<script lang="ts">
	import Icon from "@lib/components/Icon.svelte";
	import { flagFilter } from "./state.svelte";

	const {
		onToggle,
		onMenu,
	}: {
		onToggle: () => void;
		/** Opens the menu of flags to filter by, under this anchor. */
		onMenu: (anchor: HTMLElement) => void;
	} = $props();

	const active = $derived(flagFilter.active);
	const label = $derived(
		active === null ? "Show only flagged transactions" : "Show all transactions again",
	);
	let wrap: HTMLElement;
</script>

<span class="ff" bind:this={wrap}>
	<button
		type="button"
		class="abt-btn abt-btn--sm abt-btn--ghost ff__main"
		class:is-active={active !== null}
		aria-pressed={active !== null}
		title={label}
		onclick={onToggle}
		oncontextmenu={(e) => {
			e.preventDefault();
			onMenu(wrap);
		}}
	>
		{#if active && active !== "any"}
			<span class="abt-emoji">{active}</span>
		{:else}
			<Icon name="flag" size={15} />
		{/if}
		<span>Flagged</span>
	</button>
	<button
		type="button"
		class="abt-btn abt-btn--sm abt-btn--ghost abt-btn--icon ff__more"
		class:is-active={active !== null}
		aria-label="Filter by one flag"
		title="Filter by one flag"
		onclick={() => onMenu(wrap)}
	>
		<Icon name="chevronDown" size={12} />
	</button>
</span>

<style>
	.ff {
		display: inline-flex;
		align-items: center;
	}

	.ff__main {
		--abt-emoji-size: var(--abt-text-sm);
	}

	.ff__more {
		margin-left: calc(-1 * var(--abt-space-1));
	}

	.is-active {
		border-color: var(--abt-accent-3) !important;
		background: var(--abt-accent-2) !important;
		color: var(--abt-accent-text) !important;
	}
</style>
