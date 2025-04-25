<script lang="ts">
  import { onMount } from 'svelte';
  import Button from './ui/Button.svelte';
  import Input from './ui/Input.svelte';
  import Card from './ui/Card.svelte';
  import { Plus, PanelLeftClose, PanelLeft, Star, History, X, BookmarkPlus, Loader2 } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';
  import { favoritesStore } from '../stores/favorites';
  import { historyStore } from '../stores/history';
  import DarkModeSwitch from './ui/DarkModeSwitch.svelte';
  import ScrollArea from './ui/ScrollArea.svelte';
  import { supabase } from '../supabase';
  import { debounce } from '../helpers/debounce';

  export let isOpen = false;
  let searchValue = '';
  let isMobile = false;
  let currentListId = '';

  let checkingDb = false;
  let listExistsInDb: boolean | null = null;
  let foundListTitle: string | null = null;
  let checkError: string | null = null;

  onMount(() => {
    currentListId = new URLSearchParams(window.location.search).get('list') || '';

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

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  });

  $: filteredFavorites = $favoritesStore.filter(f =>
    f.title.toLowerCase().includes(searchValue.toLowerCase())
  );

  $: filteredHistory = $historyStore.filter(h =>
    h.title.toLowerCase().includes(searchValue.toLowerCase())
  );

  const debouncedCheckSupabase = debounce(async (id: string) => {
    if (!id) return;
    checkingDb = true;
    listExistsInDb = null;
    foundListTitle = null;
    checkError = null;
    try {
      const { data, error } = await supabase
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
    window.location.href = `${window.location.pathname}?list=${newListId}`;
    if (isMobile) {
      isOpen = false;
    }
    searchValue = '';
  }

  function toggleSidebar() {
    isOpen = !isOpen;
  }

  function openList(id: string) {
    window.location.href = `${window.location.pathname}?list=${id}`;
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
</script>

<div class="fixed top-0 left-0 h-screen z-50">
  <div 
    class="fixed inset-0 bg-black/30 backdrop-blur-lg lg:hidden transition-all duration-300 pointer-events-none {isOpen ? '' : 'opacity-0'}" 
    on:click={toggleSidebar}
  />
  {#if isOpen}
    <div class="absolute" transition:fly={{ x: -320, duration: 300 }}>
      <Card class="w-80 h-screen !rounded-none border-y-0 border-l-0 relative" padding="p-4">
        <div class="flex flex-col h-full gap-4">
          <div class="flex gap-2">
            <div class="flex-grow">
              <Input bind:value={searchValue} placeholder="Search or enter list ID..." variant="default" />
            </div>
            <Button variant="icon" on:click={toggleSidebar} title="Hide sidebar">
              <PanelLeftClose size={20} />
            </Button>
          </div>

          {#if searchValue.trim()}
            <div class="flex-shrink-0">
              {#if checkingDb}
                <div class="flex items-center justify-center gap-2 w-full text-sm text-white/60 p-2">
                  <Loader2 size={16} class="animate-spin" />
                  Checking database for ID...
                </div>
              {:else if listExistsInDb === true && !checkingDb && !filteredFavorites.some(f => f.id === searchValue.trim()) && !filteredHistory.some(h => h.id === searchValue.trim())}
                 <div transition:fade={{ duration: 150 }}>
                  <Button
                    variant="primary"
                    on:click={goToListFromUUID}
                    class="flex items-center justify-center gap-2 w-full text-sm"
                    title="Go to this list ID"
                  >
                    <BookmarkPlus size={16} />
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
                    <Star class="text-yellow-400" size={16} />
                    <h2 class="text-sm font-medium text-white/80">Favorites</h2>
                  </div>
                  <Card class="p-2 min-h-0" background="bg-white/5">
                    <ScrollArea class="max-h-40" scrollColorClass="bg-white/20">
                      <div class="flex flex-col gap-1">
                        {#each filteredFavorites as favorite}
                          <button
                            transition:fade={{ duration: 150 }}
                            class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors w-full text-left {currentListId === favorite.id ? 'bg-white/10' : ''}"
                            on:click={() => openList(favorite.id)}
                          >
                            <Star class="text-yellow-400" size={16} fill="currentColor" />
                            <span class="truncate text-white">{favorite.title}</span>
                          </button>
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
                      <History size={16} class="text-white/80" />
                      <h2 class="text-sm font-medium text-white/80">Recent Lists</h2>
                    </div>
                    <Button variant="icon" on:click={clearHistory} title="Clear history">
                      <X size={16} />
                    </Button>
                  </div>
                  <Card class="p-2 min-h-0 flex-1" background="bg-white/0">
                    <ScrollArea class="h-full" scrollColorClass="bg-white/20">
                      <div class="flex flex-col gap-1">
                        {#each filteredHistory as item}
                          <button
                            transition:fade={{ duration: 150 }}
                            class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors w-full text-left {currentListId === item.id ? 'bg-white/10' : ''}"
                            on:click={() => openList(item.id)}
                          >
                            <span class="truncate text-white">{item.title}</span>
                          </button>
                        {/each}
                      </div>
                    </ScrollArea>
                  </Card>
                </div>
              {/if}
            </div>
          </div>

          <div class="flex flex-col gap-4 flex-shrink-0">
            <DarkModeSwitch />
            <Button on:click={createNewList} variant="primary" class="flex items-center justify-center gap-2" title="Create new list">
              <Plus size={20} />
              New list
            </Button>
          </div>
        </div>
      </Card>
    </div>
  {:else}
    <div class="absolute" transition:fly={{ x: -100, duration: 300 }}>
      <div class="p-4 flex gap-2">
        <Button variant="icon" on:click={toggleSidebar} title="Show sidebar">
          <PanelLeft size={20} />
        </Button>
        <Button variant="icon" on:click={createNewList} title="Create new list">
          <Plus size={20} />
        </Button>
      </div>
    </div>
  {/if}
</div>
