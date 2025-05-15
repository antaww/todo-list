<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Todo } from '../types';
	import Button from './ui/Button.svelte';
	import DifficultyStars from './DifficultyStars.svelte';
	import { Share2 } from 'lucide-svelte';
	import Dialog from './ui/Dialog.svelte';

	export let isOpen = false;
	export let todo: Todo | null = null;

	// Event callback props
	export let onClose: (() => void) | undefined = undefined;
	export let onUpdateDifficulty: ((detail: { todo: Todo; difficulty: number }) => void) | undefined = undefined;

	let showCopyTooltip = false;
	let tooltipMessage = '';
	let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

	function requestClose() {
		if (onClose) {
			onClose();
		}
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}/${month}/${day}`;
	}

	function handleUpdateDifficulty(newDifficulty: number) {
		if (todo && onUpdateDifficulty) {
			onUpdateDifficulty({ todo, difficulty: newDifficulty });
		}
	}

	async function handleShare() {
		if (!todo) return;
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
</script>

<Dialog
	open={isOpen && !!todo}
	onCancel={requestClose}
	showCloseButton={true}
	confirmLabel=""
	cancelLabel=""
>
	<div slot="title">
		{#if todo}
			<h2 class="text-2xl font-semibold text-white dark:text-dark-foreground">{todo.title}</h2>
		{/if}
	</div>

	{#if todo}
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
	{/if}

	<div slot="footer">
		{#if todo}
			<div class="flex justify-end items-center w-full">
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
		{/if}
	</div>
</Dialog> 