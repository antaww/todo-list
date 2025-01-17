<!-- Un champ de saisie réutilisable avec des styles cohérents -->
<script lang="ts">
  export let value: string;
  export let placeholder = "";
  export let disabled = false;
  export let variant: "default" | "title" | "inline" = "default";
  export let autofocus = false;

  const variants = {
    default: "px-4 py-2 bg-black/10 border border-white/30",
    title: "px-4 py-2 text-2xl font-bold bg-transparent border-none hover:bg-black/5",
    inline: "px-2 py-1 bg-black/20 border-none"
  };
</script>

<input
  type="text"
  bind:value
  {placeholder}
  {disabled}
  {autofocus}
  class="rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/80 transition-colors {variants[variant]}"
  on:blur
  on:focus
  on:keydown
/>

<style>
  input {
    width: 100%;
  }
</style> 