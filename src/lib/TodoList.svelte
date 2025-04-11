<!-- Composant principal de la todo list -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { flip } from 'svelte/animate';
  import type { RealtimeChannel } from '@supabase/supabase-js';
  import { todosStore } from './stores/todos';
  import { listStore } from './stores/list';
  import { historyStore } from './stores/history';
  import { favoritesStore } from './stores/favorites';
  import { displayStore } from './stores/display';
  import { supabase } from './supabase';
  import { ArrowDown, ArrowUp, Loader2 } from 'lucide-svelte';
  import Card from './components/ui/Card.svelte';
  import TodoItem from './components/TodoItem.svelte';
  import TodoForm from './components/TodoForm.svelte';
  import TodoHeader from './components/TodoHeader.svelte';
  import Alert from './components/ui/Alert.svelte';
  import Button from './components/ui/Button.svelte';
  import ScrollArea from './components/ui/ScrollArea.svelte';
  import { FoldHorizontal, UnfoldHorizontal } from 'lucide-svelte';

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
      if ($favoritesStore.some(f => f.id === listId)) {
        favoritesStore.updateTitle(listId, $listStore.title);
      }
      historyStore.updateTitle(listId, $listStore.title);
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

<div class="min-h-screen p-4 {$displayStore ? 'max-w-[80vw]' : 'max-w-2xl'} mx-auto lg:p-4 pt-20 lg:pt-4 transition-all duration-300 relative flex flex-col">
  <Button
    variant="icon"
    icon={true}
    on:click={() => displayStore.toggle()}
    ariaLabel="Toggle wide mode"
    class="fixed top-4 right-4 z-50 backdrop-blur-sm max-lg:hidden"
  >
    {#if $displayStore}
      <FoldHorizontal size={28} />
    {:else}
      <UnfoldHorizontal size={28} />
    {/if}
  </Button>

  <Card class="flex-1 flex flex-col overflow-hidden">
    <div class="flex flex-col gap-4 bg-white/05 border border-white/20 shadow-lg backdrop-blur-sm z-10 p-4 rounded-lg">
      <TodoHeader
        title={$listStore.title}
        {listId}
        on:updateTitle={({ detail }) => listStore.updateTitle(detail)}
        on:startEdit={() => listStore.setEditing(true)}
        on:stopEdit={() => listStore.setEditing(false)}
        on:toggleFavorite={() => {
          if ($favoritesStore.some(f => f.id === listId)) {
            favoritesStore.remove(listId);
          } else {
            favoritesStore.add(listId, $listStore.title);
          }
        }}
      />

      {#if $todosStore.items.length === 0}
        <div transition:fade>
          <Alert message="Anyone with this URL can view and edit this list. Be mindful of what you share!" />
        </div>
      {/if}

      <TodoForm
        loading={$todosStore.loading}
        hasCompletedTodos={completedTodos.length > 0}
        on:add={({ detail }) => todosStore.add(listId, detail)}
        on:sort={({ detail }) => sortBy = detail}
      />
    </div>

    {#if $todosStore.loading}
      <div class="text-center py-4 text-white font-medium flex items-center justify-center gap-2">
        <Loader2 class="animate-spin" size={20} />
        Loading...
      </div>
    {:else}
      <div class="h-[calc(100vh-20rem)] max-w-full">
        <ScrollArea class="h-full" scrollColorClass="bg-white/20">
          <section class="space-y-4 p-4 overflow-hidden {$displayStore ? '' : 'w-[38rem]'}">
            <div class="space-y-2" id="active-todos">
              {#each activeTodos as todo (todo.id)}
                <div animate:flip={{duration: 300}} transition:fade={{duration: 300}} class="w-full">
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

              <div class="space-y-2" id="completed-todos">
                {#each completedTodos as todo (todo.id)}
                  <div animate:flip={{duration: 300}} transition:fade={{duration: 300}} class="w-full">
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
        </ScrollArea>
      </div>
    {/if}
  </Card>
</div>

<style>
  :global(html) {
    @apply min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 bg-fixed overflow-x-hidden;
  }
</style>
