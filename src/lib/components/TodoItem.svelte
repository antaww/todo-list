<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ArrowUp, ArrowDown, Edit2, Trash2 } from 'lucide-svelte';
  import type { Todo } from '../types';
  import Button from './ui/Button.svelte';
  import Input from './ui/Input.svelte';
  import Card from './ui/Card.svelte';

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
      dispatch('startEdit', undefined);
    }
  }
</script>

<Card variant="secondary" padding="p-3">
  <div class="flex items-center gap-2 group">
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
    {:else}
      <div class="w-[68px]" />
    {/if}

    <input
      type="checkbox"
      checked={todo.completed}
      on:change={() => dispatch('toggle', todo)}
      class="w-5 h-5 rounded border-white/50 text-purple-500 focus:ring-purple-500/50 bg-white/20"
    />

    {#if isEditing}
      <Input
        variant="inline"
        bind:value={editingTitle}
        on:blur={() => {
          dispatch('updateTitle', { todo, title: editingTitle });
          dispatch('startEdit', undefined);
        }}
        on:keydown={handleKeydown}
        autofocus
      />
    {:else}
      <span 
        class="flex-1 text-white font-medium cursor-pointer hover:text-white/90 transition-colors {isCompleted ? 'text-white/90' : ''}"
        on:click={() => dispatch('startEdit', todo)}
      >
        {todo.title}
      </span>
    {/if}

    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        variant="icon"
        icon={true}
        on:click={() => dispatch('startEdit', todo)}
        ariaLabel="Edit todo"
      >
        <Edit2 size={20} />
      </Button>
      <Button
        variant="danger"
        icon={true}
        on:click={() => dispatch('delete', todo)}
        ariaLabel="Delete todo"
      >
        <Trash2 size={20} />
      </Button>
    </div>
  </div>
</Card> 