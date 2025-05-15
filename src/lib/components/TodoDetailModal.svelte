<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Todo } from '../types';
	import Button from './ui/Button.svelte';
	import Card from './ui/Card.svelte';
    import { fade } from 'svelte/transition';
	export let todo: Todo | null = null;
	export let isOpen = false;

	const dispatch = createEventDispatcher<{close: void}>();

	function closeModal() {
		dispatch('close');
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}/${month}/${day}`;
	}
</script>

{#if isOpen && todo}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		on:click|self={closeModal}
        transition:fade={{duration: 150}}
	>
		<Card class="max-w-md w-full mx-4 p-6">
			<h2 class="text-2xl font-semibold mb-4 text-white dark:text-dark-foreground">{todo.title}</h2>
			<p class="text-sm text-white/70 dark:text-dark-gray-300 mb-2">
				Created at: {formatDate(todo.created_at)}
			</p>
			<p class="text-sm text-white/70 dark:text-dark-gray-300 mb-4">
				Status: {todo.completed ? 'Completed' : 'Pending'}
			</p>
			<div class="flex justify-end">
				<Button on:click={closeModal} variant="primary">Close</Button>
			</div>
		</Card>
	</div>
{/if} 