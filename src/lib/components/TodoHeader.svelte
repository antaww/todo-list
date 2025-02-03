<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import Input from './ui/Input.svelte'
  import Button from './ui/Button.svelte'
  import { Star, Loader2 } from 'lucide-svelte'
  import { favoritesStore } from '../stores/favorites'

  export let title = ''
  export let listId = ''

  const dispatch = createEventDispatcher<{
    updateTitle: string
    startEdit: void
    stopEdit: void
    toggleFavorite: void
  }>()

  $: isFavorite = $favoritesStore.some((f) => f.id === listId)

  function handleBlur() {
    dispatch('stopEdit')
    if (title.trim() !== '') {
      dispatch('updateTitle', title)
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault()
      ;(event.currentTarget as HTMLInputElement).blur()
    }
  }

  function toggleFavorite() {
    dispatch('toggleFavorite')
  }

  let loadingPlaceholder = ''
  $: loadingPlaceholder = title === '' ? 'Loading...' : ''
</script>

<style>
  :global(.loader-icon) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>

<!-- En-tête de la todo list avec le titre éditable -->
<div class="mb-6 flex gap-2 items-center">
  <Button
    variant="icon"
    icon={true}
    on:click={toggleFavorite}
    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    class={isFavorite ? 'text-yellow-400' : 'text-white/30 hover:text-white/50'}>
    <Star size={20} fill={isFavorite ? 'currentColor' : 'none'} />
  </Button>

  <div class="flex-grow">
    <Input
      variant="title"
      bind:value={title}
      placeholder={loadingPlaceholder}
      on:focus={() => dispatch('startEdit')}
      on:blur={handleBlur}
      on:keydown={handleKeydown}
      class="flex-grow"
      leftIcon={title === '' ? Loader2 : null} />
  </div>
</div>
