<script lang="ts">
	import {createSwitch, melt} from '@melt-ui/svelte';
	import {Moon, Sun} from 'lucide-svelte';
	import {onMount} from 'svelte';

	const {
		elements: {
			root,
			input,
		},
		states: {checked},
	} = createSwitch();

	const STORAGE_KEY = 'todo-list-theme';
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	const localStorageTheme = localStorage.getItem(STORAGE_KEY);
	const isDark = localStorageTheme ? localStorageTheme === 'dark' : prefersDark;

	let inputElement: HTMLInputElement | undefined = undefined;

	onMount(() => {
		if (isDark) {
			$checked = true;
		}

		// Handle dark mode toggle
		checked.subscribe(checked => {
			if (checked === undefined) return;
			if (checked) {
				document.documentElement.classList.add('dark');
				localStorage.setItem(STORAGE_KEY, 'dark');
			} else {
				document.documentElement.classList.remove('dark');
				localStorage.setItem(STORAGE_KEY, 'light');
			}
		});

		inputElement?.addEventListener('change', () => {
			$checked = !inputElement!.checked;
		});
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
			checked={$checked}
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
