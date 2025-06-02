<script lang="ts">
	import {BookmarkPlus, History, Loader2, PanelLeft, PanelLeftClose, Plus, Star, X} from 'lucide-svelte';
	import {onMount} from 'svelte';
	import {fade, fly} from 'svelte/transition';
	import {debounce} from '$helpers/debounce';
	import {favoritesStore} from '$stores/favorites';
	import {historyStore} from '$stores/history';
	import {supabase} from '$lib/supabase';
	import Button from '@components/ui/Button.svelte';
	import Card from '@components/ui/Card.svelte';
	import DarkModeSwitch from '@components/ui/DarkModeSwitch.svelte';
	import Input from '@components/ui/Input.svelte';
	import ScrollArea from '@components/ui/ScrollArea.svelte';

	export let isOpen = false;
	export let currentListId = '';
	let searchValue = '';
	let isMobile = false;

	let checkingDb = false;
	let listExistsInDb: boolean | null = null;
	let foundListTitle: string | null = null;
	let checkError: string | null = null;

	onMount(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth <= 1024;
			if (isMobile) {
				isOpen = false;
			} else {
				isOpen = true;
			}
		};

		checkMobile();
		window.addEventListener('resize', checkMobile);

		return () => window.removeEventListener('resize', checkMobile);
	});

	$: filteredFavorites = $favoritesStore.filter(f =>
		f.title.toLowerCase().includes(searchValue.toLowerCase()),
	);

	$: filteredHistory = $historyStore.filter(h =>
		h.title.toLowerCase().includes(searchValue.toLowerCase()),
	);

	const debouncedCheckSupabase = debounce(async (id: string) => {
		if (!id) return;
		checkingDb = true;
		listExistsInDb = null;
		foundListTitle = null;
		checkError = null;
		try {
			const {
				data,
				error,
			} = await supabase
				.from('lists')
				.select('id, title')
				.eq('id', id)
				.maybeSingle();

			if (error) throw error;
			listExistsInDb = !!data;
			if (data) {
				foundListTitle = data.title || 'Untitled List';
			}
		} catch (err: any) {
			console.error('Error checking list existence:', err);
			listExistsInDb = false;
			checkError = 'Failed to check list existence.';
		} finally {
			checkingDb = false;
		}
	}, 300);

	$: {
		const trimmedSearch = searchValue.trim();
		if (trimmedSearch) {
			debouncedCheckSupabase(trimmedSearch);
		} else {
			checkingDb = false;
			listExistsInDb = null;
			checkError = null;
			debouncedCheckSupabase.cancel();
		}
	}

	function createNewList() {
		const newListId = crypto.randomUUID();
		window.location.href = `/list/${newListId}`;
		if (isMobile) {
			isOpen = false;
		}
		searchValue = '';
	}

	function toggleSidebar() {
		isOpen = !isOpen;
	}

	function openList(id: string) {
		window.location.href = `/list/${id}`;
		if (isMobile) {
			isOpen = false;
		}
	}

	function goToListFromUUID() {
		const listId = searchValue.trim();
		if (!listId) return;
		openList(listId);
		searchValue = '';
	}

	function clearHistory() {
		historyStore.clear();
	}

	function handleRemoveHistoryItem(event: Event, id: string) {
		const mouseEvent = event as MouseEvent;
		mouseEvent.stopPropagation();
		historyStore.remove(id);
	}
</script>

<div class="fixed top-0 left-0 h-screen z-50">
	<div
		class="fixed inset-0 bg-black/30 backdrop-blur-lg lg:hidden transition-all duration-300 {isOpen ? 'pointer-events-auto' : 'pointer-events-none opacity-0'}"
		on:click={toggleSidebar}
	/>
	{#if isOpen}
		<div class="absolute" transition:fly={{ x: -320, duration: 300 }}>
			<Card class="w-80 h-screen !rounded-none border-y-0 border-l-0 relative" padding="p-4">
				<div class="flex flex-col h-full gap-4">
					<div class="flex gap-2">
						<img src="/realtime-todolist-small.png" alt="Logo" class="h-8 mr-2" />
						<div class="flex-grow">
							<Input bind:value={searchValue} placeholder="Search or enter list ID..." variant="default"/>
						</div>
						<Button variant="icon" onClick={toggleSidebar} title="Hide sidebar">
							<PanelLeftClose size={20}/>
						</Button>
					</div>

					{#if searchValue.trim()}
						<div class="flex-shrink-0">
							{#if checkingDb}
								<div class="flex items-center justify-center gap-2 w-full text-sm text-white/60 p-2">
									<Loader2 size={16} class="animate-spin"/>
									Checking database for ID...
								</div>
							{:else if listExistsInDb === true && !checkingDb && !filteredFavorites.some(f => f.id === searchValue.trim()) &&
							!filteredHistory.some(h => h.id === searchValue.trim())}
								<div transition:fade={{ duration: 150 }}>
									<Button
										variant="primary"
										onClick={goToListFromUUID}
										class="flex items-center justify-center gap-2 w-full text-sm"
										title="Go to this list ID"
									>
										<BookmarkPlus size={16}/>
										Open list "{foundListTitle}"
									</Button>
								</div>
							{:else if listExistsInDb === false && !checkingDb}
								<div class="text-sm text-red-400/80 italic px-2 py-1.5 text-center" transition:fade={{ duration: 150 }}>
									List ID not found in database.
								</div>
							{:else if checkError}
								<div class="text-sm text-red-400/80 italic px-2 py-1.5 text-center" transition:fade={{ duration: 150 }}>
									{checkError}
								</div>
							{/if}
						</div>
					{/if}

					<div class="flex-grow flex flex-col gap-4 overflow-hidden">
						<div class="flex flex-col gap-4 flex-grow overflow-hidden" transition:fade={{ duration: 150 }}>
							{#if filteredFavorites.length > 0}
								<div class="flex flex-col min-h-0 flex-shrink-0">
									<div class="flex items-center gap-2 px-2 mb-2 flex-shrink-0">
										<Star class="text-yellow-400" size={16}/>
										<h2 class="text-sm font-medium text-white/80">Favorites</h2>
									</div>
									<Card class="p-2 min-h-0" background="bg-white/5">
										<ScrollArea class="max-h-40" scrollColorClass="bg-white/20">
											<div class="flex flex-col gap-1">
												{#each filteredFavorites as favorite}
													<a
														href={`/list/${favorite.id}`}
														class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors w-full text-left"
													>
														<Star class="text-yellow-400" size={16} fill="currentColor"/>
														<span class="truncate text-white">{favorite.title}</span>
													</a>
												{/each}
											</div>
										</ScrollArea>
									</Card>
								</div>
							{/if}
							{#if filteredHistory.length > 0}
								<div class="flex flex-col min-h-0 flex-grow">
									<div class="flex items-center justify-between px-2 mb-2 flex-shrink-0">
										<div class="flex items-center gap-2">
											<History size={16} class="text-white/80"/>
											<h2 class="text-sm font-medium text-white/80">Recent Lists</h2>
										</div>
										<Button variant="icon" onClick={clearHistory} title="Clear history">
											<X size={16}/>
										</Button>
									</div>
									<Card class="p-2 min-h-0 flex-1" background="bg-white/0">
										<ScrollArea class="h-full" scrollColorClass="bg-white/20">
											<div class="flex flex-col gap-1">
												{#each filteredHistory as item}
													<div class="flex items-center group gap-2">
														<a
															class="flex items-center px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors w-full text-left {currentListId === item.id ? 'bg-white/10' : ''} flex-1"
															href={`/list/${item.id}`}
														>
															<span class="truncate text-white">{item.title}</span>
														</a>
														<Button
															icon={true}
															variant="icon"
															onClick={(e) => handleRemoveHistoryItem(e, item.id)}
														>
															<X size={16}/>
														</Button>
													</div>
												{/each}
											</div>
										</ScrollArea>
									</Card>
								</div>
							{/if}
						</div>
					</div>

					<div class="flex flex-col gap-4 flex-shrink-0">
						<DarkModeSwitch/>
						<Button onClick={createNewList} variant="primary" class="flex items-center justify-center gap-2" title="Create new list">
							<Plus size={20}/>
							New list
						</Button>
					</div>
				</div>
			</Card>
		</div>
	{:else}
		<div class="absolute" transition:fly={{ x: -100, duration: 300 }}>
			<div class="p-4 flex gap-2">
				<Button variant="icon" onClick={toggleSidebar} title="Show sidebar">
					<PanelLeft size={20}/>
				</Button>
				<Button variant="icon" onClick={createNewList} title="Create new list">
					<Plus size={20}/>
				</Button>
			</div>
		</div>
	{/if}
</div>
