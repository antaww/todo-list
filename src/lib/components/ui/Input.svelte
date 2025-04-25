<script lang="ts">
	import {createEventDispatcher} from 'svelte';

	export let value: string;
	export let placeholder = "";
	export let disabled = false;
	export let variant: "default" | "title" | "inline" = "default";
	export let leftIcon: any = null;
	export let maxLength: number | undefined = undefined;
	export let size: "default" | "sm" = "default";
	let className = '';
	export {className as class};

	let textareaElement: HTMLTextAreaElement;
	const dispatch = createEventDispatcher();

	const variants = {
		default: "px-4 py-2 bg-black/10 dark:bg-black border border-white/30 dark:border-dark-border",
		title: "pr-4 py-2 text-2xl font-bold bg-transparent border-none hover:bg-black/5 dark:hover:bg-dark-gray-100",
		inline: "bg-black/20 dark:bg-black border-none",
	};

	const sizes = {
		default: "px-4 py-2",
		sm: "text-xs px-1.5 py-0.5",
	};

	$: paddingLeft = leftIcon && variant === 'title' ? 'pl-12' : 'pl-2';
	$: sizeClass = sizes[size];

	function adjustTextareaHeight() {
		if (textareaElement) {
			// Reset height to auto to get the correct scrollHeight
			textareaElement.style.height = 'auto';
			// Set the height to match the content
			const newHeight = Math.max(18, textareaElement.scrollHeight);
			textareaElement.style.height = newHeight + 'px';
		}
	}

	$: if (value && variant === 'inline') {
		setTimeout(adjustTextareaHeight, 0);
	}
</script>

<div class="relative w-full">
	<div class="relative">
		{#if leftIcon}
			<div class="absolute left-4 top-1/2 -translate-y-1/2 flex items-center text-white/80 dark:text-dark-gray-600">
				<svelte:component this={leftIcon} size={20} class="animate-spin"/>
			</div>
		{/if}
		{#if variant === 'inline'}
			<textarea
				bind:value
				bind:this={textareaElement}
				{placeholder}
				{disabled}
				maxlength={maxLength}
				rows="1"
				class="relative rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 dark:focus:ring-dark-gray-300 text-white dark:text-dark-foreground placeholder-white/80 dark:placeholder-dark-gray-600 transition-all duration-150 resize-none overflow-hidden align-middle {variants[variant]} {sizeClass} {paddingLeft} {maxLength !== undefined ? 'pr-12' : ''} {className}"
				on:blur={e => dispatch('blur', e)}
				on:focus={e => dispatch('focus', e)}
				on:keydown
				on:input={adjustTextareaHeight}
			/>
		{:else}
			<input
				type="text"
				bind:value
				{placeholder}
				{disabled}
				maxlength={maxLength}
				class="relative rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 dark:focus:ring-dark-gray-300 text-white dark:text-dark-foreground placeholder-white/80 dark:placeholder-dark-gray-600 transition-all duration-150 {variants[variant]} {sizeClass} {paddingLeft} {maxLength !== undefined ? 'pr-12' : ''} {className}"
				on:blur={e => dispatch('blur', e)}
				on:focus={e => dispatch('focus', e)}
				on:keydown
			/>
		{/if}
		{#if maxLength !== undefined}
			<div
				class="absolute right-1 top-1/2 -translate-y-1/2 text-xs text-white/50 dark:text-dark-gray-400"
			>
				{value.length}/{maxLength}
			</div>
		{/if}
	</div>
</div>

<style>
	input, textarea {
		width: 100%;
	}

	textarea {
		line-height: 1.2;
		min-height: 18px;
	}
</style>
