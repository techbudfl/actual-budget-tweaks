<script lang="ts">
	import { FLAGS, type Flag } from "./data";

	const {
		current,
		onPick,
		onClear,
	}: {
		current: Flag | "any" | null;
		/** A flag to filter by, or null for any flag. */
		onPick: (flag: Flag | null) => void;
		onClear: () => void;
	} = $props();
</script>

<div class="fm" role="menu" aria-label="Filter by flag">
	<button
		type="button"
		role="menuitemradio"
		aria-checked={current === "any"}
		class="abt-btn abt-btn--sm abt-btn--ghost fm__any"
		class:is-active={current === "any"}
		onclick={() => onPick(null)}
	>
		Any flag
	</button>
	<div class="fm__grid">
		{#each FLAGS as flag (flag)}
			<button
				type="button"
				role="menuitemradio"
				aria-checked={current === flag}
				aria-label="Only {flag}"
				class="fm__flag"
				class:is-active={current === flag}
				onclick={() => onPick(flag)}
			>
				<span class="abt-emoji">{flag}</span>
			</button>
		{/each}
	</div>
	{#if current}
		<button
			type="button"
			role="menuitem"
			class="abt-btn abt-btn--sm abt-btn--ghost fm__any"
			onclick={onClear}
		>
			Show all
		</button>
	{/if}
</div>

<style>
	.fm {
		display: flex;
		flex-direction: column;
		gap: var(--abt-space-2);
		padding: var(--abt-space-3);
	}

	.fm__any {
		justify-content: center;
	}

	.fm__grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--abt-space-1);
		--abt-emoji-size: var(--abt-text-lg);
	}

	.fm__flag {
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 1;
		padding: var(--abt-space-2);
		border: 1px solid transparent;
		border-radius: var(--abt-radius-sm);
		background: none;
		cursor: pointer;
	}

	.fm__flag:hover {
		background: var(--abt-ink-3);
	}

	.fm__flag:focus-visible {
		outline: 2px solid var(--abt-accent-4);
		outline-offset: -2px;
	}

	.is-active {
		border-color: var(--abt-accent) !important;
		background: var(--abt-accent-1) !important;
	}
</style>
