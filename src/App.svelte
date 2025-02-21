<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import TodoList from './lib/TodoList.svelte';
  import { supabase } from './lib/supabase';
  import Sidebar from './lib/components/Sidebar.svelte';
  import { startLastSeenTracking } from './lib/helpers/lastSeen';
  import Toaster from './lib/components/ui/Toaster.svelte';

  let listId: string;
  let error: string | null = null;
  let isSidebarOpen = true;
  let cleanup: (() => void) | null = null;

  onMount(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      listId = urlParams.get('list') || crypto.randomUUID();
      
      if (!urlParams.get('list')) {
        const newUrl = `${window.location.pathname}?list=${listId}`;
        window.history.pushState({ listId }, '', newUrl);
      }

      void supabase.from('todos').select('count', { count: 'exact', head: true })
        .then(() => {
          console.log('Supabase connection verified in App component');
        })
        .catch((err: Error) => {
          console.error('Supabase connection error in App:', err);
          error = 'Database connection error. Please refresh the page.';
        });

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

<Toaster />

<div class="min-h-screen">
  <Sidebar bind:isOpen={isSidebarOpen} />
  <main class="transition-[margin] duration-500 {isSidebarOpen ? 'lg:ml-80' : ''} flex min-h-screen items-center justify-center lg:p-8">
    <div class="w-full">
      {#if error}
        <div class="p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      {:else if listId}
        <TodoList {listId} />
      {/if}
    </div>
  </main>
</div>
