<script lang="ts">
	export let type: "button" | "submit" = "button";
	export let icon: boolean = false;
	export let variant: "primary" | "icon" | "danger" = "primary";
	export let disabled = false;
	export let ariaLabel: string | undefined = undefined;
	export let title: string | undefined = undefined;
	export let onClick: (event: MouseEvent) => void = () => {};
	let className = '';
	export {className as class};

	const variants = {
		primary: "bg-white/30 hover:bg-white/40 text-white font-medium border border-white/30 dark:bg-white dark:hover:bg-white/90 dark:text-black dark:border-transparent",
		icon: "text-white hover:opacity-80 dark:text-dark-gray-600 dark:hover:text-dark-foreground",
		danger: "bg-red-500/70 hover:bg-red-600/80 text-white font-medium border border-red-500/30 dark:bg-red-500 dark:hover:bg-red-600 dark:text-white dark:border-transparent",
	};
</script>

<button
	aria-label={ariaLabel}
	class="rounded-lg focus:outline-none focus:ring-white/50 dark:focus:ring-dark-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 flex items-center justify-center {variants[variant]} {icon ? 'p-0' : 'py-1 sm:py-2 px-2 sm:px-4 focus:ring-2'} {className}"
	{disabled}
	on:click={onClick}
	{title}
	{type}
>
	<slot/>
</button>
