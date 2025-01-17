<script lang="ts">
  import Button from './ui/Button.svelte';
  import Input from './ui/Input.svelte';
  import Card from './ui/Card.svelte';
  import { Plus, PanelLeftClose, PanelLeft, Star } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';
  import { favoritesStore } from '../stores/favorites';

  let searchValue = '';
  let isOpen = true;
  let currentListId = new URLSearchParams(window.location.search).get('list') || '';

  $: filteredFavorites = $favoritesStore.filter(f => 
    f.title.toLowerCase().includes(searchValue.toLowerCase())
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
  }
</script>

<div class="fixed top-0 left-0 h-screen">
  {#if isOpen}
    <div class="absolute" transition:fly={{ x: -320, duration: 500 }}>
      <Card class="w-80 h-screen !rounded-none border-y-0 border-l-0" padding="p-4">
        <div class="flex flex-col h-full gap-4">
          <div class="flex gap-2">
            <div class="flex-grow">
              <Input bind:value={searchValue} placeholder="Search a list..." variant="default" />
            </div>
            <Button variant="icon" on:click={toggleSidebar} title="Hide sidebar">
              <PanelLeftClose size={20} />
            </Button>
          </div>
          
          <div class="flex-grow border border-white/30 rounded-lg p-2 bg-white/5">
            {#if filteredFavorites.length === 0}
              <div class="text-sm text-white/80 italic">
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
          </div>

          <Button on:click={createNewList} variant="primary" class="flex items-center justify-center gap-2" title="Create new list">
            <Plus size={20} />
            New list
          </Button>
        </div>
      </Card>
    </div>
  {:else}
    <div class="absolute" transition:fly={{ x: -100, duration: 500 }}>
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