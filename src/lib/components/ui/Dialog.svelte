<script lang="ts">
	import {X} from 'lucide-svelte';
	import {onMount} from 'svelte';
	import {fade} from 'svelte/transition';
	import Button from './Button.svelte';
	import Card from './Card.svelte';

	export let open = false;
	export let title: string = '';
	export let description: string = '';
	export let confirmLabel: string = 'Confirm';
	export let cancelLabel: string = 'Cancel';
	export let variant: 'danger' | 'primary' = 'primary';
	export let showCloseButton: boolean = true;

	export let onConfirm: (() => void) | undefined = undefined;
	export let onCancel: (() => void) | undefined = undefined;

	let dialogElement: HTMLDivElement;

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			e.preventDefault();
			if (onCancel) {
				onCancel();
			}
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === dialogElement) {
			if (onCancel) {
				onCancel();
			}
		}
	}

	function doCancel() {
		if (onCancel) {
			onCancel();
		}
	}

	function doConfirm() {
		if (onConfirm) {
			onConfirm();
		}
	}
</script>

{#if open}
	<div
		bind:this={dialogElement}
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		transition:fade={{duration: 150}}
		on:click={handleBackdropClick}
	>
		<Card
			class="w-full max-w-md shadow-xl"
			padding="p-0"
		>
			<div class="flex justify-between items-center border-b border-white/10 dark:border-dark-gray-100 p-4">
				{#if $$slots.title}
					<slot name="title"></slot>
				{:else if title}
					<h2 class="text-lg font-semibold text-white dark:text-dark-foreground">{title}</h2>
				{/if}
				{#if showCloseButton}
					<Button
						variant="icon"
						icon={true}
						onClick={doCancel}
						ariaLabel="Close dialog"
					>
						<X size={20}/>
					</Button>
				{/if}
			</div>
			<div class="p-4">
				{#if description}
					<p class="text-white/90 dark:text-dark-gray-500 mb-6">{description}</p>
				{/if}
				<slot />
				{#if $$slots.footer}
					<div class="flex justify-end gap-2 mt-6">
						<slot name="footer"></slot>
					</div>
				{:else}
					{#if confirmLabel || cancelLabel}
						<div class="flex justify-end gap-2 mt-6">
							{#if cancelLabel}
								<Button onClick={doCancel}>
									{cancelLabel}
								</Button>
							{/if}
							{#if confirmLabel}
								<Button
									variant={variant}
									onClick={doConfirm}
								>
									{confirmLabel}
								</Button>
							{/if}
						</div>
					{/if}
				{/if}
			</div>
		</Card>
	</div>
{/if}
