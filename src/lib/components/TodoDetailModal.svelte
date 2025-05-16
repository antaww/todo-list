<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Todo } from '../types';
	import Button from './ui/Button.svelte';
	import DifficultyStars from './DifficultyStars.svelte';
	import { Share2 } from 'lucide-svelte';
	import Dialog from './ui/Dialog.svelte';
	import Input from './ui/Input.svelte';
	import { tick } from 'svelte';
	import type { SvelteComponent } from 'svelte';

	export let isOpen = false;
	export let todo: Todo | null = null;

	// Event callback props
	export let onClose: (() => void) | undefined = undefined;
	export let onUpdateDifficulty: ((detail: { todo: Todo; difficulty: number }) => void) | undefined = undefined;
	export let onUpdateTitle: ((detail: { todo: Todo; title: string }) => void) | undefined = undefined;

	let showCopyTooltip = false;
	let tooltipMessage = '';
	let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;
	let isEditingTitle = false;
	let editableTitle = '';
	let titleInputInstance: SvelteComponent & { focus: () => void; } | null = null;

	$: if (todo && !isEditingTitle) {
		editableTitle = todo.title;
	}

	$: if (isEditingTitle && todo) {
		tick().then(() => {
			titleInputInstance?.focus();
		});
	}

	function requestClose() {
		if (onClose) {
			onClose();
		}
		isEditingTitle = false; // Reset edit mode on close
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

	function handleEditTitle() {
		if (!todo) return;
		editableTitle = todo.title;
		isEditingTitle = true;
	}

	function handleCancelEditTitle() {
		isEditingTitle = false;
		if (todo) {
			editableTitle = todo.title; // Reset to original title
		}
	}

	function handleSaveTitle() {
		if (todo && onUpdateTitle && editableTitle.trim() && editableTitle.trim() !== todo.title) {
			onUpdateTitle({ todo, title: editableTitle.trim() });
		}
		isEditingTitle = false;
	}

	function handleTitleInputKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			handleSaveTitle();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			handleCancelEditTitle();
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
	size="large"
>
	<div slot="title" class="w-full mr-3">
		{#if todo}
			{#if isEditingTitle}
				<div class="flex items-center gap-2 flex-1 w-full">
					<Input
						bind:this={titleInputInstance}
						bind:value={editableTitle}
						placeholder="Todo title"
						class="w-full"
						onBlur={handleSaveTitle}
						onKeydown={handleTitleInputKeydown}
					/>
				</div>
			{:else}
				<div class="flex items-center gap-2 cursor-pointer" on:click={handleEditTitle} title="Edit title">
					<h2 class="text-xl font-semibold text-white dark:text-dark-foreground break-all">{todo.title}</h2>
				</div>
			{/if}
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
		<div class="flex justify-between items-center w-full">
			<div class="flex items-center gap-2 relative">
				<Button variant="icon" onClick={handleShare} title="Copy link to this task">
					<Share2 size={18} />
				</Button>
				{#if showCopyTooltip}
					<div transition:fade={{duration: 150}} class="absolute left-full ml-2 px-2 py-1 bg-gray-700 text-white text-xs rounded shadow-lg">
						{tooltipMessage}
					</div>
				{/if}
			</div>
		</div>
	</div>
</Dialog> 