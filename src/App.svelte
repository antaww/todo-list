<script lang="ts">
  import { onMount } from 'svelte';
  import TodoList from './lib/TodoList.svelte';
  import { supabase } from './lib/supabase';
  import Sidebar from './lib/components/Sidebar.svelte';

  let listId: string;
  let error: string | null = null;
  let isSidebarOpen = true;

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
    } catch (e) {
      console.error('Error in App initialization:', e);
      error = 'Failed to initialize application. Please refresh the page.';
    }
  });
</script>

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
