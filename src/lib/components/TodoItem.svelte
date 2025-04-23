<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ArrowUp, ArrowDown, Edit2, Trash2 } from 'lucide-svelte';
  import type { Todo } from '../types';
  import Button from './ui/Button.svelte';
  import Input from './ui/Input.svelte';
  import Card from './ui/Card.svelte';
  import Checkbox from '../Checkbox.svelte';

  export let todo: Todo;
  export let isEditing = false;
  export let editingTitle = '';
  export let isFirst = false;
  export let isLast = false;
  export let isCompleted = false;

  const dispatch = createEventDispatcher<{
    toggle: Todo;
    delete: Todo;
    edit: Todo;
    moveUp: Todo;
    moveDown: Todo;
    updateTitle: { todo: Todo; title: string };
    startEdit: Todo | undefined;
  }>();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      dispatch('updateTitle', { todo, title: editingTitle });
    } else if (event.key === 'Escape') {
      dispatch('startEdit', todo);
    }
  }

  let checked = todo.completed;
  $: if (checked !== todo.completed) {
    dispatch('toggle', todo);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }
</script>

<Card variant="secondary" padding="p-3" class="transition-[outline] duration-200 outline outline-1 outline-white/10 dark:outline-dark-border hover:outline-[3px] hover:outline-white/50 dark:hover:outline-dark-gray-300 group/item w-full max-w-full">
  <div class="flex items-center gap-2 w-full overflow-hidden">
    {#if !isCompleted}
      <div class="flex gap-1">
        <Button
          variant="icon"
          icon={true}
          on:click={() => dispatch('moveUp', todo)}
          disabled={isFirst}
          ariaLabel="Move todo up"
        >
          <ArrowUp size={20} />
        </Button>
        <Button
          variant="icon"
          icon={true}
          on:click={() => dispatch('moveDown', todo)}
          disabled={isLast}
          ariaLabel="Move todo down"
        >
          <ArrowDown size={20} />
        </Button>
      </div>
    {/if}

    <Checkbox bind:checked />

    {#if isEditing}
      <Input
        variant="inline"
        bind:value={editingTitle}
        maxLength={150}
        class="min-w-0"
        on:blur={() => {
          dispatch('updateTitle', { todo, title: editingTitle });
          dispatch('startEdit', undefined);
        }}
        on:keydown={handleKeydown}
        autofocus
      />
    {:else}
      <span 
        class="flex-1 text-white dark:text-dark-foreground font-medium cursor-pointer hover:text-white/90 dark:hover:text-dark-gray-800 transition duration-200 rounded px-2 py-1 mx-2 hover:bg-white/10 dark:hover:bg-dark-gray-100 {todo.completed ? 'line-through text-white/50 dark:text-dark-gray-400' : ''} max-w-full break-words min-w-0 overflow-hidden"
        on:click={() => dispatch('startEdit', todo)}
      >
        <span class="block break-words">{todo.title}</span>
        <span class="text-sm text-white/50 dark:text-dark-gray-300">{formatDate(todo.created_at)}</span>
      </span>
    {/if}

    <div class="flex gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity flex-shrink-0">
      <Button
        variant="icon"
        icon={true}
        on:click={() => dispatch('startEdit', todo)}
        ariaLabel="Edit todo"
      >
        <Edit2 size={20} />
      </Button>
      <Button
        variant="icon"
        icon={true}
        on:click={() => dispatch('delete', todo)}
        ariaLabel="Delete todo"
        class="hover:text-red-500 transition-colors"
      >
        <Trash2 size={20} />
      </Button>
    </div>
  </div>
</Card> 