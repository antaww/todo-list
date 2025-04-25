<script lang="ts">
	import {createCheckbox} from '@melt-ui/svelte';
	import {Check} from 'lucide-svelte';

	export let checked = false;
	export let disabled = false;
	export let label = '';
	export let size = 'h-4 w-4';

	const {
		elements: {
			root,
			input,
		},
		states: {checked: isChecked},
		helpers: {isIndeterminate},
	} = createCheckbox({
		defaultChecked: checked,
		disabled,
	});

	$: checked = !!$isChecked;
</script>

<div class="flex items-center gap-2">
	<button
		aria-label={label}
		class="flex {size} items-center justify-center rounded border border-white/30 bg-white/10 hover:bg-white/20 transition-colors data-[checked]:bg-purple-500 data-[checked]:border-purple-500 data-[checked]:hover:bg-purple-600 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed"
		use:root
	>
		{#if $isChecked}
			<Check class="{size} text-white"/>
		{/if}
		<input aria-hidden="true" class="sr-only" use:input/>
	</button>
	{#if label}
		<label class="text-sm text-white/70">{label}</label>
	{/if}
</div>
