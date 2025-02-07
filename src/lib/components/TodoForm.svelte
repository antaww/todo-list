<!-- Formulaire d'ajout de nouvelles tâches -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from './ui/Button.svelte';
  import Input from './ui/Input.svelte';
  import Select from './ui/Select.svelte';
  import { ArrowUp, ArrowDown } from 'lucide-svelte';

  export let loading = false;
  export let hasCompletedTodos = false;
  let newTodoTitle = '';

  const dispatch = createEventDispatcher<{
    add: string;
    sort: 'name' | 'date' | 'order';
  }>();

  let sortBy: 'name' | 'date' | 'order' = 'order';

  const sortOptions = [
    { value: 'order', label: 'Manual Order' },
    { value: 'name', label: 'Name' },
    { value: 'date', label: 'Date' }
  ];

  function handleSubmit() {
    if (!newTodoTitle.trim()) return;
    dispatch('add', newTodoTitle.trim());
    newTodoTitle = '';
  }

  function handleSortChange(event: CustomEvent<string>) {
    sortBy = event.detail as 'name' | 'date' | 'order';
    dispatch('sort', sortBy);
  }
</script>

<div class="mb-6 space-y-2">
  <form 
    on:submit|preventDefault={handleSubmit}
    class="flex gap-2"
  >
    <Input
      bind:value={newTodoTitle}
      placeholder="Add a new todo..."
      disabled={loading}
      maxLength={150}
    />
    <Button
      type="submit"
      disabled={loading || !newTodoTitle.trim()}
      variant="primary"
    >
      Add
    </Button>
  </form>

  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex items-center gap-2 flex-nowrap">
      <span class="text-white whitespace-nowrap dark:text-dark-gray-800">Sort by:</span>
      <Select
        value={sortBy}
        options={sortOptions}
        on:change={handleSortChange}
      />
    </div>
    <div class="flex gap-2">
      <Button
        variant="primary"
        class="!p-2"
        on:click={() => {
          document.getElementById('active-todos')?.scrollIntoView({ behavior: 'smooth' });
        }}
      >
        <ArrowUp size={16} />
      </Button>
      <Button
        variant="primary"
        class="!p-2"
        on:click={() => {
          if (hasCompletedTodos) {
            document.getElementById('completed-todos')?.scrollIntoView({ behavior: 'smooth' });
          } else {
            document.getElementById('active-todos')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }}
      >
        <ArrowDown size={16} />
      </Button>
    </div>
  </div>
</div> 