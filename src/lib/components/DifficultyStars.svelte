<script lang="ts">
	import { Star } from 'lucide-svelte';

	export let difficulty: number; // 0-10
	export let interactive = false;
	export let onUpdate: ((newDifficulty: number) => void) | null = null;
	export let size = 16;

	$: stars = Array.from({ length: 5 }, (_, i) => {
		const starValue = (i + 1) * 2;
		if (difficulty >= starValue) {
			return 'full';
		}
		if (difficulty >= starValue - 1) {
			return 'half';
		}
		return 'empty';
	});

	function handleClick(starIndex: number, event: MouseEvent) {
		if (!interactive || !onUpdate) return;

		const targetElement = event.currentTarget as HTMLElement;
		const rect = targetElement.getBoundingClientRect();
		const clickX = event.clientX - rect.left;
		const isLeftHalf = clickX < rect.width / 2;

		// Calculate the difficulty value if this star is half or full
		// For starIndex 0: half is 1, full is 2
		// For starIndex 1: half is 3, full is 4
		// etc.
		const targetDifficultyForHalf = starIndex * 2 + 1;
		const targetDifficultyForFull = starIndex * 2 + 2;

		let newDifficulty: number;

		if (isLeftHalf) {
			// Clicked left half
			if (difficulty === targetDifficultyForHalf) {
				// Already half, so make it empty (difficulty of previous star full, or 0 if first star)
				newDifficulty = starIndex * 2;
			} else {
				// Set to half
				newDifficulty = targetDifficultyForHalf;
			}
		} else {
			// Clicked right half
			if (difficulty === targetDifficultyForFull) {
				// Already full, so make it empty (difficulty of previous star full, or 0 if first star)
				newDifficulty = starIndex * 2;
			} else {
				// Set to full
				newDifficulty = targetDifficultyForFull;
			}
		}
		onUpdate(newDifficulty);
	}
</script>

<div class="flex items-center difficulty-stars-interaction-area" class:cursor-pointer={interactive} on:click|stopPropagation title="Click to set difficulty">
	{#each stars as fillType, i}
		<button
			type="button"
			class="focus:outline-none p-0.5 relative"
			aria-label={interactive ? `Set difficulty to ${i + 1} stars` : `${i + 1} star`}
			on:click|stopPropagation={(event) => handleClick(i, event)}
			disabled={!interactive}
		>
			{#if fillType === 'half'}
				<!-- Base Star (empty look) -->
				<Star
					{size}
					class="text-yellow-400 dark:text-yellow-500"
					fill="none"
					stroke="currentColor"
				/>
				<!-- Overlay Star (filled look, clipped to left 50%) -->
				<div
					class="absolute top-0.5 left-0.5 size-full overflow-hidden"
					style="clip-path: inset(0 55% 0 0);"
				>
					<Star
						{size}
						class="text-yellow-400 dark:text-yellow-500"
						fill="currentColor"
						stroke="currentColor"
					/>
				</div>
			{:else if fillType === 'full'}
				<Star
					{size}
					class="text-yellow-400 dark:text-yellow-500"
					fill="currentColor"
					stroke="currentColor"
				/>
			{:else} <!-- empty -->
				<Star
					{size}
					class="text-gray-400 dark:text-dark-gray-500"
					fill="none"
					stroke="currentColor"
				/>
			{/if}
		</button>
	{/each}
</div> 