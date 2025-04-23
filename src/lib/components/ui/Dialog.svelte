<!-- Composant Dialog pour afficher un popup de confirmation -->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import Button from './Button.svelte';
  import Card from './Card.svelte';
  import { X } from 'lucide-svelte';

  export let open = false;
  export let title: string;
  export let description: string;
  export let confirmLabel = 'Confirmer';
  export let cancelLabel = 'Annuler';
  export let variant: 'danger' | 'primary' = 'primary';

  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
  }>();

  let dialogElement: HTMLDivElement;

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      dispatch('cancel');
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogElement) {
      dispatch('cancel');
    }
  }
</script>

{#if open}
  <div 
    bind:this={dialogElement}
    class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    transition:fade={{ duration: 150 }}
    on:click={handleBackdropClick}
  >
    <Card 
      class="w-full max-w-md shadow-xl"
      padding="p-0"
    >
      <div class="flex justify-between items-center border-b border-white/10 dark:border-dark-gray-100 p-4">
        <h2 class="text-lg font-semibold text-white dark:text-dark-foreground">{title}</h2>
        <Button 
          variant="icon" 
          icon={true}
          on:click={() => dispatch('cancel')}
          ariaLabel="Close dialog"
        >
          <X size={20} />
        </Button>
      </div>
      <div class="p-4">
        <p class="text-white/90 dark:text-dark-gray-500 mb-6">{description}</p>
        <div class="flex justify-end gap-2">
          <Button
            on:click={() => dispatch('cancel')}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            on:click={() => dispatch('confirm')}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Card>
  </div>
{/if} 