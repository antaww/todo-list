<!-- Un champ de saisie réutilisable avec des styles cohérents -->
<script lang="ts">
  import { scale } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';
  export let value: string;
  export let placeholder = "";
  export let disabled = false;
  export let variant: "default" | "title" | "inline" = "default";
  export let autofocus = false;
  export let leftIcon: any = null;
  let className = '';
  export { className as class };

  let isFocused = false;
  const dispatch = createEventDispatcher();

  const variants = {
    default: "px-4 py-2 bg-black/10 border border-white/30",
    title: "pr-4 py-2 text-2xl font-bold bg-transparent border-none hover:bg-black/5",
    inline: "px-2 py-1 bg-black/20 border-none"
  };

  $: paddingLeft = leftIcon && variant === 'title' ? 'pl-12' : 'pl-4';

  function handleFocus() {
    isFocused = true;
  }

  function handleBlur() {
    isFocused = false;
  }
</script>

<div class="relative w-full">
  {#if isFocused}
    <div
      class="absolute inset-0 bg-white/5 rounded-lg -m-[2px]"
      transition:scale={{duration: 150, start: 0.98}}
    />
  {/if}
  <div class="relative">
    {#if leftIcon}
      <div class="absolute left-4 top-1/2 -translate-y-1/2 flex items-center text-white/80">
        <svelte:component this={leftIcon} size={20} class="animate-spin" />
      </div>
    {/if}
    <input
      type="text"
      bind:value
      {placeholder}
      {disabled}
      {autofocus}
      class="relative rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/80 transition-all duration-150 {variants[variant]} {paddingLeft} {className}"
      on:blur={(e) => {
        handleBlur();
        dispatch('blur', e);
      }}
      on:focus={(e) => {
        handleFocus();
        dispatch('focus', e);
      }}
      on:keydown
    />
  </div>
</div>

<style>
  input {
    width: 100%;
  }
</style>
