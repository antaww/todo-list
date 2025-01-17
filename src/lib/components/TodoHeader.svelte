<!-- En-tête de la todo list avec le titre éditable -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Input from './ui/Input.svelte';

  export let title = '';
  export let isEditing = false;

  const dispatch = createEventDispatcher<{
    updateTitle: string;
    startEdit: void;
    stopEdit: void;
  }>();

  function handleBlur() {
    dispatch('stopEdit');
    if (title.trim() !== '') {
      dispatch('updateTitle', title);
    }
  }

  function handleKeydown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }
</script>

<div class="mb-6">
  <Input
    variant="title"
    bind:value={title}
    placeholder="List title..."
    on:focus={() => dispatch('startEdit')}
    on:blur={handleBlur}
    on:keydown={handleKeydown}
  />
</div> 