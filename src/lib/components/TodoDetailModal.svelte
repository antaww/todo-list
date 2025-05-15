<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { Todo } from '../types';
	import Button from './ui/Button.svelte';
	import Card from './ui/Card.svelte';
	import DifficultyStars from './DifficultyStars.svelte';

	export let isOpen = false;
	export let todo: Todo | null = null;

	const dispatch = createEventDispatcher<{ 
		close: void;
		updateDifficulty: { todo: Todo; difficulty: number };
	}>();

	function requestClose() {
		dispatch('close');
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}/${month}/${day}`;
	}

	function handleUpdateDifficulty(newDifficulty: number) {
		if (todo) {
			dispatch('updateDifficulty', { todo, difficulty: newDifficulty });
		}
	}

	function handleContentClick(event: MouseEvent) {
		event.stopPropagation(); // Prevent click from reaching the backdrop
	}
</script>

{#if isOpen && todo}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		on:click={requestClose}
		transition:fade={{ duration: 150 }}
	>
		<div class="max-w-md w-full mx-4" on:click={handleContentClick}>
			<Card class="p-6">
				<h2 class="text-2xl font-semibold mb-2 text-white dark:text-dark-foreground">{todo.title}</h2>
				{#if todo.difficulty !== undefined}
					<div class="mb-3">
						<DifficultyStars difficulty={todo.difficulty} interactive={true} onUpdate={handleUpdateDifficulty} size={20} />
					</div>
				{/if}
				<p class="text-sm text-white/70 dark:text-dark-gray-300 mb-2">
					Created at: {formatDate(todo.created_at)}
				</p>
				<p class="text-sm text-white/70 dark:text-dark-gray-300 mb-4">
					Status: {todo.completed ? 'Completed' : 'Pending'}
				</p>
				<div class="flex justify-end">
					<Button on:click={requestClose} variant="primary">Close</Button> 
				</div>
			</Card>
		</div>
	</div>
{/if} 