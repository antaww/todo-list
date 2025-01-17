<!-- Formulaire d'ajout de nouvelles tâches -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from './ui/Button.svelte';
  import Input from './ui/Input.svelte';

  export let loading = false;
  let newTodoTitle = '';

  const dispatch = createEventDispatcher<{
    add: string;
  }>();

  function handleSubmit() {
    if (!newTodoTitle.trim()) return;
    dispatch('add', newTodoTitle.trim());
    newTodoTitle = '';
  }
</script>

<form 
  on:submit|preventDefault={handleSubmit}
  class="mb-6 flex gap-2"
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