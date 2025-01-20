<script lang="ts">
  import { onMount } from 'svelte';
  import Button from './ui/Button.svelte';
  import Input from './ui/Input.svelte';
  import Card from './ui/Card.svelte';
  import { Plus, PanelLeftClose, PanelLeft, Star, History, X } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';
  import { favoritesStore } from '../stores/favorites';
  import { historyStore } from '../stores/history';

  let searchValue = '';
  let isOpen = false;
  let isMobile = false;
  let currentListId = new URLSearchParams(window.location.search).get('list') || '';

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

  function createNewList() {
    const newListId = crypto.randomUUID();
    window.location.href = `${window.location.pathname}?list=${newListId}`;
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

  function clearHistory() {
    historyStore.clear();
  }
</script>

<div class="fixed top-0 left-0 h-screen z-50">
  {#if isOpen}
    <div class="absolute" transition:fly={{ x: -320, duration: 300 }}>
      <div class="fixed inset-0 bg-black/30 backdrop-blur-lg lg:hidden" on:click={toggleSidebar} transition:fade></div>
      <Card class="w-80 h-screen !rounded-none border-y-0 border-l-0 relative" padding="p-4">
        <div class="flex flex-col h-full gap-4">
          <div class="flex gap-2">
            <div class="flex-grow">
              <Input bind:value={searchValue} placeholder="Search a list..." variant="default" />
            </div>
            <Button variant="icon" on:click={toggleSidebar} title="Hide sidebar">
              <PanelLeftClose size={20} />
            </Button>
          </div>

          <div class="flex-grow flex flex-col gap-4 overflow-hidden">
            <!-- Favoris -->
            <div class="flex-shrink-0">
              <div class="flex items-center gap-2 px-2 mb-2">
                <Star class="text-yellow-400" size={16} />
                <h2 class="text-sm font-medium text-white/80">Favorites</h2>
              </div>
              <Card class="p-2" background="bg-white/5">
                {#if filteredFavorites.length === 0}
                  <div class="text-sm text-white/80 italic px-2 py-1.5">
                    {searchValue ? 'No matching favorites found.' : 'No favorite list yet.'}
                  </div>
                {:else}
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
                {/if}
              </Card>
            </div>

            <!-- Historique -->
            <div class="flex-1 min-h-0">
              <div class="flex items-center justify-between px-2 mb-2">
                <div class="flex items-center gap-2">
                  <History size={16} class="text-white/80" />
                  <h2 class="text-sm font-medium text-white/80">Recent Lists</h2>
                </div>
                {#if $historyStore.length > 0}
                  <Button
                    variant="icon"
                    on:click={clearHistory}
                    title="Clear history"
                    class="text-white/50 hover:text-white/80"
                  >
                    <X size={14} />
                  </Button>
                {/if}
              </div>
              <Card class="p-2 h-full overflow-y-auto" background="bg-white/0">
                {#if filteredHistory.length === 0}
                  <div class="text-sm text-white/80 italic px-2 py-1.5">
                    {searchValue ? 'No matching lists found.' : 'No recent lists.'}
                  </div>
                {:else}
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
                {/if}
              </Card>
            </div>
          </div>

          <Button on:click={createNewList} variant="primary" class="flex items-center justify-center gap-2" title="Create new list">
            <Plus size={20} />
            New list
          </Button>
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
