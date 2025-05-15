<script lang="ts">
	import {Edit2, GripVertical, Trash2, Eye} from 'lucide-svelte';
	import {createEventDispatcher, tick} from 'svelte';
	import {dragHandle} from 'svelte-dnd-action';
	import Checkbox from '../Checkbox.svelte';
	import type {Todo} from '../types';
	import Button from './ui/Button.svelte';
	import Card from './ui/Card.svelte';
	import type Input from './ui/Input.svelte';
	import InputComponent from './ui/Input.svelte';
	import { sortBy } from '../stores/sort';
	import DifficultyStars from './DifficultyStars.svelte';

	export let todo: Todo;
	export let isCompleted = false;
	export let isPrimedForDrag = false;
	export let searchQuery = '';

	let isEditing = false;
	let editingTitle = todo.title;
	let inputComponentInstance: Input;

	$: if (!isEditing && todo) {
		editingTitle = todo.title;
	}

	$: if (isEditing && todo) {
		editingTitle = todo.title;
		tick().then(() => {
			inputComponentInstance?.focus();
		});
	}

	function handleInputFocus() {
		if (!isEditing) {
			isEditing = true;
		}
	}

	function handleInputBlur() {
		if (isEditing) {
			if (editingTitle !== todo.title) {
				dispatch('updateTitle', { todo, title: editingTitle });
			}
			isEditing = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			if (editingTitle !== todo.title) {
				dispatch('updateTitle', { todo, title: editingTitle });
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
		dispatch('toggle', todo);
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
		dispatch('updateDifficulty', { todo, difficulty: newDifficulty });
	}

	const dispatch = createEventDispatcher<{
		delete: Todo;
		moveDown: Todo;
		moveUp: Todo;
		openDetails: Todo;
		toggle: Todo;
		updateDifficulty: { todo: Todo; difficulty: number };
		updateTitle: {
			todo: Todo;
			title: string;
		};
	}>();
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
				<GripVertical size={14} class="sm:hidden"/>
				<GripVertical size={16} class="hidden sm:block"/>
			</div>
		{/if}

		<Checkbox bind:checked size="h-3 w-3"/>

		{#if isEditing}
			<InputComponent
				bind:this={inputComponentInstance}
				variant="inline"
				bind:value={editingTitle}
				maxLength={150}
				class="min-w-0"
				size="sm"
				on:focus={handleInputFocus}
				on:blur={handleInputBlur}
				on:keydown={handleKeydown}
			/>
		{:else}
			<span
				class="flex-1 text-white dark:text-dark-foreground text-xs cursor-pointer hover:text-white/90 dark:hover:text-dark-gray-800 transition duration-200 rounded px-1.5 mx-1 py-0.5 hover:bg-white/10 dark:hover:bg-dark-gray-100 {todo.completed ? 'line-through text-white/50 dark:text-dark-gray-400' : ''} max-w-full break-words min-w-0 overflow-hidden"
				on:click={() => {
					if (!isPrimedForDrag) {
						isEditing = true;
					}
				}}
			>
				{#if searchQuery}
					<span class="block break-words">
						{@html highlightMatches(todo.title, searchQuery)}
					</span>
				{:else}
					<span class="block break-words">{todo.title}</span>
				{/if}
				<div class="flex items-center gap-1">
					<span class="text-[10px] text-white/50 dark:text-dark-gray-300">{formatDate(todo.created_at)}</span>
					{#if todo.difficulty !== undefined}
						<div class="sm:hidden">
							<DifficultyStars difficulty={todo.difficulty} interactive={!isEditing} onUpdate={handleUpdateDifficulty} size={10} />
						</div>
						<div class="hidden sm:block">
							<DifficultyStars difficulty={todo.difficulty} interactive={!isEditing} onUpdate={handleUpdateDifficulty} size={12} />
						</div>
					{/if}
				</div>
			</span>
		{/if}

		<div class="flex gap-1 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity flex-shrink-0">
			<Button
				ariaLabel="View todo"
				title="View todo"
				class="h-5 w-5 sm:h-6 sm:w-6"
				icon={true}
				on:click={() => {
					if (!isPrimedForDrag) {
						dispatch('openDetails', todo);
					}
				}}
				variant="icon"
			>
				<Eye class="sm:hidden" size={14}/>
				<Eye class="hidden sm:block" size={16}/>
			</Button>
			<Button
				ariaLabel="Edit todo"
				title="Edit todo"
				class="h-5 w-5 sm:h-6 sm:w-6"
				icon={true}
				on:click={() => {
					if (!isPrimedForDrag) {
						isEditing = true;
					}
				}}
				variant="icon"
			>
				<Edit2 class="sm:hidden" size={14}/>
				<Edit2 class="hidden sm:block" size={16}/>
			</Button>
			<Button
				ariaLabel="Delete todo"
				title="Delete todo"
				class="hover:text-red-500 transition-colors h-5 w-5 sm:h-6 sm:w-6"
				icon={true}
				on:click={() => dispatch('delete', todo)}
				variant="icon"
			>
				<Trash2 class="sm:hidden" size={14}/>
				<Trash2 class="hidden sm:block" size={16}/>
			</Button>
		</div>
	</div>
</Card>
