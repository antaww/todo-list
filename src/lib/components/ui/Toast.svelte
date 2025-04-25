<script lang="ts">
	import {melt, type ToastsElements} from '@melt-ui/svelte';
	import {AlertCircle, CheckCircle2, Info, X, XCircle} from 'lucide-svelte';
	import {fly} from 'svelte/transition';
	import type {ToastData} from './Toaster.svelte';

	export let id: string;
	export let data: ToastData;
	export let getPercentage: () => number;
	export let elements: ToastsElements;

	const typeToIcon = {
		info: Info,
		success: CheckCircle2,
		error: XCircle,
		warning: AlertCircle,
	};

	const typeToClass = {
		info: 'bg-white/20 dark:bg-black',
		success: 'bg-green-300/20 dark:bg-black',
		error: 'bg-red-300/20 dark:bg-black',
		warning: 'bg-yellow-300/20 dark:bg-black',
	};

	const typeToProgressClass = {
		info: 'bg-white',
		success: 'bg-green-300',
		error: 'bg-red-400',
		warning: 'bg-yellow-300',
	};

	let percentage = 100;

	function updateProgress() {
		percentage = getPercentage();
		if (percentage > 0) {
			requestAnimationFrame(updateProgress);
		}
	}

	updateProgress();

	$: ({
		content,
		title,
		description,
		close,
	} = elements);
</script>

<div
	class="pointer-events-auto flex flex-col gap-3 rounded-lg border border-white/30 p-4 shadow-lg backdrop-blur-lg dark:backdrop-blur-none transition-all overflow-hidden relative {typeToClass[data.type ?? 'info']}"
	in:fly={{ x: 50, duration: 150 }}
	out:fly={{ x: 50, duration: 250 }}
	use:melt={$content(id)}
>
	<div class="flex items-start gap-3">
		<div class="flex-1">
			{#if data.title}
				<h3 use:melt={$title(id)} class="flex items-center gap-2 font-medium text-white">
					<svelte:component this={typeToIcon[data.type ?? 'info']} size={18}/>
					{data.title}
				</h3>
			{/if}
			{#if data.description}
				<div use:melt={$description(id)} class="text-sm text-white/80 dark:text-white">
					{data.description}
				</div>
			{/if}
		</div>
		<button
			aria-label="close notification"
			class="text-white/60 hover:text-white/90 dark:text-white/80 dark:hover:text-white transition-colors"
			use:melt={$close(id)}
		>
			<X size={18}/>
		</button>
	</div>

	<div class="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
		<div
			class="h-full transition-all duration-150 {typeToProgressClass[data.type ?? 'info']}"
			style:width="{percentage}%"
		/>
	</div>
</div>
