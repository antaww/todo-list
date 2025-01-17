<!-- En-tête de la todo list avec le titre éditable -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Input from './ui/Input.svelte';
  import Button from './ui/Button.svelte';
  import { Star } from 'lucide-svelte';
  import { favoritesStore } from '../stores/favorites';

  export let title = '';
  export let isEditing = false;
  export let listId = '';

  const dispatch = createEventDispatcher<{
    updateTitle: string;
    startEdit: void;
    stopEdit: void;
  }>();

  $: isFavorite = $favoritesStore.some(f => f.id === listId);

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

  function toggleFavorite() {
    if (isFavorite) {
      favoritesStore.remove(listId);
    } else {
      favoritesStore.add(listId, title);
    }
  }
</script>

<div class="mb-6 flex gap-2 items-center">
  <Button
    variant="icon"
    icon={true}
    on:click={toggleFavorite}
    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    class={isFavorite ? 'text-yellow-400' : 'text-white/30 hover:text-white/50'}
  >
    <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
  </Button>

  <Input
    variant="title"
    bind:value={title}
    placeholder="Loading..."
    on:focus={() => dispatch('startEdit')}
    on:blur={handleBlur}
    on:keydown={handleKeydown}
    class="flex-grow"
  />
</div> 