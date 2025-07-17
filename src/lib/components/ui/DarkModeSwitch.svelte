<script lang="ts">
	import { browser } from '$app/environment';
	import { persistentStore } from '$stores/persistent'; // Adjust path if necessary
	import { createSwitch, melt } from '@melt-ui/svelte';
	import { Moon, Sun } from 'lucide-svelte';
	import { onMount } from 'svelte';

	const THEME_STORAGE_KEY = 'todo-list-theme';

	// Create a persistent store for the theme
	// Initial value is null, will be determined onMount
	const themeStore = persistentStore<'dark' | 'light' | null>(THEME_STORAGE_KEY, null);

	const {
		elements: {
			root,
			input,
		},
		states: { checked },
	} = createSwitch();

	let inputElement: HTMLInputElement | undefined = undefined;

	onMount(() => {
		let currentTheme = $themeStore;

		if (!currentTheme && browser) { // No theme stored, check system preference
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			currentTheme = prefersDark ? 'dark' : 'light';
			$themeStore = currentTheme; // Save the determined theme
		} else if (!currentTheme) {
			// Fallback if not in browser environment
			currentTheme = 'light';
			$themeStore = currentTheme;
		}

		$checked = currentTheme === 'dark';

		// Apply initial theme to document
		if ($checked) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}

		// Handle dark mode toggle when switch state changes
		const unsubscribe = checked.subscribe(isChecked => {
			if (isChecked === undefined) return; // Initial undefined state from createSwitch

			if (isChecked) {
				document.documentElement.classList.add('dark');
				$themeStore = 'dark';
			} else {
				document.documentElement.classList.remove('dark');
				$themeStore = 'light';
			}
		});

		return () => {
			unsubscribe(); // Clean up the subscription
		};
	});

</script>

<div class="flex items-center gap-2 px-2">
	<Sun class="text-white/80" size={16}/>
	<label
		class="relative inline-flex cursor-pointer items-center"
		use:melt={$root}
	>
		<input
			bind:this={inputElement}
			bind:checked={$checked}
			class="peer sr-only"
			type="checkbox"
			use:melt={$input}
		/>
		<div
			class="h-6 w-11 rounded-full bg-purple-500/20 border border-white/30
			dark:bg-white/10 dark:border-white/20
			after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-['']
			dark:peer-focus:ring-gray-500/30 dark:peer-checked:bg-gray-500/30 dark:peer-checked:border-gray-500
			peer-checked:bg-purple-500/30 peer-checked:border-purple-500
			peer-checked:after:translate-x-full peer-checked:after:border-white
			peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500/30"
		/>
	</label>
	<Moon class="text-white/80" size={16}/>
</div>
