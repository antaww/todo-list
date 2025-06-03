<script lang="ts">
    import type {RealtimeChannel} from '@supabase/supabase-js';
    import {Copy, FoldHorizontal, Loader2, Trash2, UnfoldHorizontal, ChevronsRight, List, CheckCircle2} from 'lucide-svelte';
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
	import { pushState } from '$app/navigation';

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

    let currentTab: Todo['status'] = 'Working';

    const flipDurationMs = 300;
    let isDragging = false;
    let isUpdatingOrder = false;

    let activeDndItems: Todo[] = [];
    let completedDndItems: Todo[] = [];
    let workingDndItems: Todo[] = [];

    let isModalOpen = false;
    let selectedTodoIdForModal: string | null = null;
    $: selectedTodoForModal = selectedTodoIdForModal ? $todosStore.items.find(t => t.id === selectedTodoIdForModal) || null : null;

    let showDeleteListDialog = false;
    let deleteConfirmListName = '';

    function sortTodos(todos: Todo[], by: 'name' | 'date' | 'order' | 'difficulty' | 'assigned' | 'priority', direction: 'asc' | 'desc'): Todo[] {
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
                case 'priority':
                    comparison = (b.priority ?? 0) - (a.priority ?? 0);
                    break;
                case 'assigned':
                    if (a.assigned_to && b.assigned_to) {
                        comparison = a.assigned_to.localeCompare(b.assigned_to);
                    } else if (a.assigned_to) {
                        comparison = -1; // a comes before b (b is unassigned)
                    } else if (b.assigned_to) {
                        comparison = 1;  // b comes before a (a is unassigned)
                    } else {
                        comparison = 0; // both are unassigned
                    }
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
    $: workingTodos = sortTodos(filteredTodos.filter(t => t.status === 'Working'), $sortBy, $sortDirection);
    $: activeTodos = sortTodos(filteredTodos.filter(t => t.status === 'Todo'), $sortBy, $sortDirection);
    $: completedTodos = sortTodos(filteredTodos.filter(t => t.status === 'Done'), $sortBy, $sortDirection);

    $: dndDragDisabled = $sortBy !== 'order';

    $: if (!isDragging && !isUpdatingOrder) {
        workingDndItems = [...workingTodos];
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
        updateTodoOrders(activeDndItems, 'Todo', originalItems).finally(() => {
            isUpdatingOrder = false;
            if (isTouchDevice) {
                allowDragViaLongPress = false;
            }
            successfullyLongPressedTodoId = null;
        });
    }

    function handleDndConsiderWorking(e: CustomEvent<{items: Todo[]}>): void {
        isDragging = true;
        workingDndItems = e.detail.items;
        successfullyLongPressedTodoId = null;
    }

    function handleDndFinalizeWorking(e: CustomEvent<{items: Todo[]}>): void {
        const originalItems = [...workingDndItems];
        workingDndItems = e.detail.items;
        isUpdatingOrder = true;
        updateTodoOrders(workingDndItems, 'Working', originalItems).finally(() => {
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
        updateTodoOrders(completedDndItems, 'Done', originalItems).finally(() => {
            isUpdatingOrder = false;
            if (isTouchDevice) {
                allowDragViaLongPress = false;
            }
            successfullyLongPressedTodoId = null;
        });
    }

    async function updateTodoOrders(items: Todo[], targetStatus: Todo['status'], originalItems: Todo[]): Promise<void> {
        const updatedTodos = items.map((todo, index) => ({
            ...todo,
            order: index,
            status: targetStatus,
        }));

        try {
            const updates = updatedTodos.map(todo => ({
                id: todo.id,
                order: todo.order,
                title: todo.title,
                status: todo.status,
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
                if (targetStatus === 'Done') {
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
            if (targetStatus === 'Done') {
                completedDndItems = originalItems;
            } else {
                activeDndItems = originalItems;
            }
        }
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

                        const oldCompleted = String(item.completed).toLowerCase() === 'true' || item.completed === '1';
                        const difficulty = parseInt(String(item.difficulty), 10);
                        const working = String(item.working).toLowerCase() === 'true' || item.working === '1';

                        let status: Todo['status'] = 'Todo';
                        if (working) {
                            status = 'Working';
                        } else if (oldCompleted) {
                            status = 'Done';
                        }

                        await todosStore.add(listId, {
                            title,
                            difficulty: isNaN(difficulty) ? 0 : Math.max(0, Math.min(10, difficulty)),
                            status,
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
            for (const sub of subscription) { await sub.unsubscribe().catch(err => console.warn("[TodoList] Failed to unsubscribe from existing channel:", err)); }
            subscription = [];

            const uniqueSuffix = Date.now(); // Add unique suffix to channel names
            const todosChannelName = `todos-changes-${currentListId}-${uniqueSuffix}`;
            const listsChannelName = `lists-changes-${currentListId}-${uniqueSuffix}`;

            const todosChannel =
				supabase.channel(todosChannelName)
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
				supabase.channel(listsChannelName)
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

        // Unsubscribe from old list's realtime updates if subscriptions exist and listId is changing
        if (subscription.length > 0 && previousListId && previousListId !== currentListId) {
            for (const sub of subscription) {
                try {
                    await sub.unsubscribe();
                } catch (err) {
                    console.warn("Failed to unsubscribe from old list:", err);
                }
            }
            subscription = []; // Reset subscriptions
        }

        todosStore.setLoading(true);
        listStore.setLoading(true);

        await Promise.all([
            listStore.initialize(currentListId),
            todosStore.load(currentListId),
        ]);
        
        // Always set up new subscriptions for the current list after loading its data
        // setupRealtimeSubscription handles its own channel creation/subscription logic
        await setupRealtimeSubscription(currentListId);

        todosStore.setLoading(false);
        listStore.setLoading(false);

        // isTouchDevice is now initialized in onMount only

		if (browser) {
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
    }

    onMount(async () => {
        isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (listId) {
            // previousListId = listId; // No longer set here, will be set by reactive block after first init
            await initializeList(listId);
            previousListId = listId; // Set after the very first initialization
        }
    });

    $: if (browser && listId && listId !== previousListId) {
        initializeList(listId).then(() => {
            previousListId = listId; // Update previousListId AFTER initialization for the new list completes
        });
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

    function handleCloseModal() {
        isModalOpen = false;
        selectedTodoIdForModal = null;
        if (browser) {
            const url = new URL(window.location.href);
            url.searchParams.delete('task_id');
            pushState(url.toString(), {});
        }
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

            if (browser) {
                window.location.href = '/';
            }

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

    function handleOpenTodoDetails(todo: Todo) {
        selectedTodoIdForModal = todo.id;
		setTimeout(() => { // Ensure modal has a chance to mount/react to new todo ID
			isModalOpen = true;
		}, 0);
    }

	function handleUpdateAssignedTo({ todo, assignedTo }: { todo: Todo; assignedTo: string }) {
		todosStore.updateAssignedTo(todo, assignedTo);
		addToast({
			data: {
				title: 'Assigned Person Updated',
				description: `Task "${todo.title}" assigned to ${assignedTo || 'nobody'}.`,
				type: 'success'
			}
		});
	}

	function handleUpdateDescription({ todo, description }: { todo: Todo; description: string }) {
		if (todo) {
			todosStore.updateDescription(todo, description);
			addToast({
				data: {
					title: 'Description Updated',
					description: `Task "${todo.title}" description updated.`,
					type: 'success'
				}
			});
		}
	}

	function handleUpdateTitle(detail: { todo: Todo; title: string }) {
		if (detail.todo) {
			todosStore.updateTitle(detail.todo, detail.title);
			addToast({
				data: {
					title: 'Title Updated',
					description: `Task "${detail.todo.title}" title updated.`,
					type: 'success'
				}
			});
		}
	}

	function handleUpdateDifficulty(detail: { todo: Todo; difficulty: number }) {
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

	function handleUpdatePriority({ todo, priority }: { todo: Todo; priority: number }) {
		todosStore.updatePriority(todo, priority);
		// Toast notification is handled within the store method
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

        <div class="flex border-b border-white/20 mb-4">
            <button
                class="px-4 py-3 text-sm font-medium flex-1 text-center -mb-px border-b-2 transition-colors duration-150 ease-in-out focus:outline-none flex items-center justify-center gap-2 {
                    currentTab === 'Working' ? 'border-orange-400 text-orange-400' :
                    'border-transparent text-orange-400/60 hover:text-orange-400 hover:border-orange-400/50'
                }"
                on:click={() => currentTab = 'Working'}
            >
                <ChevronsRight size={18} />
                <span>In Progress ({workingTodos.length})</span>
            </button>
            <button
                class="px-4 py-3 text-sm font-medium flex-1 text-center -mb-px border-b-2 transition-colors duration-150 ease-in-out focus:outline-none flex items-center justify-center gap-2 {
                    currentTab === 'Todo' ? 'border-blue-400 text-blue-400' :
                    'border-transparent text-blue-400/60 hover:text-blue-400 hover:border-blue-400/50'
                }"
                on:click={() => currentTab = 'Todo'}
            >
                <List size={18} />
                <span>To Do ({activeTodos.length})</span>
            </button>
            <button
                class="px-4 py-3 text-sm font-medium flex-1 text-center -mb-px border-b-2 transition-colors duration-150 ease-in-out focus:outline-none flex items-center justify-center gap-2 {
                    currentTab === 'Done' ? 'border-green-400 text-green-400' :
                    'border-transparent text-green-400/60 hover:text-green-400 hover:border-green-400/50'
                }"
                on:click={() => currentTab = 'Done'}
            >
                <CheckCircle2 size={18} />
                <span>Completed ({completedTodos.length})</span>
            </button>
        </div>

        {#if $todosStore.loading}
            <div class="text-center py-4 text-white font-medium flex items-center justify-center gap-2">
                <Loader2 class="animate-spin" size={20}/>
                Loading...
            </div>
        {:else}
            <ScrollArea class="h-[50rem]" scrollColorClass="bg-white/20">
                {#key listId}
                    {#if currentTab === 'Working'}
                        <div class="my-4">
                            <h3 class="text-white/80 text-sm font-medium mb-2">In Progress ({workingTodos.length})</h3>
                            {#if workingDndItems.length > 0}
                                <div
                                    class="space-y-2 p-3 border border-orange-400/30 rounded-md bg-orange-500/5"
                                    style="overflow-y: auto;"
                                    id="working-todos"
                                    use:dragHandleZone={{items: workingDndItems, flipDurationMs, dragDisabled: dndDragDisabled}}
                                    on:consider={handleDndConsiderWorking}
                                    on:finalize={handleDndFinalizeWorking}
                                >
                                    {#each workingDndItems as todo (todo.id)}
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
                                                isCompleted={false}
                                                isPrimedForDrag={isPrimed}
                                                onDelete={() => todosStore.delete(todo)}
                                                onOpenDetails={(item) => handleOpenTodoDetails(item)}
                                                onToggle={() => todosStore.toggle(todo)}
                                                onToggleWorking={() => todosStore.toggleWorking(todo)}
                                                onUpdateDifficulty={(detail) => todosStore.updateDifficulty(detail.todo, detail.difficulty)}
                                                onUpdateTitle={(detail) => todosStore.updateTitle(detail.todo, detail.title)}
                                                searchQuery={searchQuery}
                                                {todo}
                                            />
                                        </div>
                                    {/each}
                                </div>
                            {:else}
                                <p class="text-white/50 p-4 text-center border border-dashed border-white/20 rounded-md bg-white/5">
                                    No tasks in progress.
                                </p>
                            {/if}
                        </div>
                    {/if}

                    {#if currentTab === 'Todo'}
                        <div class="my-4">
                            <h3 class="text-white/80 text-sm font-medium mb-2 px-1">To Do ({activeTodos.length})</h3>
                            {#if activeDndItems.length > 0}
                                <div
                                    class="space-y-2 p-3 border border-gray-300/30 rounded-md bg-gray-300/5"
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
                                                isCompleted={false}
                                                isPrimedForDrag={isPrimed}
                                                onDelete={() => todosStore.delete(todo)}
                                                onOpenDetails={(item) => handleOpenTodoDetails(item)}
                                                onToggle={() => todosStore.toggle(todo)}
                                                onToggleWorking={() => todosStore.toggleWorking(todo)}
                                                onUpdateDifficulty={(detail) => todosStore.updateDifficulty(detail.todo, detail.difficulty)}
                                                onUpdateTitle={(detail) => todosStore.updateTitle(detail.todo, detail.title)}
                                                searchQuery={searchQuery}
                                                {todo}
                                            />
                                        </div>
                                    {/each}
                                </div>
                            {:else}
                                <p class="text-white/50 p-4 text-center border border-dashed border-white/20 rounded-md bg-white/5">
                                    No tasks to do.
                                </p>
                            {/if}
                        </div>
                    {/if}

                    {#if currentTab === 'Done'}
                        <div class="my-4">
                            <div class="flex justify-between items-center mb-2 px-1">
                                <h3 class="text-white/80 text-sm font-medium">Completed ({completedTodos.length})</h3>
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
                            {#if completedDndItems.length > 0}
                                <div
                                    class="space-y-2 p-3 border border-gray-500/30 rounded-md bg-gray-500/5"
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
                                                onOpenDetails={(item) => handleOpenTodoDetails(item)}
                                                onToggle={() => todosStore.toggle(todo)}
                                                onToggleWorking={() => todosStore.toggleWorking(todo)}
                                                onUpdateDifficulty={(detail) => todosStore.updateDifficulty(detail.todo, detail.difficulty)}
                                                onUpdateTitle={(detail) => todosStore.updateTitle(detail.todo, detail.title)}
                                                searchQuery={searchQuery}
                                                {todo}
                                            />
                                        </div>
                                    {/each}
                                </div>
                            {:else}
                                <p class="text-white/50 p-4 text-center border border-dashed border-white/20 rounded-md bg-white/5">
                                    No completed tasks.
                                </p>
                            {/if}
                        </div>
                    {/if}
                {/key}
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
        bind:isOpen={isModalOpen}
        onClose={handleCloseModal}
        onUpdateDescription={(detail) => todosStore.updateDescription(detail.todo, detail.description)}
        onUpdateDifficulty={(detail) => todosStore.updateDifficulty(detail.todo, detail.difficulty)}
        onUpdateTitle={(detail) => todosStore.updateTitle(detail.todo, detail.title)}
        onToggle={(item) => todosStore.toggle(item)}
        onUpdateAssignedTo={handleUpdateAssignedTo}
        onUpdatePriority={handleUpdatePriority}
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
