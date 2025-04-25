<script lang="ts">
	export let variant: "primary" | "secondary" = "primary";
	export let padding: string = "p-3";
	export let background: string | null = null;
	let className = '';
	export {className as class};

	const variants = {
		primary: "border-white/30 dark:border-[#333]",
		secondary: "border-white/30 dark:border-[#333]",
	};

	if (!background) {
		if (variant === 'secondary') {
			background = 'bg-white/10 dark:bg-black';
		} else if (variant === 'primary') {
			background = 'bg-white/20 dark:bg-black';
		}
	}
</script>

<div class="backdrop-blur-lg rounded-xl shadow-lg {padding} border transition-all {background} {variants[variant]} {className} dark:shadow-black/50">
	<slot/>
</div>
