<script lang="ts">
  import { AlertTriangle } from 'lucide-svelte';
  export let message: string;
</script>

<div class="flex items-center gap-3 p-4 mb-4 text-purple-100 dark:text-gray-100 border-l-4 border-purple-400 dark:border-gray-400 bg-purple-900/30 dark:bg-gray-900/30 backdrop-blur-sm rounded-r-lg" role="alert">
  <AlertTriangle class="w-5 h-5" />
  <span class="text-sm font-medium">{message}</span>
</div> 