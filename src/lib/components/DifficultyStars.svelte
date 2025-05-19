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

		// Pour chaque étoile, on a 3 états : 0 (vide), 0.5 (moitié), 1 (pleine)
		// difficulty va de 0 à 10 (par pas de 1)
		// Pour l'étoile i (0 à 4) :
		//   - 0   : difficulty < i*2 + 1
		//   - 0.5 : difficulty == i*2 + 1
		//   - 1   : difficulty == i*2 + 2

		const halfValue = starIndex * 2 + 1;
		const fullValue = starIndex * 2 + 2;
		let newDifficulty: number;

		if (difficulty < halfValue) {
			// Actuellement vide, passe à moitié
			newDifficulty = halfValue;
		} else if (difficulty === halfValue) {
			// Actuellement moitié, passe à pleine
			newDifficulty = fullValue;
		} else if (difficulty === fullValue) {
			// Actuellement pleine, passe à vide (ou à la dernière étoile pleine précédente)
			// Si c'est la première étoile, on met à 0
			if (starIndex === 0) {
				newDifficulty = 0;
			} else {
				// On met la difficulté à la dernière étoile pleine précédente
				newDifficulty = starIndex * 2;
			}
		} else {
			// Si la difficulté est entre deux états (ex: 3), on la ramène à moitié
			newDifficulty = halfValue;
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