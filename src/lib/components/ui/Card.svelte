<!-- Un conteneur avec effet glassmorphism -->
<script lang="ts">
  export let variant: "primary" | "secondary" = "primary";
  export let padding: string = "p-3";
  export let background: string | null = null;
  let className = '';
  export { className as class };

  const variants = {
    primary: "border-white/30",
    secondary: "border-white/30"
  };

  if (!background) {
    if (variant === 'secondary') {
      background = 'bg-white/10';
    } else if (variant === 'primary') {
      background = 'bg-white/20';
    }
  }
</script>

<div class="backdrop-blur-lg rounded-xl shadow-xl {padding} border transition-all {background} {variants[variant]} {className}">
  <slot />
</div> 