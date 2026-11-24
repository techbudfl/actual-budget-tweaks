<script lang="ts">
	import { FLAGS, type Flag } from "./data";

	const {
		current,
		count,
		onPick,
	}: {
		current: Flag | null;
		/** How many transactions the pick applies to. */
		count: number;
		onPick: (flag: Flag | null) => void;
	} = $props();
</script>

<div class="fp" role="menu" aria-label="Flag">
	{#if count > 1}
		<div class="fp__count">{count} transactions</div>
	{/if}
	<div class="fp__grid">
		{#each FLAGS as flag (flag)}
			<button
				type="button"
				role="menuitemradio"
				aria-checked={current === flag}
				class="fp__flag"
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
			class="abt-btn abt-btn--sm abt-btn--ghost fp__remove"
			onclick={() => onPick(null)}
		>
			Remove flag
		</button>
	{/if}
</div>

<style>
	.fp {
		display: flex;
		flex-direction: column;
		gap: var(--abt-space-2);
		padding: var(--abt-space-3);
	}

	.fp__count {
		font-size: var(--abt-text-xs);
		color: var(--abt-muted);
	}

	.fp__grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--abt-space-1);
		--abt-emoji-size: var(--abt-text-lg);
	}

	.fp__flag {
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

	.fp__flag:hover {
		background: var(--abt-ink-3);
	}

	.fp__flag:focus-visible {
		outline: 2px solid var(--abt-accent-4);
		outline-offset: -2px;
	}

	.fp__flag.is-active {
		border-color: var(--abt-accent);
		background: var(--abt-accent-1);
	}

	.fp__remove {
		justify-content: center;
	}
</style>
