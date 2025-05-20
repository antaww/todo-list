<script lang="ts">
	import {Edit2, GripVertical, Trash2, Eye, FileText, NotebookPen} from 'lucide-svelte';
	import {tick} from 'svelte';
	import {dragHandle} from 'svelte-dnd-action';
	import Checkbox from '@components/ui/Checkbox.svelte';
	import type {Todo} from '$lib/types';
	import Button from '@components/ui/Button.svelte';
	import Card from '@components/ui/Card.svelte';
	import type Input from '@components/ui/Input.svelte';
	import InputComponent from '@components/ui/Input.svelte';
	import { sortBy } from '$stores/sort';
	import DifficultyStars from '@components/DifficultyStars.svelte';
	import { pushState } from '$app/navigation';

	export let todo: Todo;
	export let isCompleted = false;
	export let isPrimedForDrag = false;
	export let searchQuery = '';

	// Event props
	export let onDelete: (item: Todo) => void = () => {};
	export let onOpenDetails: (item: Todo) => void = () => {};
	export let onToggle: (item: Todo) => void = () => {};
	export let onUpdateDifficulty: (detail: { todo: Todo; difficulty: number }) => void = () => {};
	export let onUpdateTitle: (detail: { todo: Todo; title: string }) => void = () => {};

	let isEditing = false;
	let editingTitle = todo.title;
	let inputComponentInstance: Input;

	$: if (!isEditing && todo) {
		editingTitle = todo.title;
	}

	$: if (isEditing && todo) {
		tick().then(() => {
			inputComponentInstance?.focus();
		});
	}

	function handleInputBlur() {
		if (isEditing) {
			if (editingTitle !== todo.title) {
				onUpdateTitle({ todo, title: editingTitle });
			}
			isEditing = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (editingTitle !== todo.title) {
				onUpdateTitle({ todo, title: editingTitle });
			}
			isEditing = false;
		} else if (event.key === 'Escape') {
			event.preventDefault();
			editingTitle = todo.title;
			isEditing = false;
		}
	}

	let checked = todo.completed;
	$: if (checked !== todo.completed) {
		onToggle(todo);
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}/${month}/${day}`;
	}

	function highlightMatches(text: string, query: string) {
		if (!query.trim()) return text;

		const searchLower = query.toLowerCase();
		const textLower = text.toLowerCase();

		let result = '';
		let j = 0;
		let positions = [];

		for (let i = 0; i < textLower.length && j < searchLower.length; i++) {
			if (textLower[i] === searchLower[j]) {
				positions.push(i);
				j++;
			}
		}

		for (let i = 0; i < text.length; i++) {
			if (positions.includes(i)) {
				result += `<span class="bg-yellow-400/30">${text[i]}</span>`;
			} else {
				result += text[i];
			}
		}
		return result;
	}

	function handleUpdateDifficulty(newDifficulty: number) {
		onUpdateDifficulty({ todo, difficulty: newDifficulty });
	}
</script>

<Card
	class="transition-[outline] duration-200 outline outline-1 outline-white/10 dark:outline-dark-border hover:outline-[2px] hover:outline-white/50 dark:hover:outline-dark-gray-300 group/item max-w-full {$sortBy === 'order' ? 'cursor-grab' : 'pl-4'}"
	padding="p-1.5"
	variant="secondary"
>
	<div class="flex items-center overflow-hidden gap-1 sm:gap-2" class:py-0.5={isEditing}>
		{#if !isCompleted && $sortBy === 'order'}
			<div
				use:dragHandle
				class="flex-shrink-0 cursor-grab transition-opacity ml-1 mr-2 text-white {isPrimedForDrag ? 'opacity-100' : 'opacity-30 group-hover/item:opacity-70 sm:opacity-0'}"
				aria-label="Drag todo item"
				title="Drag to reorder (long press to activate handle)"
				style="touch-action: none;"
			>
				<GripVertical size={16} class="sm:hidden"/>
				<GripVertical size={18} class="hidden sm:block"/>
			</div>
		{/if}

		<Checkbox bind:checked size="h-4 w-4"/>

		{#if isEditing}
			<InputComponent
				bind:this={inputComponentInstance}
				variant="inline"
				bind:value={editingTitle}
				maxLength={150}
				class="min-w-0"
				size="sm"
				onBlur={handleInputBlur}
				onKeydown={handleKeydown}
			/>
		{:else}
			<span
				class="flex-1 text-white dark:text-dark-foreground text-sm cursor-pointer hover:text-white/90 dark:hover:text-dark-gray-800 transition duration-200 rounded px-1.5 mx-1 py-0.5 hover:bg-white/10 dark:hover:bg-dark-gray-100 {todo.completed ? 'line-through text-white/50 dark:text-dark-gray-400' : ''} max-w-full break-words min-w-0 overflow-hidden"
				on:click={() => {
					if (!isPrimedForDrag) {
						isEditing = true;
					}
				}}
			>
				{#if searchQuery}
					<span class="block break-all">
						{@html highlightMatches(todo.title, searchQuery)}
					</span>
				{:else}
					<span class="block break-all">{todo.title}</span>
				{/if}
				<div class="flex items-center gap-1">
					<span class="text-xs text-white/50 dark:text-dark-gray-300">{formatDate(todo.created_at)}</span>
					{#if todo.difficulty !== undefined}
						<div class="sm:hidden">
							<DifficultyStars difficulty={todo.difficulty} interactive={!isEditing} onUpdate={handleUpdateDifficulty} size={12} />
						</div>
						<div class="hidden sm:block">
							<DifficultyStars difficulty={todo.difficulty} interactive={!isEditing} onUpdate={handleUpdateDifficulty} size={14} />
						</div>
					{/if}
					{#if todo.description}
						<button
							class="text-white/60 dark:text-dark-gray-600 ml-0.5 cursor-pointer hover:text-white/80 dark:hover:text-dark-gray-500 transition-colors"
							title="Has description"
							on:click|stopPropagation={() => {
								if (!isPrimedForDrag) {
									const url = new URL(window.location.href);
									url.searchParams.set('task_id', todo.id);
									pushState(url.toString(), {});
									onOpenDetails(todo);
								}
							}}
							aria-label="Has description"
							tabindex="0"
						>
							<NotebookPen size={14} class="sm:hidden" />
							<NotebookPen size={16} class="hidden sm:block" />
						</button>
					{/if}
				</div>
			</span>
		{/if}

		<div class="flex gap-1 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity flex-shrink-0">
			<Button
				ariaLabel="View todo"
				title="View todo"
				class="h-6 w-6 sm:h-7 sm:w-7"
				icon={true}
				onClick={() => {
					if (!isPrimedForDrag) {
						const url = new URL(window.location.href);
						url.searchParams.set('task_id', todo.id);
						pushState(url.toString(), {});
						onOpenDetails(todo);
					}
				}}
				variant="icon"
			>
				<Eye class="sm:hidden" size={16}/>
				<Eye class="hidden sm:block" size={18}/>
			</Button>
			<Button
				ariaLabel="Edit todo"
				title="Edit todo"
				class="h-6 w-6 sm:h-7 sm:w-7"
				icon={true}
				onClick={() => {
					if (!isPrimedForDrag) {
						isEditing = true;
					}
				}}
				variant="icon"
			>
				<Edit2 class="sm:hidden" size={16}/>
				<Edit2 class="hidden sm:block" size={18}/>
			</Button>
			<Button
				ariaLabel="Delete todo"
				title="Delete todo"
				class="hover:text-red-500 transition-colors h-6 w-6 sm:h-7 sm:w-7"
				icon={true}
				onClick={() => onDelete(todo)}
				variant="icon"
			>
				<Trash2 class="sm:hidden" size={16}/>
				<Trash2 class="hidden sm:block" size={18}/>
			</Button>
		</div>
	</div>
</Card>
