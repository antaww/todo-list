<script lang="ts">
	import {Loader2, Star, Download, Upload, Trash2, MoreVertical} from 'lucide-svelte';
	import {onMount, onDestroy} from 'svelte';
	import {favoritesStore} from '../stores/favorites';
	import Button from './ui/Button.svelte';
	import Input from './ui/Input.svelte';

	export let title = '';
	export let listId = '';

	// Event props
	export let onUpdateTitle: (newTitle: string) => void = () => {};
	export let onStartEdit: () => void = () => {};
	export let onStopEdit: () => void = () => {};
	export let onToggleFavorite: () => void = () => {};
	export let onExportCsv: () => void = () => {};
	export let onImportCsv: () => void = () => {};
	export let onRequestDeleteList: () => void = () => {};

	$: isFavorite = $favoritesStore.some(f => f.id === listId);
	let isMobileMenuOpen = false;
	let mobileMenuToggleElement: HTMLDivElement;
	let mobileMenuElement: HTMLDivElement;

	function handleBlur() {
		onStopEdit();
		if (title.trim() !== '') {
			onUpdateTitle(title);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			(event.currentTarget as HTMLInputElement).blur();
		}
	}

	function toggleFavorite() {
		isMobileMenuOpen = false;
		onToggleFavorite();
	}

	function exportCsv() {
		isMobileMenuOpen = false;
		onExportCsv();
	}

	function importCsv() {
		isMobileMenuOpen = false;
		onImportCsv();
	}

	function requestDeleteList() {
		isMobileMenuOpen = false;
		onRequestDeleteList();
	}

	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	function handleClickOutside(event: MouseEvent) {
		if (isMobileMenuOpen && mobileMenuToggleElement && !mobileMenuToggleElement.contains(event.target as Node) && mobileMenuElement && !mobileMenuElement.contains(event.target as Node)) {
			isMobileMenuOpen = false;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside, true);
	});

	onDestroy(() => {
		document.removeEventListener('click', handleClickOutside, true);
	});

	let loadingPlaceholder = '';
	$: loadingPlaceholder = title === '' ? 'Loading...' : '';
</script>

<!-- En-tête de la todo list avec le titre éditable -->
<div class="sm:mb-4 flex gap-1 sm:gap-2 items-center">
	<Button
		class="!text-yellow-400"
		icon={true}
		onClick={toggleFavorite}
		title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
		variant="icon"
	>
		<Star class="block" fill={isFavorite ? 'currentColor' : 'none'} size={20}/>
	</Button>

	<div class="flex-grow">
		<Input
			bind:value={title}
			class="flex-grow text-lg"
			leftIcon={title === '' ? Loader2 : null}
			onBlur={handleBlur}
			onFocus={onStartEdit}
			onKeydown={handleKeydown}
			placeholder={loadingPlaceholder}
			variant="title"
		/>
	</div>

	<!-- Desktop buttons -->
	<div class="hidden sm:flex items-center gap-1 sm:gap-2">
		<Button
			class="flex items-center gap-2"
			onClick={importCsv}
			title="Import from CSV"
			variant="icon"
		>
			<Upload size={20}/>
			Import
		</Button>

		<Button
			class="flex items-center gap-2"
			onClick={exportCsv}
			title="Export as CSV"
			variant="icon"
		>
			<Download size={20}/>
			Export
		</Button>

		<Button
			class="!text-red-500 flex items-center gap-2"
			onClick={requestDeleteList}
			title="Delete list"
			variant="icon"
		>
			<Trash2 size={20}/>
			Delete
		</Button>
	</div>

	<!-- Mobile menu button -->
	<div class="sm:hidden relative">
		<div bind:this={mobileMenuToggleElement}>
			<Button
				onClick={toggleMobileMenu}
				variant="icon"
				title="More options"
				icon={true}
			>
				<MoreVertical size={20}/>
			</Button>
		</div>

		{#if isMobileMenuOpen}
			<div
				bind:this={mobileMenuElement}
				class="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-background rounded-md shadow-lg z-20 border border-white/10 dark:border-dark-border py-1"
			>
				<button
					on:click={importCsv}
					class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-dark-foreground hover:bg-gray-100 dark:hover:bg-dark-gray-200 flex items-center gap-2"
				>
					<Upload size={16}/> Import from CSV
				</button>
				<button
					on:click={exportCsv}
					class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-dark-foreground hover:bg-gray-100 dark:hover:bg-dark-gray-200 flex items-center gap-2"
				>
					<Download size={16}/> Export as CSV
				</button>
				<button
					on:click={requestDeleteList}
					class="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-500 hover:bg-gray-100 dark:hover:bg-dark-gray-200 flex items-center gap-2"
				>
					<Trash2 size={16}/> Delete list
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	:global(.loader-icon) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
