<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Sidebar from '@components/Sidebar.svelte';
	import Toaster from '@components/ui/Toaster.svelte';
	import { startLastSeenTracking } from '$helpers/lastSeen';
	import TodoList from '@components/TodoList.svelte';
	import type { PageData } from './$types';
	import { browser } from '$app/environment';

	export let data: PageData;
	$: task = data?.task;
	$: listId = data?.listId; // Get listId from server data

	let isSidebarOpen = true;
	let cleanup: (() => void) | null = null;

	onMount(async () => {
		try {
			cleanup = startLastSeenTracking();
		} catch (e) {
			console.error('Error in App client-side initialization:', e);
		}
	});

	onDestroy(() => {
        cleanup?.();
	});
</script>

<svelte:head>
	{#if task}
		<meta property="og:title" content={`Task: ${task.title}`} />
		<meta property="og:description" content={`Difficulty: ${(Math.round((task.difficulty / 2) * 10) / 10)}/5 | Status: ${task.completed ? 'Completed' : 'Pending'}`} />
		<meta property="og:type" content="website" />
		<meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
		<meta name="twitter:card" content="summary" />
		<meta name="twitter:title" content={`Task: ${task.title}`} />
		<meta name="twitter:description" content={`Difficulty: ${(Math.round((task.difficulty / 2) * 10) / 10)}/5 | Status: ${task.completed ? 'Completed' : 'Pending'}`} />
	{/if}
</svelte:head>

<Toaster/>

<div class="min-h-screen">
	<Sidebar bind:isOpen={isSidebarOpen} currentListId={listId} /> <!-- Pass currentListId to Sidebar -->
	<main class="transition-[margin] duration-500 {isSidebarOpen ? 'lg:ml-80' : ''} flex min-h-screen flex-col items-center justify-start lg:p-8">
		<div class="w-full">
			{#if data.dbError}
				<div class="p-4 bg-red-100 text-red-700 rounded-lg">
					{data.dbError}
				</div>
			{:else if listId && browser}
				<TodoList {listId}/>
			{/if}
		</div>
	</main>
</div>
