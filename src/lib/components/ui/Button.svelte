<!-- Un bouton réutilisable avec des styles cohérents -->
<script lang="ts">
  export let type: "button" | "submit" = "button";
  export let icon: boolean = false;
  export let variant: "primary" | "icon" | "danger" = "primary";
  export let disabled = false;
  export let ariaLabel: string | undefined = undefined;
  export let title: string | undefined = undefined;
  let className = '';
  export { className as class };

  const variants = {
    primary: "bg-white/30 hover:bg-white/40 text-white font-medium border border-white/30 dark:bg-white dark:hover:bg-white/90 dark:text-black dark:border-transparent",
    icon: "text-white hover:opacity-80 dark:text-dark-gray-600 dark:hover:text-dark-foreground",
    danger: "text-white/80 hover:text-red-300 dark:text-dark-gray-600 dark:hover:text-red-400"
  };
</script>

<button
  {type}
  {disabled}
  {title}
  aria-label={ariaLabel}
  class="{className} rounded-lg focus:outline-none focus:ring-white/50 dark:focus:ring-dark-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 {variants[variant]} {icon ? 'p-0' : 'py-2 px-4 focus:ring-2'}"
  on:click
>
  <slot />
</button>