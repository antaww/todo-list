<script lang="ts">
	import {ArrowDown, ArrowUp, Plus, Search, ZapOff, ChevronUp, ChevronsUp, Flame, ChevronDown} from 'lucide-svelte';
	import {debounce} from '$helpers/debounce';
	import {persistentStore} from '$stores/persistent';
	import {sortBy, sortDirection, type SortByType} from '$stores/sort';
	import Button from '@components/ui/Button.svelte';
	import DifficultyStars from '@components/DifficultyStars.svelte';
	import Input from '@components/ui/Input.svelte';
	import Select from '@components/ui/Select.svelte';
	import { fade } from 'svelte/transition';
	import { tick } from 'svelte';

	export let hasCompletedTodos = false;
	export let loading = false;
	export let searchResultsCount: number | undefined = undefined;
	export let onAdd: (detail: { title: string; difficulty: number; priority: number; description?: string; assignedTo?: string }) => void = () => {};
	export let onSort: (detail: { by: SortByType, direction: 'asc' | 'desc' }) => void = () => {};
	export let onSearch: (searchText: string) => void = () => {};

	let newTodoDescription = '';
	let newTodoDifficulty = 0;
	let newTodoPriority = 0; // Default priority: Anytime
	let newTodoTitle = '';
	let newTodoAssignedTo = '';
	let searchMode = persistentStore<boolean>('searchMode', false);
	let showPrioritySelect = false;

	const priorityLevels = [
		{ text: "Anytime", icon: ZapOff, colorClass: "text-green-500 dark:text-green-400", title: "Priority: Anytime" },
		{ text: "Need it", icon: ChevronUp, colorClass: "text-yellow-500 dark:text-yellow-400", title: "Priority: Need it" },
		{ text: "Fast", icon: ChevronsUp, colorClass: "text-orange-500 dark:text-orange-400", title: "Priority: Fast" },
		{ text: "Critic", icon: Flame, colorClass: "text-red-500 dark:text-red-400", title: "Priority: Critic" },
	];

	const sortOptions = [
		{
			value: 'order',
			label: 'Manual Order'
		},
		{
			value: 'name',
			label: 'Name'
		},
		{
			value: 'date',
			label: 'Date'
		},
		{
			value: 'difficulty',
			label: 'Difficulty'
		},
		{
			value: 'assigned',
			label: 'Assigned To'
		},
		{
			value: 'priority',
			label: 'Priority'
		}
	];

	function handleSubmit() {
		if (!newTodoTitle.trim()) return;
		debouncedSearch.cancel();
		onAdd({ title: newTodoTitle.trim(), difficulty: newTodoDifficulty, priority: newTodoPriority, description: newTodoDescription.trim(), assignedTo: newTodoAssignedTo.trim() });
		newTodoTitle = '';
		newTodoDescription = '';
		newTodoDifficulty = 0;
		newTodoPriority = 0;
		newTodoAssignedTo = '';
		$searchMode = false;
		onSearch('');
		showPrioritySelect = false; // Reset priority dropdown
	}

	function handleSortChange(newSortValue: string | undefined) {
		if (newSortValue) {
			$sortBy = newSortValue as SortByType;
			onSort({ by: $sortBy, direction: $sortDirection });
		}
	}

	function toggleSortDirection() {
		$sortDirection = $sortDirection === 'asc' ? 'desc' : 'asc';
		onSort({ by: $sortBy, direction: $sortDirection });
	}

	const debouncedSearch = debounce((searchText: string) => {
		if (!searchText) {
			onSearch('');
			$searchMode = false;
			return;
		}

		if (searchText.trim()) {
			onSearch(searchText.trim());
			$searchMode = true;
		}
	}, 250);

	function handlePrioritySelect(priority: number) {
		newTodoPriority = priority;
		showPrioritySelect = false;
	}

	function handleClickOutsidePriority(event: MouseEvent) {
		if (
			showPrioritySelect &&
			event.target &&
			!(event.target as HTMLElement).closest(".priority-select-trigger-form") &&
			!(event.target as HTMLElement).closest(".priority-select-dropdown-form")
		) {
			showPrioritySelect = false;
		}
	}

	$: {
		if (newTodoTitle.trim()) {
			debouncedSearch(newTodoTitle);
		} else {
			debouncedSearch.cancel();
			onSearch('');
			$searchMode = false;
			showPrioritySelect = false; // Hide priority when input is cleared
		}

		if (showPrioritySelect) {
			tick().then(() => {
				document.addEventListener('click', handleClickOutsidePriority, true);
			});
		} else {
			document.removeEventListener('click', handleClickOutsidePriority, true);
		}
	}
</script>

<div class="mb-2 space-y-2">
	<form
		class="flex flex-col gap-2"
		on:submit|preventDefault={handleSubmit}
	>
		<div class="flex gap-1 sm:gap-2">
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
		</div>
		{#if newTodoTitle.trim()}
			<div class="pl-1 pt-1 space-y-2" transition:fade={{ duration: 150 }}>
				<DifficultyStars
					difficulty={newTodoDifficulty}
					interactive={true}
					onUpdate={(d) => (newTodoDifficulty = d)}
					size={18}
				/>
				<div class="flex items-center gap-2 relative mt-1">
					<span class="text-xs sm:text-sm text-white/70 dark:text-dark-gray-300">Priority:</span>
					<button
						type="button"
						class="flex items-center gap-1.5 p-1 -ml-1 rounded hover:bg-white/10 dark:hover:bg-dark-gray-100 transition priority-select-trigger-form {priorityLevels[newTodoPriority].colorClass}"
						on:click={() => (showPrioritySelect = !showPrioritySelect)}
						title={priorityLevels[newTodoPriority].title}
					>
						<svelte:component this={priorityLevels[newTodoPriority].icon} size={16} />
						<span class="text-xs sm:text-sm">{priorityLevels[newTodoPriority].text}</span>
						<ChevronDown size={14} class="transition-transform {showPrioritySelect ? 'rotate-180' : ''}" />
					</button>
					{#if showPrioritySelect}
						<div
							transition:fade={{ duration: 150 }}
							class="absolute top-full left-0 mt-1.5 w-40 bg-white/20 dark:bg-black backdrop-blur-md border border-white/30 dark:border-dark-gray-300 rounded-lg shadow-xl z-20 p-1 priority-select-dropdown-form"
						>
							{#each priorityLevels as level, index}
								<button
									type="button"
									class="w-full flex items-center gap-2 px-2 py-1.5 text-xs sm:text-sm rounded hover:bg-white/20 dark:hover:bg-dark-gray-200 transition {level.colorClass} {newTodoPriority === index ? 'bg-white/10 dark:bg-dark-gray-100 font-semibold' : ''}"
									on:click={() => handlePrioritySelect(index)}
								>
									<svelte:component this={level.icon} size={14} />
									<span>{level.text}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
				<Input
					bind:value={newTodoAssignedTo}
					class="text-sm mt-2"
					disabled={loading}
					maxLength={15}
					placeholder="Assign to... (optional)"
				/>
			</div>
		{/if}

		{#if $searchMode && newTodoTitle.trim()}
			<div class="text-xs text-white/70 flex items-center gap-1 px-1">
				<Search size={12}/>
				<span>Searching for "{newTodoTitle}"... Press + to add as new todo</span>
			</div>
		{/if}

		<div class="flex flex-wrap items-center justify-between gap-1 sm:gap-2 mt-2">
			<div class="flex items-center gap-1 sm:gap-2 flex-nowrap">
				<span class="text-sm sm:text-base text-white whitespace-nowrap dark:text-dark-gray-800">Sort by:</span>
				<Select
					onChange={handleSortChange}
					options={sortOptions}
					value={$sortBy}
				/>
				<Button
					class="!p-1 sm:!p-2"
					onClick={toggleSortDirection}
					title={`Sort ${$sortDirection === 'asc' ? 'descending' : 'ascending'}`}
					variant="primary"
				>
					{#if $sortDirection === 'asc'}
						<ArrowDown size={16} />
					{:else}
						<ArrowUp size={16} />
					{/if}
				</Button>
			</div>
			<div class="flex gap-1 sm:gap-2">
				<Button
					class="!p-1 sm:!p-2"
					onClick={() => document.getElementById('active-todos')?.scrollIntoView({ behavior: 'smooth' })}
					variant="primary"
				>
					<ArrowUp size={16}/>
				</Button>
				<Button
					class="!p-1 sm:!p-2"
					onClick={() => {
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
	</form>
</div>
