<script lang="ts">
  import { createSwitch, melt } from '@melt-ui/svelte';
  import { onMount } from 'svelte';
  import { Moon, Sun } from 'lucide-svelte';

  const isDark = localStorage.theme === 'dark' || 
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const {
    elements: { root, input },
    states: { checked }
  } = createSwitch({
    defaultChecked: isDark
  });

  // Handle dark mode toggle
  $: if ($checked !== undefined) {
    if ($checked) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  }

  // Watch system preference changes
  onMount(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!('theme' in localStorage)) {
        checked.set(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  });
</script>

<div class="flex items-center gap-2 px-2">
  <Sun size={16} class="text-white/80" />
  <label
    use:melt={$root}
    class="relative inline-flex cursor-pointer items-center"
  >
    <input
      type="checkbox"
      class="peer sr-only"
      use:melt={$input}
    />
    <div
      class="h-6 w-11 rounded-full bg-white/10 border border-white/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-purple-500/30 peer-checked:border-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500/30"
    />
  </label>
  <Moon size={16} class="text-white/80" />
</div> 