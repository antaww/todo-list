<!-- Composant principal de la todo list -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import type { RealtimeChannel } from '@supabase/supabase-js';
  import { todosStore } from './stores/todos';
  import { listStore } from './stores/list';
  import { supabase } from './supabase';
  import Card from './components/ui/Card.svelte';
  import TodoItem from './components/TodoItem.svelte';
  import TodoForm from './components/TodoForm.svelte';
  import TodoHeader from './components/TodoHeader.svelte';

  export let listId: string;
  
  let subscription: RealtimeChannel | null = null;
  let pollingInterval: number | null = null;

  $: activeTodos = $todosStore.items
    .filter(t => !t.completed)
    .sort((a, b) => a.order - b.order);
  
  $: completedTodos = $todosStore.items
    .filter(t => t.completed)
    .sort((a, b) => a.order - b.order);

  $: {
    if ($listStore.title && $listStore.title !== 'Untitled List') {
      document.title = `${$listStore.title} - Todolist Realtime`;
    } else {
      document.title = 'Todolist Realtime';
    }
  }

  async function setupRealtimeSubscription() {
    try {
      if (subscription) {
        await subscription.unsubscribe();
      }

      const todosChannel = supabase.channel('todos-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'todos',
            filter: `list_id=eq.${listId}`
          },
          async () => {
            await todosStore.load(listId);
          }
        );

      const listsChannel = supabase.channel('lists-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'lists',
            filter: `id=eq.${listId}`
          },
          async () => {
            await listStore.initialize(listId);
          }
        );

      await Promise.all([
        todosChannel.subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            todosStore.setError('Real-time connection error. Please refresh the page.');
          }
        }),
        listsChannel.subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            listStore.setError('Real-time connection error. Please refresh the page.');
          }
        })
      ]);

      subscription = todosChannel;
    } catch (e: unknown) {
      todosStore.setError('Failed to set up real-time updates. Please refresh the page.');
    }
  }

  async function startPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    pollingInterval = setInterval(async () => {
      try {
        await Promise.all([
          todosStore.load(listId),
          listStore.initialize(listId)
        ]);
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 1000) as unknown as number;
  }

  onMount(async () => {
    todosStore.setLoading(true);
    listStore.setLoading(true);

    await Promise.all([
      listStore.initialize(listId),
      todosStore.load(listId)
    ]);

    await setupRealtimeSubscription();
    startPolling();

    todosStore.setLoading(false);
    listStore.setLoading(false);
  });

  onDestroy(() => {
    if (subscription) {
      subscription.unsubscribe().catch(() => {
        // Ignorer les erreurs de désinscription
      });
    }
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  });
</script>

<div class="min-h-screen p-4 max-w-2xl mx-auto">
  <Card padding={6}>
    {#if $todosStore.error || $listStore.error}
      <div class="mb-4 p-4 bg-red-500/30 backdrop-blur-sm text-red-50 rounded-lg border border-red-500/30" transition:fade>
        {$todosStore.error || $listStore.error}
        <button 
          class="ml-2 font-bold hover:text-white"
          on:click={() => {
            todosStore.setError(null);
            listStore.setError(null);
          }}
          aria-label="Dismiss error"
        >
          ×
        </button>
      </div>
    {/if}

    <TodoHeader
      title={$listStore.title}
      isEditing={$listStore.isEditing}
      on:updateTitle={({ detail }) => listStore.updateTitle(detail)}
      on:startEdit={() => listStore.setEditing(true)}
      on:stopEdit={() => listStore.setEditing(false)}
    />

    <TodoForm
      loading={$todosStore.loading}
      on:add={({ detail }) => todosStore.add(listId, detail)}
    />

    {#if $todosStore.loading}
      <div class="text-center py-4 text-white font-medium">Loading...</div>
    {:else}
      <section class="space-y-4">
        <div class="space-y-2">
          {#each activeTodos as todo (todo.id)}
            <div animate:flip={{duration: 300}} transition:fade={{duration: 300}}>
              <TodoItem
                {todo}
                isEditing={$todosStore.editingId === todo.id}
                editingTitle={todo.title}
                isFirst={activeTodos.indexOf(todo) === 0}
                isLast={activeTodos.indexOf(todo) === activeTodos.length - 1}
                on:toggle={() => todosStore.toggle(todo)}
                on:delete={() => todosStore.delete(todo)}
                on:moveUp={() => todosStore.move(todo, 'up')}
                on:moveDown={() => todosStore.move(todo, 'down')}
                on:startEdit={() => todosStore.setEditingId(todo.id)}
                on:updateTitle={({ detail: { title } }) => todosStore.updateTitle(todo, title)}
              />
            </div>
          {/each}
        </div>

        {#if completedTodos.length > 0}
          <div class="my-6 border-t border-white/30" />
          
          <div class="space-y-2">
            {#each completedTodos as todo (todo.id)}
              <div animate:flip={{duration: 300}} transition:fade={{duration: 300}}>
                <TodoItem
                  {todo}
                  isEditing={$todosStore.editingId === todo.id}
                  editingTitle={todo.title}
                  isCompleted={true}
                  on:toggle={() => todosStore.toggle(todo)}
                  on:delete={() => todosStore.delete(todo)}
                  on:startEdit={() => todosStore.setEditingId(todo.id)}
                  on:updateTitle={({ detail: { title } }) => todosStore.updateTitle(todo, title)}
                />
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}
  </Card>
</div>

<style>
  :global(html) {
    @apply min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 bg-fixed;
  }
</style>