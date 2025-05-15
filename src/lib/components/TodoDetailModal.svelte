<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { fade } from 'svelte/transition';
	import type { Todo } from '../types';
	import Button from './ui/Button.svelte';
	import Card from './ui/Card.svelte';
	import DifficultyStars from './DifficultyStars.svelte';
	import { Share2, X } from 'lucide-svelte';

	export let isOpen = false;
	export let todo: Todo | null = null;

	let showCopyTooltip = false;
	let tooltipMessage = '';
	let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

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

	async function handleShare() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			tooltipMessage = 'Copied!';
		} catch (err) {
			console.error('Failed to copy link:', err);
			tooltipMessage = 'Failed to copy!';
		}
		showCopyTooltip = true;
		if (tooltipTimeout) {
			clearTimeout(tooltipTimeout);
		}
		tooltipTimeout = setTimeout(() => {
			showCopyTooltip = false;
		}, 2000);
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
			<Card class="p-6 relative">
				<Button
					on:click={requestClose}
					variant="icon"
					icon={true}
					ariaLabel="Close modal"
					title="Close"
					class="absolute top-4 right-4"
				>
					<X size={24} />
				</Button>

				<h2 class="text-2xl font-semibold mb-2 text-white dark:text-dark-foreground pr-10">{todo.title}</h2>
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
				<div class="mt-6 flex justify-end items-center gap-2">
					<div class="relative">
						{#if showCopyTooltip}
							<span
								transition:fade={{ duration: 200 }}
								class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 z-10 whitespace-nowrap rounded bg-gray-700 dark:bg-dark-gray-100 px-2 py-1 text-xs text-white dark:text-dark-foreground shadow-md"
							>
								{tooltipMessage}
							</span>
						{/if}
						<Button
							on:click={handleShare}
							ariaLabel="Share task"
							title="Copy link"
							class="flex items-center gap-2"
						>
							<Share2 size={18} />
							<span>Share</span>
						</Button>
					</div>
				</div>
			</Card>
		</div>
	</div>
{/if} 