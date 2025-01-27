<!-- Select component using Melt UI -->
<script lang="ts">
  import { createSelect, melt } from '@melt-ui/svelte';
  import { fade } from 'svelte/transition';
  import { ChevronDown } from 'lucide-svelte';

  export let value: string;
  export let options: { value: string; label: string }[];

  const {
    elements: { trigger, menu, option },
    states: { selectedLabel, open }
  } = createSelect({
    preventScroll: false,
    defaultSelected: options.find(opt => opt.value === value) || options[0],
    onSelectedChange: ({ curr, next }) => {
      if (next) {
        dispatch('change', next.value);
      }

      return next;
    }
  });

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{
    change: string;
  }>();
</script>

<div class="inline-block">
  <button
    use:melt={$trigger}
    class="flex items-center justify-between gap-2 bg-white/10 text-white border border-white/20 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 min-w-[120px] w-full"
  >
    <span class="truncate">{$selectedLabel}</span>
    <div class="transition-transform duration-200" class:rotate-180={$open}>
      <ChevronDown size={16} />
    </div>
  </button>

  {#if $open}
    <div
      use:melt={$menu}
      transition:fade={{ duration: 100 }}
      class="absolute z-50 mt-1 max-h-60 min-w-[var(--select-trigger-width)] overflow-auto rounded-md bg-white/10 backdrop-blur-lg border border-white/20 p-1 flex flex-col gap-1 shadow shadow-black/20"
    >
      {#each options as item}
        <div
          use:melt={$option(item)}
          class="cursor-pointer relative flex items-center rounded px-2 py-1.5 text-sm text-white outline-none transition-colors data-[highlighted]:bg-white/20 data-[selected]:bg-white/30"
        >
          {item.label}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  :global([data-melt-select-menu]) {
    width: var(--select-trigger-width);
  }
</style> 