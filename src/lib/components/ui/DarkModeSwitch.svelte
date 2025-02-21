<script lang="ts">
	import { createSwitch, melt } from '@melt-ui/svelte';
	import { Moon, Sun } from 'lucide-svelte';
	import { onMount } from 'svelte';

	const {
		elements: { root, input },
		states: { checked }
	} = createSwitch();

	let inputElement: HTMLInputElement | undefined = undefined;
	
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	const localStorageTheme = localStorage.getItem('theme');
	const isDark = localStorageTheme ? localStorageTheme === 'dark' : prefersDark;
	
	onMount(() => {
		if (isDark) {
			$checked = true;
		}

		// Handle dark mode toggle
		checked.subscribe((checked) => {
			if (checked === undefined) return;
			if (checked) {
				document.documentElement.classList.add('dark');
				localStorage.setItem('theme', 'dark');
			} else {
				document.documentElement.classList.remove('dark');
				localStorage.setItem('theme', 'light');
			}
		});

		inputElement?.addEventListener('change', () => {
			$checked = !inputElement!.checked;
		});
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
			checked={$checked}
			bind:this={inputElement}
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
	<Moon size={16} class="text-white/80" />
</div> 