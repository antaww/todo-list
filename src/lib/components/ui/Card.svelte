<!-- Un conteneur avec effet glassmorphism -->
<script lang="ts">
  export let variant: "primary" | "secondary" = "primary";
  export let padding: number = 3;

  const variants = {
    primary: "bg-white/20 border-white/30",
    secondary: "bg-black/10 border-white/30"
  };
</script>

<div class="backdrop-blur-lg rounded-xl shadow-xl p-{padding} border transition-all {variants[variant]}">
  <slot />
</div> 