<script lang="ts">
	import {ArrowDown, ArrowUp, Plus, Search} from 'lucide-svelte';
	import {createEventDispatcher} from 'svelte';
	import {debounce} from '../helpers/debounce';
	import {persistentStore} from '../stores/persistent';
	import Button from './ui/Button.svelte';
	import Input from './ui/Input.svelte';
	import Select from './ui/Select.svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	export let loading = false;
	export let hasCompletedTodos = false;
	export let searchResultsCount: number | undefined = undefined;
	let newTodoTitle = '';
	let searchMode = persistentStore<boolean>('searchMode', false);

	const dispatch = createEventDispatcher<{
		add: string;
		sort: 'name' | 'date' | 'order';
		search: string;
	}>();

	let sortBy = persistentStore<'name' | 'date' | 'order'>('sortBy', 'order');

	const sortOptions = [
		{
			value: 'order',
			label: 'Manual Order',
		},
		{
			value: 'name',
			label: 'Name',
		},
		{
			value: 'date',
			label: 'Date',
		},
	];

	function handleSubmit() {
		if (!newTodoTitle.trim()) return;
		debouncedSearch.cancel();
		dispatch('add', newTodoTitle.trim());
		newTodoTitle = '';
		$searchMode = false;
		dispatch('search', '');
	}

	function handleSortChange(event: CustomEvent<string>) {
		$sortBy = event.detail as 'name' | 'date' | 'order';
		dispatch('sort', $sortBy);
	}

	const debouncedSearch = debounce((searchText: string) => {
		if (!searchText) {
			dispatch('search', '');
			$searchMode = false;
			return;
		}

		if (searchText.trim()) {
			dispatch('search', searchText.trim());
			$searchMode = true;
		}
	}, 300);

	$: {
		if (newTodoTitle.trim()) {
			debouncedSearch(newTodoTitle);
		} else {
			dispatch('search', '');
			$searchMode = false;
		}
	}
</script>

<div class="mb-2 space-y-2">
	<form
		class="flex gap-1 sm:gap-2"
		on:submit|preventDefault={handleSubmit}
	>
		<Input
			bind:value={newTodoTitle}
			class="text-sm"
			disabled={loading}
			maxLength={150}
			placeholder={$searchMode ? "Search todos..." : "Add a new todo..."}
		/>
		<Button
			class="text-sm {$searchMode ? 'bg-blue-600 hover:bg-blue-700' : ''}"
			disabled={loading || !newTodoTitle.trim()}
			title={$searchMode ? "Add as new todo" : "Add todo"}
			type="submit"
			variant="primary"
		>
			<Plus size={16}/>
		</Button>
	</form>

	{#if $searchMode && newTodoTitle.trim()}
		<div class="text-xs text-white/70 flex items-center gap-1 px-1">
			<Search size={12}/>
			<span>Searching for "{newTodoTitle}"... Press + to add as new todo</span>
		</div>
	{/if}

	<div class="flex flex-wrap items-center justify-between gap-1 sm:gap-2">
		<div class="flex items-center gap-1 sm:gap-2 flex-nowrap">
			<span class="text-sm sm:text-base text-white whitespace-nowrap dark:text-dark-gray-800">Sort by:</span>
			<Select
				on:change={handleSortChange}
				options={sortOptions}
				value={$sortBy}
			/>
		</div>
		<div class="flex gap-1 sm:gap-2">
			<Button
				class="!p-1 sm:!p-2"
				on:click={() => document.getElementById('active-todos')?.scrollIntoView({ behavior: 'smooth' })}
				variant="primary"
			>
				<ArrowUp size={16}/>
			</Button>
			<Button
				class="!p-1 sm:!p-2"
				on:click={() => {
          if (hasCompletedTodos) {
            document.getElementById('completed-todos')?.scrollIntoView({ behavior: 'smooth' });
          } else {
            document.getElementById('active-todos')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }}
				variant="primary"
			>
				<ArrowDown size={16}/>
			</Button>
		</div>
	</div>

	{#if typeof searchResultsCount === 'number'}
		<div class="text-xs text-white/50 px-1" transition:fade>
			{searchResultsCount} {searchResultsCount === 1 ? 'result' : 'results'} found
		</div>
	{/if}
</div>
