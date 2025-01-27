<!-- Composant principal de la todo list -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import type { RealtimeChannel } from '@supabase/supabase-js';
  import { todosStore } from './stores/todos';
  import { listStore } from './stores/list';
  import { historyStore } from './stores/history';
  import { supabase } from './supabase';
  import Card from './components/ui/Card.svelte';
  import TodoItem from './components/TodoItem.svelte';
  import TodoForm from './components/TodoForm.svelte';
  import TodoHeader from './components/TodoHeader.svelte';

  export let listId: string;

  let subscription: RealtimeChannel[] = [];
  let sortBy: 'name' | 'date' | 'order' = 'order';

  function sortTodos(todos: any[], by: 'name' | 'date' | 'order') {
    return [...todos].sort((a, b) => {
      switch (by) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'date':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        default:
          return a.order - b.order;
      }
    });
  }

  $: activeTodos = sortTodos(
    $todosStore.items.filter(t => !t.completed),
    sortBy
  );

  $: completedTodos = sortTodos(
    $todosStore.items.filter(t => t.completed),
    sortBy
  );

  $: if ($listStore.title) {
    if ($listStore.title !== 'Untitled List') {
      document.title = `${$listStore.title} - Todolist Realtime`;
      historyStore.add(listId, $listStore.title);
    } else {
      document.title = 'Todolist Realtime';
    }
  }

  async function setupRealtimeSubscription() {
    try {
      // Cleanup any existing subscriptions
      for (const sub of subscription) {
        await sub.unsubscribe();
      }
      subscription = [];

      const todosChannel = supabase
        .channel('todos-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'todos',
            filter: `list_id=eq.${listId}`
          },
          async () => {
            if (!$todosStore.editingId) {
              await todosStore.load(listId);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'todos',
            filter: `list_id=eq.${listId}`
          },
          async () => {
            if (!$todosStore.editingId) {
              await todosStore.load(listId);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'todos',
            filter: `list_id=eq.${listId}`
          },
          async () => {
            if (!$todosStore.editingId) {
              await todosStore.load(listId);
            }
          }
        );

      const listsChannel = supabase
        .channel('lists-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'lists',
            filter: `id=eq.${listId}`
          },
          async () => {
            if (!$listStore.isEditing) {
              await listStore.load(listId);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'lists',
            filter: `id=eq.${listId}`
          },
          async () => {
            if (!$listStore.isEditing) {
              await listStore.load(listId);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'lists',
            filter: `id=eq.${listId}`
          },
          async () => {
            if (!$listStore.isEditing) {
              await listStore.load(listId);
            }
          }
        );

      // Subscribe to both channels
      await Promise.all([
        todosChannel.subscribe(),
        listsChannel.subscribe()
      ]);
      
      subscription = [todosChannel, listsChannel];
    } catch (e: unknown) {
      todosStore.setError('Failed to set up real-time updates. Please refresh the page.');
    }
  }

  onMount(async () => {
    todosStore.setLoading(true);
    listStore.setLoading(true);

    await Promise.all([
      listStore.initialize(listId),
      todosStore.load(listId)
    ]);

    await setupRealtimeSubscription();

    todosStore.setLoading(false);
    listStore.setLoading(false);
  });

  onDestroy(() => {
    for (const sub of subscription) {
      sub.unsubscribe().catch(() => {
        // Ignorer les erreurs de désinscription
      });
    }
  });
</script>

<div class="min-h-screen p-4 max-w-2xl mx-auto lg:p-4 pt-20 lg:pt-4">
  <Card padding="p-6">
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
      {listId}
      on:updateTitle={({ detail }) => listStore.updateTitle(detail)}
      on:startEdit={() => listStore.setEditing(true)}
      on:stopEdit={() => listStore.setEditing(false)}
    />

    <TodoForm
      loading={$todosStore.loading}
      on:add={({ detail }) => todosStore.add(listId, detail)}
      on:sort={({ detail }) => sortBy = detail}
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
                on:startEdit={({ detail }) => todosStore.setEditingId(detail?.id ?? null)}
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
                  on:startEdit={({ detail }) => todosStore.setEditingId(detail?.id ?? null)}
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
    @apply min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 bg-fixed overflow-x-hidden;
  }
</style>
