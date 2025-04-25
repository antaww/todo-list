<script lang="ts">
  import { AlertTriangle } from 'lucide-svelte';
  export let message: string;
</script>

<div class="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 mb-3 sm:mb-4 text-purple-100 dark:text-gray-100 border-l-4 border-purple-400 dark:border-gray-400 bg-purple-900/30 dark:bg-gray-900/30 backdrop-blur-sm rounded-r-lg" role="alert">
  <AlertTriangle class="w-4 h-4 sm:w-5 sm:h-5" />
  <span class="text-xs sm:text-sm font-medium">{message}</span>
</div> 