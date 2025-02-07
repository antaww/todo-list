<script lang="ts">
	import { createScrollArea, melt } from "@melt-ui/svelte";

	let className = "";
	export let scrollColorClass = "bg-cyan-100/20";
	export let container: HTMLDivElement | undefined = undefined;
	export { className as class };

	const {
		elements: { root, content, viewport, corner, scrollbarY, thumbY, thumbX, scrollbarX },
	} = createScrollArea({
		type: "auto",
		dir: "ltr",
	});
</script>

<div {...$$restProps} class="group relative size-full flex-1 overflow-hidden rounded-[inherit] {className}" use:melt={$root}>
	<div bind:this={container} class="size-full" on:scroll use:melt={$viewport}>
		<div class="size-full" use:melt={$content}>
			<slot />
		</div>
	</div>
	<div
		class="flex h-[calc(100%-1rem)] w-2 touch-none select-none border-l border-l-transparent pt-2 opacity-0 transition group-hover:opacity-100"
		use:melt={$scrollbarY}
	>
		<div class="relative right-0.5 flex-1 rounded-lg {scrollColorClass}" use:melt={$thumbY} />
	</div>
	<div
		class="w-[calc(100%-1rem] flex h-2 touch-none select-none border-t border-t-transparent pl-2 opacity-0 transition group-hover:opacity-100"
		use:melt={$scrollbarX}
	>
		<div class="relative bottom-0.5 flex-1 rounded-lg {scrollColorClass}" use:melt={$thumbX} />
	</div>
	<div use:melt={$corner} />
</div> 