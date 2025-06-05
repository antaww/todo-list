<script lang="ts">
	import { ZapOff, ChevronUp, ChevronsUp, Flame, ChevronDown } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { tick, onDestroy, createEventDispatcher } from 'svelte';

	export let currentPriority: number = 0; // Default priority: Anytime

	const dispatch = createEventDispatcher<{ update: number }>();

	let showPrioritySelect = false;

	const priorityLevels = [
		{ text: "Anytime", icon: ZapOff, colorClass: "text-green-500 dark:text-green-400", title: "Priority: Anytime" },
		{ text: "Need it", icon: ChevronUp, colorClass: "text-yellow-500 dark:text-yellow-400", title: "Priority: Need it" },
		{ text: "Fast", icon: ChevronsUp, colorClass: "text-orange-500 dark:text-orange-400", title: "Priority: Fast" },
		{ text: "Critic", icon: Flame, colorClass: "text-red-500 dark:text-red-400", title: "Priority: Critic" },
	];

	function handlePrioritySelect(priority: number) {
		currentPriority = priority;
		dispatch('update', priority);
		showPrioritySelect = false;
	}

	function handleClickOutsidePriority(event: MouseEvent) {
		if (
			showPrioritySelect &&
			event.target &&
			!(event.target as HTMLElement).closest(".priority-select-trigger-component") &&
			!(event.target as HTMLElement).closest(".priority-select-dropdown-component")
		) {
			showPrioritySelect = false;
		}
	}

	$: {
		if (showPrioritySelect) {
			tick().then(() => {
				document.addEventListener('click', handleClickOutsidePriority, true);
			});
		} else {
			document.removeEventListener('click', handleClickOutsidePriority, true);
		}
	}

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutsidePriority, true);
	});
</script>

<div class="flex items-center gap-2 relative">
	<button
		type="button"
		class="flex items-center gap-1.5 p-1 -ml-1 rounded hover:bg-white/10 dark:hover:bg-dark-gray-100 transition priority-select-trigger-component {priorityLevels[currentPriority].colorClass}"
		on:click={() => (showPrioritySelect = !showPrioritySelect)}
		title={priorityLevels[currentPriority].title}
	>
		<svelte:component this={priorityLevels[currentPriority].icon} size={16} />
		<span class="text-xs sm:text-sm">{priorityLevels[currentPriority].text}</span>
		<ChevronDown size={14} class="transition-transform {showPrioritySelect ? 'rotate-180' : ''}" />
	</button>
	{#if showPrioritySelect}
		<div
			transition:fade={{ duration: 150 }}
			class="absolute top-full left-0 mt-1.5 w-40 bg-white/20 dark:bg-black backdrop-blur-md border border-white/30 dark:border-dark-gray-300 rounded-lg shadow-xl z-20 p-1 priority-select-dropdown-component"
		>
			{#each priorityLevels as level, index}
				<button
					type="button"
					class="w-full flex items-center gap-2 px-2 py-1.5 text-xs sm:text-sm rounded hover:bg-white/20 dark:hover:bg-dark-gray-200 transition {level.colorClass} {currentPriority === index ? 'bg-white/10 dark:bg-dark-gray-100 font-semibold' : ''}"
					on:click={() => handlePrioritySelect(index)}
				>
					<svelte:component this={level.icon} size={14} />
					<span>{level.text}</span>
				</button>
			{/each}
		</div>
	{/if}
</div> 