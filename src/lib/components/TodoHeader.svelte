<script lang="ts">
	import {Loader2, Star} from 'lucide-svelte';
	import {createEventDispatcher} from 'svelte';
	import {favoritesStore} from '../stores/favorites';
	import Button from './ui/Button.svelte';
	import Input from './ui/Input.svelte';

	export let title = '';
	export let listId = '';

	const dispatch = createEventDispatcher<{
		updateTitle: string,
		startEdit: void,
		stopEdit: void,
		toggleFavorite: void,
	}>();

	$: isFavorite = $favoritesStore.some(f => f.id === listId);

	function handleBlur() {
		dispatch('stopEdit');
		if (title.trim() !== '') {
			dispatch('updateTitle', title);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			(event.currentTarget as HTMLInputElement).blur();
		}
	}

	function toggleFavorite() {
		dispatch('toggleFavorite');
	}

	let loadingPlaceholder = '';
	$: loadingPlaceholder = title === '' ? 'Loading...' : '';
</script>

<!-- En-tête de la todo list avec le titre éditable -->
<div class="sm:mb-4 flex gap-1 sm:gap-2 items-center">
	<Button
		class="!text-yellow-400"
		icon={true}
		on:click={toggleFavorite}
		title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
		variant="icon"
	>
		<Star class="block" fill={isFavorite ? 'currentColor' : 'none'} size={20}/>
	</Button>

	<div class="flex-grow">
		<Input
			bind:value={title}
			class="flex-grow text-lg"
			leftIcon={title === '' ? Loader2 : null}
			on:blur={handleBlur}
			on:focus={() => dispatch('startEdit')}
			on:keydown={handleKeydown}
			placeholder={loadingPlaceholder}
			variant="title"
		/>
	</div>
</div>

<style>
	:global(.loader-icon) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
