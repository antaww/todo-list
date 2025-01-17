<script lang="ts">
  import { flip } from 'svelte/animate';
  import { fade } from 'svelte/transition';
  import { onMount, onDestroy } from 'svelte';
  import type { RealtimeChannel } from '@supabase/supabase-js';
  import { Trash2, ArrowUp, ArrowDown } from 'lucide-svelte';
  import { supabase } from './supabase';
  import type { Todo } from './types';

  export let listId: string;
  
  let todos: Todo[] = [];
  let newTodoTitle = '';
  let loading = true;
  let error: string | null = null;
  let subscription: RealtimeChannel | null = null;
  let listTitle = '';
  let titleInput: HTMLElement;
  let pollingInterval: number | null = null;
  let isEditingTitle = false;

  // Computed properties
  $: activeTodos = todos
    .filter(t => !t.completed)
    .sort((a, b) => a.order - b.order);
  
  $: completedTodos = todos
    .filter(t => t.completed)
    .sort((a, b) => a.order - b.order);

  $: {
    if (listTitle && listTitle !== 'Untitled List') {
      document.title = `${listTitle} - Todolist Realtime`;
    } else {
      document.title = 'Todolist Realtime';
    }
  }

  // Fonction pour mettre à jour l'ordre des tâches
  async function updateTodosOrder(items: Todo[]) {
    try {
      const updates = items.map((todo, index) => ({
        id: todo.id,
        order: index,
        title: todo.title,
        completed: todo.completed,
        list_id: todo.list_id
      }));

      const { error: supabaseError } = await supabase
        .from('todos')
        .upsert(updates);

      if (supabaseError) throw supabaseError;
    } catch (e) {
      error = 'Failed to update todo order';
      await loadTodos();
    }
  }

  async function toggleTodo(todo: Todo) {
    const newCompleted = !todo.completed;
    const newOrder = newCompleted ? completedTodos.length : activeTodos.length;
    
    // Mise à jour immédiate du front avec transition
    const newTodos = [...todos];
    const todoIndex = newTodos.findIndex(t => t.id === todo.id);
    if (todoIndex !== -1) {
      newTodos[todoIndex] = {
        ...newTodos[todoIndex],
        completed: newCompleted,
        order: newOrder
      };
      todos = newTodos;
    }

    try {
      const { error: supabaseError } = await supabase
        .from('todos')
        .update({ 
          completed: newCompleted,
          order: newOrder
        })
        .eq('id', todo.id);

      if (supabaseError) throw supabaseError;
    } catch (e) {
      error = 'Failed to update todo';
      await loadTodos(); // Revert en cas d'erreur
    }
  }

  function handleTitleClick() {
    titleInput?.focus();
  }

  function handleTitleBlur() {
    isEditingTitle = false;
    if (listTitle.trim() !== '') {
      updateListTitle();
    }
  }

  function handleTitleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      titleInput?.blur();
    }
  }

  let retryCount = 0;
  const MAX_RETRIES = 3;

  async function setupRealtimeSubscription() {
    try {
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Canal pour les todos
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
            await loadTodos();
          }
        );

      // Canal pour les listes
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
            await loadListTitle();
          }
        );

      // Souscription aux deux canaux
      await Promise.all([
        todosChannel.subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            error = 'Real-time connection error. Please refresh the page.';
          }
        }),
        listsChannel.subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            error = 'Real-time connection error. Please refresh the page.';
          }
        })
      ]);

      // Sauvegarder les références pour le nettoyage
      subscription = todosChannel;
    } catch (e: unknown) {
      error = 'Failed to set up real-time updates. Please refresh the page.';
    }
  }

  async function loadListTitle() {
    try {
      // Ne pas mettre à jour le titre pendant l'édition
      if (isEditingTitle) return;

      const { data, error: supabaseError } = await supabase
        .from('lists')
        .select('title')
        .eq('id', listId)
        .single();

      if (supabaseError) {
        if (supabaseError.code === '42P01') {
          listTitle = 'Untitled List';
          return;
        }
        throw supabaseError;
      }
      listTitle = data?.title || 'Untitled List';
    } catch (e) {
      listTitle = 'Untitled List';
    }
  }

  async function updateListTitle() {
    if (!listTitle.trim()) {
      listTitle = 'Untitled List';
      return;
    }

    try {
      // Vérifier d'abord si la liste existe
      const { data: currentData } = await supabase
        .from('lists')
        .select('title')
        .eq('id', listId)
        .single();

      if (!currentData) {
        // Si la liste n'existe pas, la créer
        const { error: insertError } = await supabase
          .from('lists')
          .insert([{
            id: listId,
            title: listTitle.trim()
          }]);

        if (insertError) throw insertError;
        return;
      }

      // Si le titre est le même, ne rien faire
      if (currentData.title === listTitle.trim()) {
        return;
      }

      // Si le titre a changé, faire la mise à jour
      const { error: updateError } = await supabase
        .from('lists')
        .update({ title: listTitle.trim() })
        .eq('id', listId);

      if (updateError) throw updateError;
    } catch (e) {
      error = 'Failed to update list title';
    }
  }

  async function ensureListsTableExists() {
    try {
      // Vérifier si la table existe déjà
      const { error: checkError } = await supabase
        .from('lists')
        .select('id')
        .limit(1);

      // Si pas d'erreur, la table existe déjà
      if (!checkError) return;

      // Si la table n'existe pas, la créer directement via SQL
      const { error: createError } = await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS lists (
            id text PRIMARY KEY,
            title text NOT NULL DEFAULT 'Untitled List',
            created_at timestamptz DEFAULT now()
          );
          
          ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY "Allow public access on lists"
            ON lists
            FOR ALL
            TO public
            USING (true)
            WITH CHECK (true);
        `
      });

      if (createError) {
        throw new Error('Failed to create lists table');
      }
    } catch (e) {
      throw new Error('Failed to ensure lists table exists');
    }
  }

  async function initializeApp() {
    try {
      loading = true;
      error = null;

      const { error: testError } = await supabase
        .from('todos')
        .select('count', { count: 'exact', head: true });

      if (testError) {
        throw new Error('Database connection failed');
      }
      
      await ensureListsTableExists();

      // Vérifier si la liste existe et la créer si nécessaire
      const { data: listData } = await supabase
        .from('lists')
        .select('id')
        .eq('id', listId)
        .single();

      if (!listData) {
        const { error: insertError } = await supabase
          .from('lists')
          .insert([{
            id: listId,
            title: 'Untitled List'
          }]);

        if (insertError) throw insertError;
      }

      await Promise.all([loadTodos(), loadListTitle()]);
      await setupRealtimeSubscription();
    } catch (e) {
      error = e instanceof Error ? e.message : 'An error occurred while initializing';
    } finally {
      loading = false;
    }
  }

  async function startPolling() {
    // Arrêter l'ancien intervalle si existant
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Créer un nouvel intervalle
    pollingInterval = setInterval(async () => {
      try {
        await Promise.all([loadTodos(), loadListTitle()]);
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 1000) as unknown as number;
  }

  onMount(() => {
    initializeApp();
    startPolling();
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

  async function loadTodos() {
    try {
      const { data, error: supabaseError } = await supabase
        .from('todos')
        .select('*')
        .eq('list_id', listId)
        .order('order');
      
      if (supabaseError) throw supabaseError;
      
      todos = data || [];
    } catch (e) {
      throw new Error('Failed to load todos');
    }
  }

  async function addTodo() {
    if (!newTodoTitle.trim()) return;

    // Création d'un ID temporaire unique
    const tempId = 'temp_' + Date.now();
    
    // Ajout immédiat au front
    const newTodo: Todo = {
      id: tempId,
      title: newTodoTitle.trim(),
      completed: false,
      order: activeTodos.length,
      list_id: listId,
      created_at: new Date().toISOString()
    };

    todos = [...todos, newTodo];
    newTodoTitle = '';

    try {
      // Vérifier si la liste existe déjà
      const { data: listData } = await supabase
        .from('lists')
        .select('id')
        .eq('id', listId)
        .single();

      // Si la liste n'existe pas, la créer
      if (!listData) {
        const { error: listError } = await supabase
          .from('lists')
          .insert([{
            id: listId,
            title: listTitle.trim() || 'Untitled List'
          }]);

        if (listError) throw listError;
      }

      // Ajouter le todo
      const { data, error: supabaseError } = await supabase
        .from('todos')
        .insert([{
          title: newTodo.title,
          completed: newTodo.completed,
          order: newTodo.order,
          list_id: newTodo.list_id
        }])
        .select();

      if (supabaseError) throw supabaseError;
      
      // Mise à jour de l'ID une fois qu'on a la réponse de la DB
      if (data && data[0]) {
        todos = todos.map(t => t.id === tempId ? { ...t, id: data[0].id } : t);
      }
    } catch (e) {
      error = 'Failed to add todo';
      todos = todos.filter(t => t.id !== tempId); // Retirer l'item temporaire en cas d'erreur
    }
  }

  async function deleteTodo(todo: Todo) {
    // Mise à jour immédiate du front
    todos = todos.filter(t => t.id !== todo.id);

    try {
      const { error: supabaseError } = await supabase
        .from('todos')
        .delete()
        .eq('id', todo.id);

      if (supabaseError) throw supabaseError;
    } catch (e) {
      error = 'Failed to delete todo';
      await loadTodos(); // Revert en cas d'erreur
    }
  }

  async function moveTodoUp(todo: Todo) {
    const currentIndex = activeTodos.findIndex(t => t.id === todo.id);
    if (currentIndex <= 0) return;

    // Mise à jour immédiate du front
    const newTodos = [...todos];
    const activeIndex = newTodos.findIndex(t => t.id === todo.id);
    const prevIndex = newTodos.findIndex(t => t.id === activeTodos[currentIndex - 1].id);
    
    const temp = newTodos[prevIndex].order;
    newTodos[prevIndex].order = newTodos[activeIndex].order;
    newTodos[activeIndex].order = temp;
    todos = newTodos;

    try {
      const updates = [
        {
          id: newTodos[activeIndex].id,
          order: newTodos[activeIndex].order,
          title: newTodos[activeIndex].title,
          completed: newTodos[activeIndex].completed,
          list_id: newTodos[activeIndex].list_id
        },
        {
          id: newTodos[prevIndex].id,
          order: newTodos[prevIndex].order,
          title: newTodos[prevIndex].title,
          completed: newTodos[prevIndex].completed,
          list_id: newTodos[prevIndex].list_id
        }
      ];

      const { error: supabaseError } = await supabase
        .from('todos')
        .upsert(updates);

      if (supabaseError) throw supabaseError;
    } catch (e) {
      error = 'Failed to move todo';
      await loadTodos(); // Revert en cas d'erreur
    }
  }

  async function moveTodoDown(todo: Todo) {
    const currentIndex = activeTodos.findIndex(t => t.id === todo.id);
    if (currentIndex === -1 || currentIndex === activeTodos.length - 1) return;

    // Mise à jour immédiate du front
    const newTodos = [...todos];
    const activeIndex = newTodos.findIndex(t => t.id === todo.id);
    const nextIndex = newTodos.findIndex(t => t.id === activeTodos[currentIndex + 1].id);
    
    const temp = newTodos[nextIndex].order;
    newTodos[nextIndex].order = newTodos[activeIndex].order;
    newTodos[activeIndex].order = temp;
    todos = newTodos;

    try {
      const updates = [
        {
          id: newTodos[activeIndex].id,
          order: newTodos[activeIndex].order,
          title: newTodos[activeIndex].title,
          completed: newTodos[activeIndex].completed,
          list_id: newTodos[activeIndex].list_id
        },
        {
          id: newTodos[nextIndex].id,
          order: newTodos[nextIndex].order,
          title: newTodos[nextIndex].title,
          completed: newTodos[nextIndex].completed,
          list_id: newTodos[nextIndex].list_id
        }
      ];

      const { error: supabaseError } = await supabase
        .from('todos')
        .upsert(updates);

      if (supabaseError) throw supabaseError;
    } catch (e) {
      error = 'Failed to move todo';
      await loadTodos(); // Revert en cas d'erreur
    }
  }

  function handleTitleFocus() {
    isEditingTitle = true;
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
  <div class="max-w-2xl mx-auto backdrop-blur-lg bg-white/30 rounded-xl shadow-xl p-6 border border-white/20">
    {#if error}
      <div class="mb-4 p-4 bg-red-500/20 backdrop-blur-sm text-red-100 rounded-lg border border-red-500/20" transition:fade>
        {error}
        <button 
          class="ml-2 font-bold"
          on:click={() => error = null}
          aria-label="Dismiss error"
        >
          ×
        </button>
      </div>
    {/if}

    <div class="mb-6">
      <input
        type="text"
        bind:value={listTitle}
        bind:this={titleInput}
        placeholder="List title..."
        on:focus={handleTitleFocus}
        on:blur={handleTitleBlur}
        on:keydown={handleTitleKeydown}
        class="w-full px-4 py-2 text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg hover:bg-white/10 transition-colors text-white placeholder-white/70"
      />
    </div>

    <form 
      on:submit|preventDefault={addTodo}
      class="mb-6 flex gap-2"
    >
      <input
        type="text"
        bind:value={newTodoTitle}
        placeholder="Add a new todo..."
        class="flex-1 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 bg-white/20 border border-white/20 text-white placeholder-white/70"
        disabled={loading}
      />
      <button
        type="submit"
        class="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 transition-colors"
        disabled={loading || !newTodoTitle.trim()}
      >
        Add
      </button>
    </form>

    {#if loading}
      <div class="text-center py-4 text-white">Loading...</div>
    {:else}
      <section class="space-y-4">
        <div class="space-y-2">
          {#each activeTodos as todo (todo.id)}
            <div
              animate:flip={{duration: 300}}
              transition:fade={{duration: 300}}
              class="todo-item flex items-center gap-2 p-3 backdrop-blur-md bg-white/20 rounded-lg border border-white/20 shadow-lg hover:shadow-xl transition-all group"
            >
              <div class="flex gap-1">
                <button
                  on:click={() => moveTodoUp(todo)}
                  class="text-white/60 hover:text-white transition-colors"
                  aria-label="Move todo up"
                  disabled={activeTodos.indexOf(todo) === 0}
                >
                  <ArrowUp size={20} />
                </button>
                <button
                  on:click={() => moveTodoDown(todo)}
                  class="text-white/60 hover:text-white transition-colors"
                  aria-label="Move todo down"
                  disabled={activeTodos.indexOf(todo) === activeTodos.length - 1}
                >
                  <ArrowDown size={20} />
                </button>
              </div>
              <input
                type="checkbox"
                checked={todo.completed}
                on:change={() => toggleTodo(todo)}
                class="w-5 h-5 rounded border-white/30 text-purple-500 focus:ring-purple-500/50 bg-white/20"
              />
              <span class="flex-1 text-white">
                {todo.title}
              </span>
              <button
                on:click={() => deleteTodo(todo)}
                class="text-white/60 hover:text-red-400 transition-colors"
                aria-label="Delete todo"
              >
                <Trash2 size={20} />
              </button>
            </div>
          {/each}
        </div>

        {#if completedTodos.length > 0}
          <div class="my-6 border-t border-white/20" />
          
          <div class="space-y-2">
            {#each completedTodos as todo (todo.id)}
              <div
                animate:flip={{duration: 300}}
                transition:fade={{duration: 300}}
                class="todo-item flex items-center gap-2 p-3 backdrop-blur-md bg-white/10 rounded-lg border border-white/10 group"
              >
                <div class="w-[68px]"></div>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  on:change={() => toggleTodo(todo)}
                  class="w-5 h-5 rounded border-white/30 text-purple-500 focus:ring-purple-500/50 bg-white/20"
                />
                <span class="flex-1 text-white/60">
                  {todo.title}
                </span>
                <button
                  on:click={() => deleteTodo(todo)}
                  class="text-white/40 hover:text-red-400 transition-colors"
                  aria-label="Delete todo"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}
  </div>
</div>

<style>
  :global(html) {
    @apply min-h-screen bg-gradient-to-br from-blue-500 to-purple-600;
  }
  
  input[type="checkbox"] {
    @apply rounded border-white/30 text-purple-500 focus:ring-purple-500/50 bg-white/20;
  }

  /* Ajout d'une transition douce pour l'opacité */
  :global(.todo-item) {
    transition: opacity 0.3s ease-in-out;
  }
</style>