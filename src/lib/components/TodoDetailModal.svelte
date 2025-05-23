<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Todo } from '$lib/types';
	import Button from '@components/ui/Button.svelte';
	import Checkbox from '@components/ui/Checkbox.svelte';
	import DifficultyStars from '@components/DifficultyStars.svelte';
	import { Edit2, Save, Share2, X } from 'lucide-svelte';
	import Dialog from '@components/ui/Dialog.svelte';
	import Input from '@components/ui/Input.svelte';
	import Markdown from '@components/ui/Markdown.svelte';
	import { tick, onMount, onDestroy } from 'svelte';
	import type { SvelteComponent } from 'svelte';

	import { Carta, MarkdownEditor } from 'carta-md';
	import 'carta-md/default.css';
	import { code } from '@cartamd/plugin-code';
	import '@cartamd/plugin-code/default.css';
	import DOMPurify from 'isomorphic-dompurify';

	export let isOpen = false;
	export let todo: Todo | null = null;

	// Event callback props
	export let onClose: (() => void) | undefined = undefined;
	export let onUpdateDescription: ((detail: { todo: Todo; description: string }) => void) | undefined = undefined;
	export let onUpdateDifficulty: ((detail: { todo: Todo; difficulty: number }) => void) | undefined = undefined;
	export let onUpdateTitle: ((detail: { todo: Todo; title: string }) => void) | undefined = undefined;
	export let onToggle: ((item: Todo) => void) | undefined = undefined;

	let showCopyTooltip = false;
	let tooltipMessage = '';
	let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

	let isEditingTitle = false;
	let editableTitle = '';
	let titleInputInstance: SvelteComponent & { focus: () => void; } | null = null;

	let isEditingDescription = false;
	let editableDescription = '';
	let descriptionEditorWrapper: HTMLDivElement;

	// Logic for checkbox state and toggling, similar to TodoItem.svelte
	let internalCompleted = todo?.completed ?? false;
	let previousCompleted = internalCompleted;

	// Update internalCompleted when the todo prop changes (e.g., from store update or new todo in modal)
	$: if (todo) {
		previousCompleted = internalCompleted;
		internalCompleted = todo.completed;
	}

	// When user clicks checkbox, internalCompleted changes via bind:checked.
	// If it's different from the previous state, call onToggle.
	$: if (todo && onToggle && internalCompleted !== previousCompleted) {
		onToggle(todo);
	}

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

	const carta = new Carta({
		sanitizer: DOMPurify.sanitize,
		extensions: [code()],
		theme: 'github-dark'
	});

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
	<div slot="title" class="w-full mr-3 relative">
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
				<div class="flex items-center gap-2 cursor-pointer group/title mr-2" title="Edit title">
					<div class="mr-2.5 flex-shrink-0" on:click|stopPropagation on:keydown|stopPropagation>
						<Checkbox bind:checked={internalCompleted} size="h-6 w-6" />
					</div>
					<h2 class="text-xl font-semibold text-white dark:text-dark-foreground break-all {todo?.completed ? 'line-through text-white/60 dark:text-dark-gray-400' : ''}" on:click={handleEditTitle}>{todo?.title}</h2>
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
				<div class="carta-wrapper border border-white/20 dark:border-dark-gray-600 rounded-md">
					<MarkdownEditor bind:value={editableDescription} {carta} placeholder="Enter task description (Markdown supported)" />
				</div>
				<div class="mt-3 flex justify-end gap-2">
					<Button variant="icon" onClick={handleCancelEditDescription} title="Cancel" class="border border-white/30 hover:bg-white/20 dark:hover:bg-dark-gray-100">
						<X size={16} class="mr-1 sm:mr-2"/> Cancel
					</Button>
					<Button variant="primary" onClick={handleSaveDescription} title="Save description" class="bg-green-500/80 hover:bg-green-600/90 border-green-500/30">
						<Save size={16} class="mr-1 sm:mr-2"/> Save
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
			<div class="mb-4 py-3 px-2 -mx-2 rounded-md hover:bg-white/5 dark:hover:bg-dark-gray-700/40 transition-colors duration-150 cursor-pointer group/add-desc"
			     on:click={handleEditDescription} title="Add description" in:fade={{duration: 150}}>
				<div class="flex items-center text-white/60 dark:text-dark-gray-400 group-hover/add-desc:text-white dark:group-hover/add-desc:text-dark-foreground transition-colors">
					<Edit2 size={18} class="mr-2.5 flex-shrink-0"/>
					<span class="text-sm font-medium">Add a description for this task</span>
				</div>
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

<style>
  
</style>
