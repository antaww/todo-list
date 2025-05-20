<script lang="ts">
    import type {RealtimeChannel} from '@supabase/supabase-js';
    import {Copy, FoldHorizontal, Loader2, Trash2, UnfoldHorizontal} from 'lucide-svelte';
    import {onDestroy, onMount, tick} from 'svelte';
    import {dragHandleZone} from 'svelte-dnd-action';
    import {flip} from 'svelte/animate';
    import {fade} from 'svelte/transition';
    import TodoForm from '@components/TodoForm.svelte';
    import TodoHeader from '@components/TodoHeader.svelte';
    import TodoItem from '@components/TodoItem.svelte';
    import Alert from '@components/ui/Alert.svelte';
    import Button from '@components/ui/Button.svelte';
    import Card from '@components/ui/Card.svelte';
    import Dialog from '@components/ui/Dialog.svelte';
    import Input from '@components/ui/Input.svelte';
    import ScrollArea from '@components/ui/ScrollArea.svelte';
    import {addToast} from '@components/ui/Toaster.svelte';
    import {displayStore} from '$stores/display';
    import {favoritesStore} from '$stores/favorites';
    import {historyStore} from '$stores/history';
    import {listStore} from '$stores/list';
    import {todosStore} from '$stores/todos';
    import {supabase} from '$lib/supabase';
    import type {Todo} from '$lib/types';
    import { sortBy, sortDirection } from '$stores/sort';
    import TodoDetailModal from '@components/TodoDetailModal.svelte';
    import { exportToCsv, importFromCsv } from '$helpers/data';
    import { browser } from '$app/environment';

    export let listId: string;

    let previousListId: string | null = null;
    let subscription: RealtimeChannel[] = [];
    let deleteDialogOpen = false;
    let searchQuery = '';
    let isTouchDevice = false;
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let allowDragViaLongPress = false;
    let successfullyLongPressedTodoId: string | null = null;
    let currentTargetTodoIdForLongPress: string | null = null;
    const LONG_PRESS_DURATION = 500;
    let touchStartCoords: { x: number, y: number } | null = null;
    const TOUCH_MOVE_THRESHOLD = 10;

    const flipDurationMs = 300;
    let isDragging = false;
    let isUpdatingOrder = false;

    let activeDndItems: Todo[] = [];
    let completedDndItems: Todo[] = [];

    let isModalOpen = false;
    let selectedTodoIdForModal: string | null = null;
    $: selectedTodoForModal = selectedTodoIdForModal ? $todosStore.items.find(t => t.id === selectedTodoIdForModal) || null : null;

    let showDeleteListDialog = false;
    let deleteConfirmListName = '';

    function sortTodos(todos: Todo[], by: 'name' | 'date' | 'order' | 'difficulty', direction: 'asc' | 'desc'): Todo[] {
        const sorted = [...todos].sort((a, b) => {
            let comparison = 0;
            switch (by) {
                case 'name':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'date':
                    comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                    break;
                case 'difficulty':
                    comparison = (a.difficulty ?? 0) - (b.difficulty ?? 0);
                    break;
                default:
                    comparison = (a.order ?? 0) - (b.order ?? 0);
                    break;
            }
            return comparison;
        });

        if (direction === 'desc') {
            return sorted.reverse();
        }
        return sorted;
    }

    function fuzzyMatch(text: string, pattern: string): boolean {
        if (!pattern.trim()) return true;

        const searchLower = pattern.toLowerCase();
        const textLower = text.toLowerCase();

        let j = 0;
        for (let i = 0; i < textLower.length && j < searchLower.length; i++) {
            if (textLower[i] === searchLower[j]) {
                j++;
            }
        }

        return j === searchLower.length;
    }

    $: filteredTodos = searchQuery
                       ? $todosStore.items.filter(todo => fuzzyMatch(todo.title, searchQuery))
                       : $todosStore.items;
    $: activeTodos = sortTodos(filteredTodos.filter(t => !t.completed), $sortBy, $sortDirection);
    $: completedTodos = sortTodos(filteredTodos.filter(t => t.completed), $sortBy, $sortDirection);

    $: dndDragDisabled = $sortBy !== 'order';

    $: if (!isDragging && !isUpdatingOrder) {
        activeDndItems = [...activeTodos];
        completedDndItems = [...completedTodos];
    }

    function handleDndConsiderActive(e: CustomEvent<{items: Todo[]}>): void {
        isDragging = true;
        activeDndItems = e.detail.items;
        successfullyLongPressedTodoId = null;
    }

    function handleDndFinalizeActive(e: CustomEvent<{items: Todo[]}>): void {
        const originalItems = [...activeDndItems];
        activeDndItems = e.detail.items;
        isUpdatingOrder = true;
        updateTodoOrders(activeDndItems, false, originalItems).finally(() => {
            isUpdatingOrder = false;
            if (isTouchDevice) {
                allowDragViaLongPress = false;
            }
            successfullyLongPressedTodoId = null;
        });
    }

    function handleDndConsiderCompleted(e: CustomEvent<{items: Todo[]}>): void {
        isDragging = true;
        completedDndItems = e.detail.items;
        successfullyLongPressedTodoId = null;
    }

    function handleDndFinalizeCompleted(e: CustomEvent<{items: Todo[]}>): void {
        const originalItems = [...completedDndItems];
        completedDndItems = e.detail.items;
        isUpdatingOrder = true;
        updateTodoOrders(completedDndItems, true, originalItems).finally(() => {
            isUpdatingOrder = false;
            if (isTouchDevice) {
                allowDragViaLongPress = false;
            }
            successfullyLongPressedTodoId = null;
        });
    }

    async function updateTodoOrders(items: Todo[], completed: boolean, originalItems: Todo[]): Promise<void> {
        const updatedTodos = items.map((todo, index) => ({
            ...todo,
            order: index,
            completed,
        }));

        try {
            const updates = updatedTodos.map(todo => ({
                id: todo.id,
                order: todo.order,
                title: todo.title,
                completed: todo.completed,
                list_id: todo.list_id,
            }));

            const {error} = await supabase.from('todos').upsert(updates);

            if (error) {
                console.error('Failed to update todo order:', error);
                addToast({
                    data: {
                        title: 'Error',
                        description: 'Failed to save new order. Reverting.',
                        type: 'error',
                    },
                });
                if (completed) {
                    completedDndItems = originalItems;
                } else {
                    activeDndItems = originalItems;
                }
            }
        } catch (error) {
            console.error('Error initiating todo order update:', error);
            addToast({
                data: {
                    title: 'Error',
                    description: 'Failed to start order update. Reverting.',
                    type: 'error',
                },
            });
            if (completed) {
                completedDndItems = originalItems;
            } else {
                activeDndItems = originalItems;
            }
        }
        deleteDialogOpen = false;
        addToast({
            data: {
                title: 'Tasks deleted',
                description: `Successfully deleted ${completedDndItems.length} completed ${completedDndItems.length === 1 ? 'task' : 'tasks'}.`,
                type: 'success',
            },
        });
    }

    function openDeleteDialog(): void {
        deleteDialogOpen = true;
    }

    function handleConfirmDelete(): void {
        const tasksToDelete = completedDndItems.length;
        todosStore.deleteAllCompleted(listId);
        deleteDialogOpen = false;
        addToast({
            data: {
                title: 'Tasks deleted',
                description: `Successfully deleted ${tasksToDelete} completed ${tasksToDelete === 1 ? 'task' : 'tasks'}.`,
                type: 'success',
            },
        });
    }

    function handleCancelDelete(): void {
        deleteDialogOpen = false;
    }

    function handleTouchStart(event: TouchEvent, todo: Todo): void {
        if (!isTouchDevice || $sortBy !== 'order') return;

        currentTargetTodoIdForLongPress = todo.id;
        touchStartCoords = { x: event.touches[0].clientX, y: event.touches[0].clientY };

        if (longPressTimer) {
            clearTimeout(longPressTimer);
        }

        longPressTimer = setTimeout(() => {
            if (currentTargetTodoIdForLongPress === todo.id) {
                allowDragViaLongPress = true;
                successfullyLongPressedTodoId = todo.id;
            }
            longPressTimer = null;
        }, LONG_PRESS_DURATION);
    }

    function handleTouchMove(event: TouchEvent): void {
        if (!isTouchDevice || !touchStartCoords || !currentTargetTodoIdForLongPress) return;

        if (!longPressTimer) return;

        const touchCurrentCoords = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        const deltaX = Math.abs(touchCurrentCoords.x - touchStartCoords.x);
        const deltaY = Math.abs(touchCurrentCoords.y - touchStartCoords.y);

        if (deltaX > TOUCH_MOVE_THRESHOLD || deltaY > TOUCH_MOVE_THRESHOLD) {
            clearTimeout(longPressTimer!);
            longPressTimer = null;
            allowDragViaLongPress = false;
            successfullyLongPressedTodoId = null;
            touchStartCoords = null;
            currentTargetTodoIdForLongPress = null;
        }
    }

    function handleTouchEnd(): void {
        if (!isTouchDevice) return;

        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        touchStartCoords = null;
        currentTargetTodoIdForLongPress = null;
    }

    function handleExportCsv(): void {
        if ($todosStore.items.length === 0) {
            addToast({
                data: {
                    title: 'Cannot Export',
                    description: 'There are no todos in the list to export.',
                    type: 'warning',
                },
            });
            return;
        }
        const fileName = $listStore.title ? `${$listStore.title.replace(/[^a-z0-9]/gi, '_')}.csv` : 'todos.csv';
        exportToCsv($todosStore.items, fileName);
        addToast({
            data: {
                title: 'Export Successful',
                description: `Todos exported to ${fileName}`,
                type: 'success',
            },
        });
    }

    async function handleImportCsv() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';

        input.onchange = async (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
                const file = target.files[0];
                try {
                    const importedData = await importFromCsv(file);
                    if (!Array.isArray(importedData) || importedData.length === 0) {
                        addToast({
                            data: {
                                title: 'Import Failed',
                                description: 'CSV file is empty or not in the expected format.',
                                type: 'error',
                            },
                        });
                        return;
                    }

                    let importedCount = 0;
                    for (const item of importedData) {
                        const title = typeof item.title === 'string' ? item.title.trim() : null;
                        if (!title) {
                            console.warn('Skipping row due to missing title:', item);
                            continue;
                        }

                        const completed = String(item.completed).toLowerCase() === 'true' || item.completed === '1';
                        const difficulty = parseInt(String(item.difficulty), 10);

                        await todosStore.add(listId, {
                            title,
                            difficulty: isNaN(difficulty) ? 0 : Math.max(0, Math.min(5, difficulty)),
                        });
                        importedCount++;
                    }

                    addToast({
                        data: {
                            title: 'Import Successful',
                            description: `${importedCount} todo(s) imported from ${file.name}`,
                            type: 'success',
                        },
                    });
                } catch (error: any) {
                    console.error('Error importing CSV:', error);
                    addToast({
                        data: {
                            title: 'Import Failed',
                            description: error.message || 'Could not process the CSV file.',
                            type: 'error',
                        },
                    });
                }
            }
        };
        input.click();
    }

    async function setupRealtimeSubscription(currentListId: string) {
        try {
            for (const sub of subscription) { await sub.unsubscribe(); }
            subscription = [];

            const todosChannel =
				supabase.channel(`todos-changes-${currentListId}`)
                .on(
                	'postgres_changes',
                    {
                    	event: '*',
                        schema: 'public',
                        table: 'todos',
                        filter: `list_id=eq.${currentListId}`,
                    },
                    async (payload) => {
                        if (!$todosStore.editingId) {
                            await todosStore.load(currentListId);
                        }
                    },
                );

            const listsChannel =
				supabase.channel(`lists-changes-${currentListId}`)
                .on(
                	'postgres_changes',
                    {
                    	event: '*',
                        schema: 'public',
                        table: 'lists',
                        filter: `id=eq.${currentListId}`,
					},
                    async () => {
                    	if (!$listStore.isEditing) { await listStore.load(currentListId); }
                    },
                );

            await Promise.all([
                todosChannel.subscribe(),
                listsChannel.subscribe(),
            ]);
            subscription =
                [
                    todosChannel,
                    listsChannel,
                ];
        } catch (e: unknown) {
            todosStore.setError('Failed to set up real-time updates.');
        }
    }

    async function initializeList(currentListId: string) {
        if (!currentListId) return;

        todosStore.setLoading(true);
        listStore.setLoading(true);

        await Promise.all([
            listStore.initialize(currentListId),
            todosStore.load(currentListId),
        ]);
        await setupRealtimeSubscription(currentListId);

        todosStore.setLoading(false);
        listStore.setLoading(false);

        isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

		const urlParams = new URLSearchParams(window.location.search);
		const taskIdFromUrl = urlParams.get('task_id');

		if (taskIdFromUrl) {
			const todoToOpen = $todosStore.items.find(t => t.id === taskIdFromUrl);
			if (todoToOpen) {
				openTodoDetailModal(todoToOpen);
				await tick();
				const element = document.getElementById(`todo-item-${taskIdFromUrl}`);
				if (element) {
					element.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			}
		}
    }

    onMount(async () => {
        isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (listId) {
            previousListId = listId;
            await initializeList(listId);
        }
    });

    $: if (browser && listId && listId !== previousListId) {
        previousListId = listId;
        initializeList(listId);
    }

    // Reactive block to update document.title based on the current list's title
    $: if (browser && $listStore.id === listId && $listStore.title) {
        if ($listStore.title !== 'Untitled List') {
            document.title = `${$listStore.title} - Todolist Realtime`;
        } else {
            document.title = 'Todolist Realtime';
        }
    }

    onDestroy(() => {
        for (const sub of subscription) {
            sub.unsubscribe().catch(() => {
            });
        }
    });

    function handleModalUpdateTodoDifficulty(detail: { todo: Todo; difficulty: number }) {
        if (detail.todo && typeof detail.difficulty === 'number') {
            todosStore.updateDifficulty(detail.todo, detail.difficulty);
            addToast({
                data: {
                    title: 'Difficulty Updated',
                    description: `Task "${detail.todo.title}" difficulty set to ${detail.difficulty}.`,
                    type: 'success'
                }
            });
        }
    }

    function handleModalUpdateTodoDescription(detail: { todo: Todo; description: string }) {
        if (detail.todo) {
            todosStore.updateDescription(detail.todo, detail.description);
            addToast({
                data: {
                    title: 'Description Updated',
                    description: `Task "${detail.todo.title}" description updated.`,
                    type: 'success'
                }
            });
        }
    }

    function openTodoDetailModal(todo: Todo) {
        selectedTodoIdForModal = todo.id;
        isModalOpen = true;
    }

    function handleCloseModal(): void {
        isModalOpen = false;
        selectedTodoIdForModal = null;

		const url = new URL(window.location.href);
        url.searchParams.delete('task_id');
        window.history.pushState({}, '', url.toString());
    }

    async function actualDeleteList() {
        try {
            const { error: todosError } = await supabase
                .from('todos')
                .delete()
                .match({ list_id: listId });

            if (todosError) {
                console.error('Error deleting todos for list:', todosError);
                addToast({
                    data: {
                        title: 'Error',
                        description: 'Failed to delete tasks in the list. List not deleted.',
                        type: 'error',
                    },
                });
                return;
            }

            const { error: listError } = await supabase
                .from('lists')
                .delete()
                .match({ id: listId });

            if (listError) {
                console.error('Error deleting list:', listError);
                addToast({
                    data: {
                        title: 'Error',
                        description: 'Failed to delete the list.',
                        type: 'error',
                    },
                });
                return;
            }

            const deletedListTitle = $listStore.title;
            favoritesStore.remove(listId);
            historyStore.remove(listId);

            addToast({
                data: {
                    title: 'List Deleted',
                    description: `List "${deletedListTitle}" and all its tasks have been deleted.`,
                    type: 'success',
                },
            });

            window.location.href = '/';

        } catch (error) {
            console.error('Failed to delete list:', error);
            addToast({
                data: {
                    title: 'Error',
                    description: 'An unexpected error occurred while deleting the list.',
                    type: 'error',
                },
            });
        }
    }

    function openDeleteListDialog() {
        deleteConfirmListName = '';
        showDeleteListDialog = true;
    }

    function confirmDeleteListDeletion() {
        if (deleteConfirmListName === $listStore.title) {
            actualDeleteList();
            showDeleteListDialog = false;
        } else {
            addToast({
                data: {
                    title: 'Incorrect Name',
                    description: 'The entered name does not match the list name. Deletion cancelled.',
                    type: 'warning',
                },
            });
        }
    }

    function cancelDeleteListDeletion() {
        showDeleteListDialog = false;
    }

    async function copyListNameForDialog() {
        try {
            await navigator.clipboard.writeText($listStore.title);
            addToast({ data: { title: 'Copied!', description: 'List name copied to clipboard.', type: 'info' } });
        } catch (err) {
            console.error('Failed to copy list name: ', err);
            addToast({ data: { title: 'Copy Failed', description: 'Could not copy list name.', type: 'error' } });
        }
    }
</script>

<div class="min-h-[92svh] max-h-[92svh] p-4 sm:p-4 {$displayStore ? 'sm:max-w-[80vw]' : 'sm:max-w-2xl'} mx-auto lg:p-4 pt-16 sm:pt-20 lg:pt-4 transition-all duration-300 relative flex flex-col">
    <Button
        ariaLabel="Toggle wide mode"
        class="fixed top-4 right-4 z-50 backdrop-blur-sm max-lg:hidden"
        icon={true}
        onClick={() => displayStore.toggle()}
        variant="icon"
    >
        {#if $displayStore}
            <FoldHorizontal size={28}/>
        {:else}
            <UnfoldHorizontal size={28}/>
        {/if}
    </Button>

    <Card class="flex-1 flex flex-col overflow-hidden">
        <div class="flex flex-col sm:gap-4 bg-white/05 border border-white/20 shadow-lg backdrop-blur-sm z-10 p-2 sm:p-4 rounded-lg">
            <TodoHeader
                {listId}
                onStartEdit={() => listStore.setEditing(true)}
                onStopEdit={() => listStore.setEditing(false)}
                onToggleFavorite={() => {
                    if ($favoritesStore.some(f => f.id === listId)) {
                        favoritesStore.remove(listId);
                    } else {
                        favoritesStore.add(listId, $listStore.title);
                    }
                }}
                onUpdateTitle={(newTitle) => listStore.updateTitle(newTitle)}
                onExportCsv={handleExportCsv}
                onImportCsv={handleImportCsv}
                onRequestDeleteList={openDeleteListDialog}
                title={$listStore.title}
            />

            {#if $todosStore.items.length === 0}
                <div transition:fade>
                    <Alert message="Anyone with this URL can view and edit this list. Be mindful of what you share!"/>
                </div>
            {/if}

            <TodoForm
                hasCompletedTodos={completedDndItems.length > 0}
                loading={$todosStore.loading}
                searchResultsCount={searchQuery ? filteredTodos.length : undefined}
                onAdd={(detail) => todosStore.add(listId, detail)}
                onSearch={(newSearchQuery) => searchQuery = newSearchQuery}
            />
        </div>

        {#if $todosStore.loading}
            <div class="text-center py-4 text-white font-medium flex items-center justify-center gap-2">
                <Loader2 class="animate-spin" size={20}/>
                Loading...
            </div>
        {:else}
            <ScrollArea class="h-[50rem]" scrollColorClass="bg-white/20">
                <div
                    class="space-y-2 p-3"
                    style="overflow-y: auto;"
                    id="active-todos"
                    use:dragHandleZone={{items: activeDndItems, flipDurationMs, dragDisabled: dndDragDisabled}}
                    on:consider={handleDndConsiderActive}
                    on:finalize={handleDndFinalizeActive}
                >
                    {#each activeDndItems as todo (todo.id)}
                        {@const isPrimed = successfullyLongPressedTodoId === todo.id && $sortBy === 'order'}
                        <div
							id={`todo-item-${todo.id}`}
                            class:dnd-item={$sortBy === 'order'}
                            class:primed-for-drag={isPrimed}
                            animate:flip={{duration: 250}}
                            on:touchstart|passive={e => handleTouchStart(e, todo)}
                            on:touchmove|passive={handleTouchMove}
                            on:touchend={handleTouchEnd}
                        >
                            <TodoItem
                                isPrimedForDrag={isPrimed}
                                onDelete={() => todosStore.delete(todo)}
                                onOpenDetails={(item) => openTodoDetailModal(item)}
                                onToggle={() => todosStore.toggle(todo)}
                                onUpdateDifficulty={(detail) => todosStore.updateDifficulty(detail.todo, detail.difficulty)}
                                onUpdateTitle={(detail) => todosStore.updateTitle(detail.todo, detail.title)}
                                searchQuery={searchQuery}
                                {todo}
                            />
                        </div>
                    {/each}
                </div>

                {#if completedDndItems.length > 0}
                    <div class="my-6 border-t border-white/30"/>

                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-white/80 text-sm font-medium">Completed tasks ({completedDndItems.length})</h3>
                        {#if completedDndItems.length > 0}
                            <Button
                                variant="icon"
                                icon={true}
                                onClick={openDeleteDialog}
                                ariaLabel="Delete all completed tasks"
                                title="Delete all completed tasks"
                                class="hover:text-red-500 transition-colors"
                            >
                                <Trash2 size={20}/>
                            </Button>
                        {/if}
                    </div>

                    <div
                        class="space-y-2"
                        style="overflow-y: auto;"
                        id="completed-todos"
                        use:dragHandleZone={{items: completedDndItems, flipDurationMs, dragDisabled: dndDragDisabled}}
                        on:consider={handleDndConsiderCompleted}
                        on:finalize={handleDndFinalizeCompleted}
                    >
                        {#each completedDndItems as todo (todo.id)}
                            {@const isPrimed = successfullyLongPressedTodoId === todo.id && $sortBy === 'order'}
                            <div
								id={`todo-item-${todo.id}`}
                                class:dnd-item={$sortBy === 'order'}
                                class:primed-for-drag={isPrimed}
                                animate:flip={{duration: 250}}
                                on:touchstart|passive={e => handleTouchStart(e, todo)}
                                on:touchmove|passive={handleTouchMove}
                                on:touchend={handleTouchEnd}
                            >
                                <TodoItem
                                    isCompleted={true}
                                    isPrimedForDrag={isPrimed}
                                    onDelete={() => todosStore.delete(todo)}
                                    onOpenDetails={(item) => openTodoDetailModal(item)}
                                    onToggle={() => todosStore.toggle(todo)}
                                    onUpdateDifficulty={(detail) => todosStore.updateDifficulty(detail.todo, detail.difficulty)}
                                    onUpdateTitle={(detail) => todosStore.updateTitle(detail.todo, detail.title)}
                                    searchQuery={searchQuery}
                                    {todo}
                                />
                            </div>
                        {/each}
                    </div>
                {/if}
            </ScrollArea>
        {/if}
    </Card>
</div>

<Dialog
    cancelLabel="Cancel"
    confirmLabel="Delete all"
    description="Are you sure you want to permanently delete all completed tasks? This action cannot be undone."
    onCancel={handleCancelDelete}
    onConfirm={handleConfirmDelete}
    open={deleteDialogOpen}
    title="Delete completed tasks"
    variant="danger"
/>

<Dialog
    bind:open={showDeleteListDialog}
    title="Delete List"
    description="To confirm deletion, please type the name of the list below. This action cannot be undone."
    confirmLabel="Delete This List Permanently"
    variant="danger"
    onConfirm={confirmDeleteListDeletion}
    onCancel={cancelDeleteListDeletion}
>
    <div class="space-y-2">
        <p class="text-sm text-white/70 dark:text-dark-gray-400">
            List name: <strong class="text-white dark:text-dark-foreground">{$listStore.title}</strong>
            <Button onClick={copyListNameForDialog} variant="icon" title="Copy list name" icon={true} class="ml-2">
                <Copy size={14} />
            </Button>
        </p>
        <div class="flex gap-2 items-center">
            <Input
                bind:value={deleteConfirmListName}
                placeholder="Type list name to confirm"
                class="flex-grow"
            />
        </div>
    </div>
</Dialog>

{#if selectedTodoForModal}
    <TodoDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUpdateDescription={handleModalUpdateTodoDescription}
        onUpdateDifficulty={handleModalUpdateTodoDifficulty}
        onUpdateTitle={(detail) => todosStore.updateTitle(detail.todo, detail.title)}
        todo={selectedTodoForModal}
    />
{/if}

<style>
    :global(html) {
        @apply min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 bg-fixed overflow-x-hidden;
    }

    .dnd-item {
        cursor: grab;
        transition: transform 0.2s;
    }

    .primed-for-drag > :global(div:first-child) {
        outline: 2px solid #fbbf24;
        outline-offset: -1px;
    }

    .dnd-item[aria-grabbed="true"] {
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        cursor: grabbing;
        opacity: 0.7;
        transform: scale(1.02);
        z-index: 10;
    }
</style>
