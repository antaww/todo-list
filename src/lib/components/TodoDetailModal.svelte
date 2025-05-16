<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Todo } from '$lib/types';
	import Button from '@components/ui/Button.svelte';
	import DifficultyStars from '@components/DifficultyStars.svelte';
	import { Edit2, Save, Share2, X } from 'lucide-svelte';
	import Dialog from '@components/ui/Dialog.svelte';
	import Input from '@components/ui/Input.svelte';
	import Textarea from '@components/ui/Textarea.svelte';
	import Markdown from '@components/ui/Markdown.svelte';
	import { tick, onMount, onDestroy } from 'svelte';
	import type { SvelteComponent } from 'svelte';

	export let isOpen = false;
	export let todo: Todo | null = null;

	// Event callback props
	export let onClose: (() => void) | undefined = undefined;
	export let onUpdateDescription: ((detail: { todo: Todo; description: string }) => void) | undefined = undefined;
	export let onUpdateDifficulty: ((detail: { todo: Todo; difficulty: number }) => void) | undefined = undefined;
	export let onUpdateTitle: ((detail: { todo: Todo; title: string }) => void) | undefined = undefined;

	let showCopyTooltip = false;
	let tooltipMessage = '';
	let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

	let isEditingTitle = false;
	let editableTitle = '';
	let titleInputInstance: SvelteComponent & { focus: () => void; } | null = null;

	let isEditingDescription = false;
	let editableDescription = '';
	let descriptionTextareaInstance: SvelteComponent & { focus: () => void; } | null = null;

	let descriptionEditorWrapper: HTMLDivElement;

	function handleClickOutsideDescription(event: MouseEvent) {
		if (isEditingDescription && descriptionEditorWrapper && !descriptionEditorWrapper.contains(event.target as Node)) {
			handleSaveDescription();
		}
	}

	$: {
		if (isEditingDescription) {
			tick().then(() => {
				document.addEventListener('click', handleClickOutsideDescription, true);
			});
			descriptionTextareaInstance?.focus();
		} else {
			document.removeEventListener('click', handleClickOutsideDescription, true);
		}
	}

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutsideDescription, true);
	});

	$: if (todo && !isEditingTitle) {
		editableTitle = todo.title;
	}

	$: if (isEditingTitle && todo) {
		tick().then(() => {
			titleInputInstance?.focus();
		});
	}

	$: if (todo && !isEditingDescription) {
		editableDescription = todo.description || '';
	}

	$: if (isEditingDescription && todo) {
		tick().then(() => {
			descriptionTextareaInstance?.focus();
		});
	}

	function requestClose() {
		if (onClose) {
			onClose();
		}
		isEditingTitle = false;
		isEditingDescription = false;
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

	function handleEditDescription() {
		if (!todo) return;
		editableDescription = todo.description || '';
		isEditingDescription = true;
	}

	function handleCancelEditDescription() {
		isEditingDescription = false;
		if (todo) {
			editableDescription = todo.description || '';
		}
	}

	function handleSaveDescription() {
		if (todo && onUpdateDescription) {
			if (editableDescription.trim() !== (todo.description || '').trim()) {
				onUpdateDescription({ todo, description: editableDescription.trim() });
			}
		}
		isEditingDescription = false;
	}

	function handleDescriptionTextareaKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && event.ctrlKey) {
			event.preventDefault();
			handleSaveDescription();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			handleCancelEditDescription();
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
		{#if isEditingDescription}
			<div class="mb-4" bind:this={descriptionEditorWrapper}>
				<h3 class="text-md font-semibold text-white dark:text-dark-foreground mb-2 flex items-center justify-between">
					Description
				</h3>
				<Textarea
					bind:this={descriptionTextareaInstance}
					bind:value={editableDescription}
					class="w-full min-h-[100px] text-sm"
					placeholder="Enter task description (Markdown supported)"
					rows={5}
					on:keydown={handleDescriptionTextareaKeydown}
				/>
				<div class="mt-3 flex justify-end gap-2">
					<Button variant="icon" onClick={handleCancelEditDescription} title="Cancel" class="border border-white/30 hover:bg-white/20 dark:hover:bg-dark-gray-100">
						<X size={16} class="mr-1 sm:mr-2"/> Cancel
					</Button>
					<Button variant="primary" onClick={handleSaveDescription} title="Save description" class="bg-green-500/80 hover:bg-green-600/90 border-green-500/30">
						<Save size={16} class="mr-3 sm:mr-2"/> Save
						<span class="ml-2 text-xs text-white/70 dark:text-dark-gray-300 hidden lg:block">(CTRL+Enter)</span>
					</Button>
				</div>
			</div>
		{:else if todo.description}
			<div class="mb-4" in:fade={{duration: 150}}>
				<h3 class="text-md font-semibold text-white dark:text-dark-foreground mb-1 flex items-center justify-between">
					Description
					<Button variant="icon" onClick={handleEditDescription} title="Edit description" class="p-1">
						<Edit2 size={16} />
					</Button>
				</h3>
				<div class="cursor-pointer hover:bg-black/10 dark:hover:bg-dark-gray-800/30 transition-all duration-150 p-0.5 rounded-lg min-h-[40px]"
				     on:click={handleEditDescription} title="Edit description">
					<Markdown content={todo.description} />
				</div>
			</div>
		{:else}
			<div class="mb-4" in:fade={{duration: 150}}>
				<Button variant="primary" onClick={handleEditDescription} class="w-full border border-white/30 hover:bg-white/20 dark:hover:bg-dark-gray-100 py-2.5">
					<Edit2 size={16} class="mr-2"/> Add Description
				</Button>
			</div>
		{/if}
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