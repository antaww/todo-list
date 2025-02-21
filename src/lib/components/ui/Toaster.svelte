<script lang="ts" context="module">
	export type ToastData = {
		title: string;
		description: string;
		type?: 'info' | 'success' | 'error' | 'warning';
	};

	const {
		elements,
		helpers,
		states: { toasts },
		actions: { portal }
	} = createToaster<ToastData>({
		closeDelay: 10_000,
		hover: 'pause'
	});

	export const addToast = helpers.addToast;
</script>

<script lang="ts">
	import { createToaster } from '@melt-ui/svelte';
	import Toast from './Toast.svelte';
</script>

<div use:portal>
	<div class="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 w-full max-w-96 pointer-events-none max-md:top-4 max-md:bottom-auto px-4 md:px-0">
		{#each $toasts as { id, data, createdAt, getPercentage } (id)}
			<Toast
				{id}
				{data}
				{elements}
				getPercentage={getPercentage}
			/>
		{/each}
	</div>
</div>

<style>
	/* Style pour le swipe sur mobile */
	:global([data-melt-toast-swipe='move']) {
		transform: translateX(var(--melt-toast-swipe-move-x)) !important;
		transition: none !important;
	}

	:global([data-melt-toast-swipe='cancel']) {
		transform: translateX(0) !important;
		transition: transform 200ms ease-out !important;
	}

	:global([data-melt-toast-swipe='end']) {
		transform: translateX(-100%) !important;
		transition: transform 200ms ease-out !important;
	}
</style> 