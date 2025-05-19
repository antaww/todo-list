<script lang="ts">
	import {onDestroy, onMount} from 'svelte';
	import Sidebar from '@components/Sidebar.svelte';
	import Toaster from '@components/ui/Toaster.svelte';
	import {startLastSeenTracking} from '$helpers/lastSeen';
	import {supabase} from '$lib/supabase';
	import TodoList from '@components/TodoList.svelte';

	export let data;
	const task = data?.task;

	let listId: string;
	let error: string | null = null;
	let isSidebarOpen = true;
	let cleanup: (() => void) | null = null;

	onMount(async () => {
		try {
			const urlParams = new URLSearchParams(window.location.search);
			listId = urlParams.get('list') || crypto.randomUUID();

			if (!urlParams.get('list')) {
				const newUrl = `${window.location.pathname}?list=${listId}`;
				window.history.pushState({listId}, '', newUrl);
			}

			try {
				await supabase.from('todos')
					.select(
					'count',
					{
						count: 'exact',
						head: true,
					},
				);
			} catch (err: unknown) {
				if (err instanceof Error) {
					error = `Database connection error: ${err.message}. Please refresh the page.`;
				} else {
					error = 'Database connection error. Please refresh the page.';
				}
			}

			// Démarrer le tracking du last seen
			cleanup = startLastSeenTracking();
		} catch (e) {
			console.error('Error in App initialization:', e);
			error = 'Failed to initialize application. Please refresh the page.';
		}
	});

	onDestroy(() => {
		if (cleanup) {
			cleanup();
		}
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
	<Sidebar bind:isOpen={isSidebarOpen}/>
	<main class="transition-[margin] duration-500 {isSidebarOpen ? 'lg:ml-80' : ''} flex min-h-screen flex-col items-center justify-start lg:p-8">
		<div class="w-full">
			{#if error}
				<div class="p-4 bg-red-100 text-red-700 rounded-lg">
					{error}
				</div>
			{:else if listId}
				<TodoList {listId}/>
			{/if}
		</div>
	</main>
</div>
