<script lang="ts">
  import { onMount } from 'svelte';
  import TodoList from './lib/TodoList.svelte';
  import { supabase } from './lib/supabase';

  let listId: string;
  let error: string | null = null;

  onMount(() => {
    try {
      // Get list ID from URL or generate a new one
      const urlParams = new URLSearchParams(window.location.search);
      listId = urlParams.get('list') || crypto.randomUUID();
      
      if (!urlParams.get('list')) {
        // Update URL with the new list ID
        const newUrl = `${window.location.pathname}?list=${listId}`;
        window.history.pushState({ listId }, '', newUrl);
      }

      // Test Supabase connection
      void supabase.from('todos').select('count', { count: 'exact', head: true })
        .then(() => {
          console.log('Supabase connection verified in App component');
        })
        .catch(err => {
          console.error('Supabase connection error in App:', err);
          error = 'Database connection error. Please refresh the page.';
        });
    } catch (e) {
      console.error('Error in App initialization:', e);
      error = 'Failed to initialize application. Please refresh the page.';
    }
  });
</script>

<main class="min-h-screen bg-gray-100">
  {#if error}
    <div class="max-w-2xl mx-auto p-4 mt-4">
      <div class="p-4 bg-red-100 text-red-700 rounded-lg">
        {error}
      </div>
    </div>
  {:else if listId}
    <TodoList {listId} />
  {/if}
</main>

<style>
  :global(html) {
    background-color: theme(colors.gray.100);
  }
</style>