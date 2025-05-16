<script lang="ts">
	import { marked } from 'marked';

	export let content: string = '';

	// Reactive statement to re-process if content changes
	$: processedHtml = marked(content || '');
</script>

<div class="custom-markdown-container">
	{@html processedHtml}
</div>

<style lang="postcss">
	.custom-markdown-container :global(h1),
	.custom-markdown-container :global(h2),
	.custom-markdown-container :global(h3),
	.custom-markdown-container :global(h4),
	.custom-markdown-container :global(h5),
	.custom-markdown-container :global(h6) {
		@apply text-white font-semibold;
		margin-top: 0.75em;
		margin-bottom: 0.5em;
		line-height: 1.3;
	}
	.custom-markdown-container :global(h1) {
		@apply text-3xl;
	}
	.custom-markdown-container :global(h2) {
		@apply text-2xl;
	}
	.custom-markdown-container :global(h3) {
		@apply text-xl;
	}
	.custom-markdown-container :global(h4) {
		@apply text-lg;
	}
	.custom-markdown-container :global(p) {
		@apply text-white/90 my-3 leading-relaxed;
	}
	.custom-markdown-container :global(a) {
		@apply text-blue-400 hover:text-blue-300 hover:underline;
	}
	.custom-markdown-container :global(ul),
	.custom-markdown-container :global(ol) {
		@apply text-white/90 my-3 ml-6;
	}
	.custom-markdown-container :global(ul) {
		list-style-type: disc;
	}
	.custom-markdown-container :global(ol) {
		list-style-type: decimal;
	}
	.custom-markdown-container :global(li) {
		@apply mb-1;
	}
	.custom-markdown-container :global(li > ul),
	.custom-markdown-container :global(li > ol) {
		margin-top: 0.25rem;
		margin-bottom: 0.25rem;
		margin-left: 1rem; /* Further indent nested lists */
	}
	.custom-markdown-container :global(code):not(pre > code) {
		@apply bg-black/50 text-sm text-amber-400 px-1.5 py-0.5 rounded-md font-mono;
	}
	.custom-markdown-container :global(pre) {
		@apply bg-black/60 p-3 my-4 rounded-lg overflow-x-auto shadow;
	}
	.custom-markdown-container :global(pre code) {
		@apply text-sm text-gray-300 font-mono bg-transparent p-0 rounded-none;
	}
	.custom-markdown-container :global(blockquote) {
		@apply border-l-4 border-gray-500 pl-4 py-1 my-4 text-white/70 italic;
	}
	.custom-markdown-container :global(hr) {
		@apply border-t border-white/20 my-6;
	}
	.custom-markdown-container :global(table) {
		@apply w-full my-4 border-collapse border border-white/30;
	}
	.custom-markdown-container :global(th),
	.custom-markdown-container :global(td) {
		@apply border border-white/30 px-3 py-2 text-left text-white/90;
	}
	.custom-markdown-container :global(th) {
		@apply bg-black/20 font-semibold;
	}
	.custom-markdown-container :global(img) {
		@apply max-w-full h-auto my-3 rounded-md shadow;
	}
</style> 