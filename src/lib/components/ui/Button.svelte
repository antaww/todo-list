<!-- Un bouton réutilisable avec des styles cohérents -->
<script lang="ts">
  export let type: "button" | "submit" = "button";
  export let icon: boolean = false;
  export let variant: "primary" | "icon" | "danger" = "primary";
  export let disabled = false;
  export let ariaLabel: string | undefined = undefined;

  const variants = {
    primary: "bg-white/30 hover:bg-white/40 text-white font-medium border border-white/30",
    icon: "text-white/80 hover:text-white",
    danger: "text-white/80 hover:text-red-300"
  };
</script>

<button
  {type}
  {disabled}
  aria-label={ariaLabel}
  class="rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors {variants[variant]} {icon ? 'p-0' : 'py-2 px-4'}"
  on:click
>
  <slot />
</button>