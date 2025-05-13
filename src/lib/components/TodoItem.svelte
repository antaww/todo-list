<script lang="ts">
	import {Edit2, GripVertical, Trash2} from 'lucide-svelte';
	import {createEventDispatcher} from 'svelte';
	import Checkbox from '../Checkbox.svelte';
	import type {Todo} from '../types';
	import Button from './ui/Button.svelte';
	import Card from './ui/Card.svelte';
	import Input from './ui/Input.svelte';
	import { sortBy } from '../stores/sort';

	export let todo: Todo;
	export let isEditing = false;
	export let editingTitle = '';
	export let isCompleted = false;
	export let searchQuery = '';

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			dispatch(
				'updateTitle',
				{
					todo,
					title: editingTitle,
				},
			);
		} else if (event.key === 'Escape') {
			dispatch('startEdit', todo);
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

		// First identify the matching character positions
		for (let i = 0; i < textLower.length && j < searchLower.length; i++) {
			if (textLower[i] === searchLower[j]) {
				positions.push(i);
				j++;
			}
		}

		// Then build the highlighted text
		for (let i = 0; i < text.length; i++) {
			if (positions.includes(i)) {
				result += `<span class="bg-yellow-400/30">${text[i]}</span>`;
			} else {
				result += text[i];
			}
		}

		return result;
	}

	const dispatch = createEventDispatcher<{
		toggle: Todo;
		delete: Todo;
		edit: Todo;
		moveUp: Todo;
		moveDown: Todo;
		updateTitle: {
			todo: Todo;
			title: string
		};
		startEdit: Todo | undefined;
	}>();
</script>

<Card
	class="transition-[outline] duration-200 outline outline-1 outline-white/10 dark:outline-dark-border hover:outline-[2px] hover:outline-white/50 dark:hover:outline-dark-gray-300 group/item max-w-full {$sortBy === 'order' ? 'cursor-grab' : 'pl-4'}"
	padding="p-1.5"
	variant="secondary"
>
	<div class="flex items-center overflow-hidden gap-1 sm:gap-2" class:py-0.5={isEditing}>
		{#if !isCompleted && $sortBy === 'order'}
			<div class="flex-shrink-0 cursor-grab opacity-30 group-hover/item:opacity-70 transition-opacity ml-1 mr-2 text-white">
				<GripVertical size={14} class="sm:hidden"/>
				<GripVertical size={16} class="hidden sm:block"/>
			</div>
		{/if}

		<Checkbox bind:checked size="h-3 w-3"/>

		{#if isEditing}
			<Input
				variant="inline"
				bind:value={editingTitle}
				maxLength={150}
				class="min-w-0"
				size="sm"
				on:blur={() => {
					dispatch('updateTitle', { todo, title: editingTitle });
					dispatch('startEdit', undefined);
				}}
				on:keydown={handleKeydown}
			/>
		{:else}
			<span
				class="flex-1 text-white dark:text-dark-foreground text-xs cursor-pointer hover:text-white/90 dark:hover:text-dark-gray-800 transition duration-200 rounded px-1.5 mx-1 py-0.5 hover:bg-white/10 dark:hover:bg-dark-gray-100 {todo.completed ? 'line-through text-white/50 dark:text-dark-gray-400' : ''} max-w-full break-words min-w-0 overflow-hidden"
				on:click={() => dispatch('startEdit', todo)}
			>
				{#if searchQuery}
					<span class="block break-words">
						{@html highlightMatches(todo.title, searchQuery)}
					</span>
				{:else}
					<span class="block break-words">{todo.title}</span>
				{/if}
				<span class="text-[10px] text-white/50 dark:text-dark-gray-300">{formatDate(todo.created_at)}</span>
			</span>
		{/if}

		<div class="flex gap-1 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity flex-shrink-0">
			<Button
				ariaLabel="Edit todo"
				class="h-5 w-5 sm:h-6 sm:w-6"
				icon={true}
				on:click={() => dispatch('startEdit', todo)}
				variant="icon"
			>
				<Edit2 class="sm:hidden" size={14}/>
				<Edit2 class="hidden sm:block" size={16}/>
			</Button>
			<Button
				ariaLabel="Delete todo"
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
