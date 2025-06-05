<script lang="ts">
	import { fade } from "svelte/transition";
	import type { Todo } from "$lib/types";
	import Button from "@components/ui/Button.svelte";
	import Checkbox from "@components/ui/Checkbox.svelte";
	import DifficultyStars from "@components/DifficultyStars.svelte";
	import { Edit2, Save, Share2, X, ZapOff, ChevronUp, ChevronsUp, Flame, ChevronDown } from "lucide-svelte";
	import Dialog from "@components/ui/Dialog.svelte";
	import Input from "@components/ui/Input.svelte";
	import Markdown from "@components/ui/Markdown.svelte";
	import { tick, onMount, onDestroy } from "svelte";
	import type { SvelteComponent } from "svelte";
	import PrioritySelector from '@components/PrioritySelector.svelte';

	import { Carta, MarkdownEditor } from "carta-md";
	import "carta-md/default.css";
	import { code } from "@cartamd/plugin-code";
	import "@cartamd/plugin-code/default.css";
	import DOMPurify from "isomorphic-dompurify";

	export let isOpen = false;
	export let todo: Todo | null = null;

	// Event callback props
	export let onClose: (() => void) | undefined = undefined;
	export let onUpdateDescription: ((detail: { todo: Todo; description: string }) => void) | undefined = undefined;
	export let onUpdateDifficulty: ((detail: { todo: Todo; difficulty: number }) => void) | undefined = undefined;
	export let onUpdateTitle: ((detail: { todo: Todo; title: string }) => void) | undefined = undefined;
	export let onUpdateAssignedTo: ((detail: { todo: Todo; assignedTo: string }) => void) | undefined = undefined;
	export let onUpdatePriority: ((detail: { todo: Todo; priority: number }) => void) | undefined = undefined;
	export let onToggle: ((item: Todo) => void) | undefined = undefined;

	let showCopyTooltip = false;
	let tooltipMessage = "";
	let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;

	let isEditingTitle = false;
	let editableTitle = "";
	let titleInputInstance: (SvelteComponent & { focus: () => void }) | null = null;

	let isEditingDescription = false;
	let editableDescription = "";
	let descriptionEditorWrapper: HTMLDivElement;

	let isEditingAssignedTo = false;
	let editableAssignedTo = "";
	let assignedToInputInstance: (SvelteComponent & { focus: () => void }) | null = null;

	let displayDifficulty: number = 0;

	// Logic for checkbox state and toggling, reflecting todo.status
	let internalStatusIsDone = todo?.status === "Done";
	let previousStatusIsDone = internalStatusIsDone; // Initialize previous with the current state

	// Update internalStatusIsDone when the todo prop changes (e.g., from store update or new todo in modal)
	// This ensures the checkbox reflects the true state of the todo item.
	$: if (todo) {
		displayDifficulty = todo.difficulty ?? 0;
		// Update previousStatusIsDone *before* internalStatusIsDone is potentially changed by the new todo prop.
		// This is crucial to prevent onToggle from firing just because the todo prop changed.
		previousStatusIsDone = internalStatusIsDone;
		internalStatusIsDone = todo.status === "Done";
		// After internalStatusIsDone reflects the new todo.status, update previousStatusIsDone again
		// so that the next actual user interaction with the checkbox is compared against the correct previous state.
		previousStatusIsDone = internalStatusIsDone;
	}

	// When user clicks the checkbox in the modal, internalStatusIsDone changes via bind:checked.
	// This reactive block then calls onToggle if the new bound state is different from its previous state.
	$: if (todo && onToggle && internalStatusIsDone !== previousStatusIsDone) {
		onToggle(todo);
		// After toggling, ensure previousStatusIsDone matches the new state for the next comparison
		previousStatusIsDone = internalStatusIsDone;
	}

	function handleClickOutsideDescription(event: MouseEvent) {
		if (isEditingDescription && descriptionEditorWrapper && !descriptionEditorWrapper.contains(event.target as Node)) {
			handleSaveDescription();
		}
	}

	$: {
		if (isEditingDescription) {
			tick().then(() => {
				document.addEventListener("click", handleClickOutsideDescription, true);
			});
		} else {
			document.removeEventListener("click", handleClickOutsideDescription, true);
		}
	}

	onDestroy(() => {
		document.removeEventListener("click", handleClickOutsideDescription, true);
	});

	$: if (todo && !isEditingTitle) {
		editableTitle = todo.title;
	}

	$: if (todo && !isEditingAssignedTo) {
		editableAssignedTo = todo.assigned_to || "";
	}

	$: if (isEditingTitle && todo) {
		tick().then(() => {
			titleInputInstance?.focus();
		});
	}

	$: if (todo && !isEditingDescription) {
		editableDescription = todo.description || "";
	}

	$: if (isEditingAssignedTo && todo) {
		tick().then(() => {
			assignedToInputInstance?.focus();
		});
	}

	const carta = new Carta({
		sanitizer: DOMPurify.sanitize,
		extensions: [code()],
		theme: "github-dark",
	});

	function requestClose() {
		if (onClose) {
			onClose();
		}
		isEditingTitle = false;
		isEditingDescription = false;
		isEditingAssignedTo = false;
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
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
		if (event.key === "Enter") {
			event.preventDefault();
			handleSaveTitle();
		} else if (event.key === "Escape") {
			event.preventDefault();
			handleCancelEditTitle();
		}
	}

	function handleEditDescription() {
		if (!todo) return;
		editableDescription = todo.description || "";
		isEditingDescription = true;
	}

	function handleCancelEditDescription() {
		isEditingDescription = false;
		if (todo) {
			editableDescription = todo.description || "";
		}
	}

	function handleSaveDescription() {
		if (todo && onUpdateDescription) {
			if (editableDescription.trim() !== (todo.description || "").trim()) {
				onUpdateDescription({ todo, description: editableDescription.trim() });
			}
		}
		isEditingDescription = false;
	}

	function handleEditAssignedTo(event?: MouseEvent) {
		if (event) event.stopPropagation(); // Prevent click on parent div from re-triggering
		if (!todo) return;
		editableAssignedTo = todo.assigned_to || "";
		isEditingAssignedTo = true;
	}

	function handleCancelEditAssignedTo() {
		isEditingAssignedTo = false;
		if (todo) {
			editableAssignedTo = todo.assigned_to || "";
		}
	}

	function handleSaveAssignedTo() {
		if (todo && onUpdateAssignedTo) {
			const newAssignedTo = editableAssignedTo.trim();
			if (newAssignedTo !== (todo.assigned_to || "").trim()) {
				onUpdateAssignedTo({ todo, assignedTo: newAssignedTo });
			}
		}
		isEditingAssignedTo = false;
	}

	function handleAssignedToInputKeydown(event: KeyboardEvent) {
		if (event.key === "Enter") {
			event.preventDefault();
			handleSaveAssignedTo();
		} else if (event.key === "Escape") {
			event.preventDefault();
			handleCancelEditAssignedTo();
		}
	}

	async function handleShare() {
		if (!todo) return;
		try {
			await navigator.clipboard.writeText(window.location.href);
			tooltipMessage = "Copied!";
		} catch (err) {
			console.error("Failed to copy link:", err);
			tooltipMessage = "Failed to copy!";
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

<Dialog open={isOpen && !!todo} onCancel={requestClose} showCloseButton={true} confirmLabel="" cancelLabel="" size="large">
	<div slot="title" class="w-full mr-3 relative">
		{#if todo}
			<div class="flex items-center gap-3 w-full">
				<Checkbox bind:checked={internalStatusIsDone} size="h-5 w-5" />
				{#if isEditingTitle}
					<Input
						bind:this={titleInputInstance}
						bind:value={editableTitle}
						placeholder="Todo title"
						class="w-full flex-grow"
						onBlur={handleSaveTitle}
						onKeydown={handleTitleInputKeydown}
					/>
				{:else}
					<h2
						class="text-xl font-semibold text-white dark:text-dark-foreground break-all flex-grow {todo?.status === 'Done'
							? 'line-through text-white/60 dark:text-dark-gray-400'
							: ''}"
						on:click={handleEditTitle}
					>
						{todo?.title}
					</h2>
				{/if}
			</div>
		{/if}
	</div>

	{#if todo}
		{#if todo.difficulty !== undefined}
			<div class="mb-3">
				<DifficultyStars difficulty={displayDifficulty} interactive={true} onUpdate={handleUpdateDifficulty} size={20} />
			</div>
		{/if}
		<div class="flex items-center gap-2 mb-3 -ml-1">
			<span class="text-sm text-gray-400">Priority:</span>
			<PrioritySelector currentPriority={todo.priority || 0} on:update={(e) => onUpdatePriority && onUpdatePriority({ todo, priority: e.detail })} />
		</div>
		<p class="text-sm text-white/70 dark:text-dark-gray-300 mb-2">
			Created at: {formatDate(todo.created_at)}
		</p>
		{#if todo.assigned_to || isEditingAssignedTo}
			<div class="text-sm text-white/70 dark:text-dark-gray-300 mb-2 flex items-center group/assigned">
				Assigned to:&nbsp;
				{#if isEditingAssignedTo}
					<Input
						bind:this={assignedToInputInstance}
						bind:value={editableAssignedTo}
						placeholder="Name..."
						class="w-full text-sm py-0.5 px-1 h-auto"
						maxLength={15}
						onBlur={handleSaveAssignedTo}
						onKeydown={handleAssignedToInputKeydown}
					/>
					<Button variant="icon" onClick={handleCancelEditAssignedTo} title="Cancel" class="p-1 ml-1">
						<X size={16} />
					</Button>
					<Button variant="icon" onClick={handleSaveAssignedTo} title="Save" class="p-1 ml-1">
						<Save size={16} />
					</Button>
				{:else}
					<span
						class="cursor-pointer hover:text-white dark:hover:text-dark-foreground transition-colors"
						on:click={() => handleEditAssignedTo()}
						title="Edit assigned person"
					>
						{todo.assigned_to || "Nobody assigned."}
					</span>
					<Button
						variant="icon"
						onClick={(e) => handleEditAssignedTo(e)}
						title="Edit assigned person"
						class="p-1 ml-1 opacity-0 group-hover/assigned:opacity-100 transition-opacity"
					>
						<Edit2 size={14} />
					</Button>
				{/if}
			</div>
		{:else}
			<div
				class="text-sm text-white/70 dark:text-dark-gray-300 mb-2 flex items-center group/assigned cursor-pointer hover:text-white dark:hover:text-dark-foreground transition-colors"
				on:click={() => handleEditAssignedTo()}
				title="Assign to someone"
			>
				Assigned to: Nobody assigned.
				<Button
					variant="icon"
					onClick={(e) => handleEditAssignedTo(e)}
					title="Assign to someone"
					class="p-1 ml-1 opacity-0 group-hover/assigned:opacity-100 transition-opacity"
				>
					<Edit2 size={14} />
				</Button>
			</div>
		{/if}
		<p class="text-sm text-white/70 dark:text-dark-gray-300 mb-4">
			Status: {todo.status}
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
					<Button
						variant="icon"
						onClick={handleCancelEditDescription}
						title="Cancel"
						class="border border-white/30 hover:bg-white/20 dark:hover:bg-dark-gray-100"
					>
						<X size={16} class="mr-1 sm:mr-2" /> Cancel
					</Button>
					<Button
						variant="primary"
						onClick={handleSaveDescription}
						title="Save description"
						class="bg-green-500/80 hover:bg-green-600/90 border-green-500/30"
					>
						<Save size={16} class="mr-1 sm:mr-2" /> Save
					</Button>
				</div>
			</div>
		{:else if todo.description}
			<div class="mb-4" in:fade={{ duration: 150 }}>
				<h3 class="text-md font-semibold text-white dark:text-dark-foreground mb-1 flex items-center justify-between">
					Description
					<Button variant="icon" onClick={handleEditDescription} title="Edit description" class="p-1">
						<Edit2 size={16} />
					</Button>
				</h3>
				<div
					class="cursor-pointer hover:bg-black/10 dark:hover:bg-dark-gray-800/30 transition-all duration-150 p-0.5 rounded-lg min-h-[40px]"
					on:click={handleEditDescription}
					title="Edit description"
				>
					<Markdown content={todo.description} />
				</div>
			</div>
		{:else}
			<div
				class="mb-4 py-3 px-2 -mx-2 rounded-md hover:bg-white/5 dark:hover:bg-dark-gray-700/40 transition-colors duration-150 cursor-pointer group/add-desc"
				on:click={handleEditDescription}
				title="Add description"
				in:fade={{ duration: 150 }}
			>
				<div
					class="flex items-center text-white/60 dark:text-dark-gray-400 group-hover/add-desc:text-white dark:group-hover/add-desc:text-dark-foreground transition-colors"
				>
					<Edit2 size={18} class="mr-2.5 flex-shrink-0" />
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
					<div
						transition:fade={{ duration: 150 }}
						class="absolute left-full ml-2 px-2 py-1 bg-gray-700 text-white text-xs rounded shadow-lg"
					>
						{tooltipMessage}
					</div>
				{/if}
			</div>
		</div>
	</div>
</Dialog>

<style>
</style>
