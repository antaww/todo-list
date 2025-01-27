<!-- Formulaire d'ajout de nouvelles tâches -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from './ui/Button.svelte';
  import Input from './ui/Input.svelte';
  import Select from './ui/Select.svelte';

  export let loading = false;
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
    />
    <Button
      type="submit"
      disabled={loading || !newTodoTitle.trim()}
    >
      Add
    </Button>
  </form>

  <div class="flex items-center gap-2">
    <span class="text-white text-sm">Sort by:</span>
    <Select
      value={sortBy}
      options={sortOptions}
      on:change={handleSortChange}
    />
  </div>
</div> 