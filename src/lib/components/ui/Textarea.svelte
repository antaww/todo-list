<script lang="ts">
	import { tick } from 'svelte';
	
	export let value = '';
	export let placeholder = '';
	export let rows = 3;
	export let disabled = false;
	let className = '';
	export {className as class};

	export function focus() {
		textareaElement?.focus();
	}
	let textareaElement: HTMLTextAreaElement;

	// Auto-resize logic
	function adjustTextareaHeight() {
		if (textareaElement) {
			textareaElement.style.height = 'auto'; // Reset height to recalculate
			const newHeight = Math.max(textareaElement.scrollHeight, rows * 20); // Min height based on rows (approx 20px per row)
			textareaElement.style.height = newHeight + 'px';
		}
	}

	$: if (value) {
		// Adjust height on value change, useful for initial render with content
		tick().then(adjustTextareaHeight);
	}
</script>

<textarea
	bind:this={textareaElement}
	bind:value
	{placeholder}
	{rows}
	{disabled}
	class="block w-full rounded-lg bg-black/10 dark:bg-black border border-white/30 dark:border-dark-border focus:ring-2 focus:ring-white/50 dark:focus:ring-dark-gray-300 text-white dark:text-dark-foreground placeholder-white/80 dark:placeholder-dark-gray-600 transition-all duration-150 p-2 sm:p-3 resize-none overflow-hidden {className}"
	on:blur
	on:input={() => {
		adjustTextareaHeight();
		// Forward the input event if needed by parent
	}}
	on:keydown
	on:focus
></textarea>

<style>
	textarea {
		line-height: 1.5; /* Or adjust as per your design */
	}
</style> 