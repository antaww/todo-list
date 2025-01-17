<script lang="ts">
  import Button from './ui/Button.svelte';
  import Input from './ui/Input.svelte';
  import Card from './ui/Card.svelte';
  import { Plus } from 'lucide-svelte';

  let searchValue = '';

  function createNewList() {
    const newListId = crypto.randomUUID();
    window.location.href = `${window.location.pathname}?list=${newListId}`;
  }
</script>

<Card class="fixed top-0 left-0 w-80 h-screen rounded-none border-y-0 border-l-0" padding="p-4">
  <div class="flex flex-col h-full gap-4">
    <div class="w-full">
      <Input bind:value={searchValue} placeholder="Rechercher une liste..." variant="default" />
    </div>
    
    <div class="flex-grow border border-white/30 rounded-lg p-4 bg-white/5">
      <div class="text-sm text-white/80 italic">
        Aucune liste sauvegardée pour le moment
      </div>
    </div>

    <Button on:click={createNewList} variant="primary" class="flex items-center justify-center gap-2">
      <Plus size={20} />
      Nouvelle liste
    </Button>
  </div>
</Card> 