import { CanvasElement } from "@/types"

export interface CanvasAction {
  id: string
  type: 'create' | 'update' | 'delete' | 'move' | 'rotate' | 'resize' | 'copy'
  timestamp: number
  elementId: string
  previousState?: Partial<CanvasElement>
  newState?: Partial<CanvasElement>
  elementData?: CanvasElement // For create/copy actions
}

export interface ActionHistory {
  actions: CanvasAction[]
  currentIndex: number
  maxActions: number
}

export function createActionHistory(maxActions: number = 50): ActionHistory {
  return {
    actions: [],
    currentIndex: -1,
    maxActions
  }
}

export function addAction(
  history: ActionHistory,
  action: Omit<CanvasAction, 'id' | 'timestamp'>
): ActionHistory {
  const newAction: CanvasAction = {
    ...action,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  }

  // Remove any actions after current index (when user undoes then does new action)
  const newActions = history.actions.slice(0, history.currentIndex + 1)
  
  // Add new action
  newActions.push(newAction)
  
  // Maintain max actions limit
  if (newActions.length > history.maxActions) {
    newActions.shift()
  } else {
    // Only increment if we didn't remove from start
    return {
      ...history,
      actions: newActions,
      currentIndex: newActions.length - 1
    }
  }

  return {
    ...history,
    actions: newActions,
    currentIndex: newActions.length - 1
  }
}

export function canUndo(history: ActionHistory): boolean {
  return history.currentIndex >= 0
}

export function canRedo(history: ActionHistory): boolean {
  return history.currentIndex < history.actions.length - 1
}

export function undo(history: ActionHistory): { history: ActionHistory; action?: CanvasAction } {
  if (!canUndo(history)) {
    return { history }
  }

  const action = history.actions[history.currentIndex]
  return {
    history: {
      ...history,
      currentIndex: history.currentIndex - 1
    },
    action
  }
}

export function redo(history: ActionHistory): { history: ActionHistory; action?: CanvasAction } {
  if (!canRedo(history)) {
    return { history }
  }

  const newIndex = history.currentIndex + 1
  const action = history.actions[newIndex]
  return {
    history: {
      ...history,
      currentIndex: newIndex
    },
    action
  }
}

// Helper function to apply action to elements array
export function applyActionToElements(
  elements: CanvasElement[],
  action: CanvasAction,
  isUndo: boolean = false
): CanvasElement[] {
  switch (action.type) {
    case 'create':
    case 'copy':
      if (isUndo) {
        // Remove the created element
        return elements.filter(el => el.id !== action.elementId)
      } else {
        // Add the element
        if (action.elementData) {
          return [...elements, action.elementData]
        }
      }
      break

    case 'delete':
      if (isUndo) {
        // Restore the deleted element
        if (action.elementData) {
          return [...elements, action.elementData]
        }
      } else {
        // Remove the element
        return elements.filter(el => el.id !== action.elementId)
      }
      break

    case 'update':
    case 'move':
    case 'rotate':
    case 'resize':
      // Update element properties
      const stateToApply = isUndo ? action.previousState : action.newState
      if (stateToApply) {
        return elements.map(el =>
          el.id === action.elementId ? { ...el, ...stateToApply } : el
        )
      }
      break
  }

  return elements
}

// Helper to create common actions
export function createMoveAction(
  elementId: string,
  previousPosition: { x: number; y: number },
  newPosition: { x: number; y: number }
): Omit<CanvasAction, 'id' | 'timestamp'> {
  return {
    type: 'move',
    elementId,
    previousState: previousPosition,
    newState: newPosition
  }
}

export function createRotateAction(
  elementId: string,
  previousRotation: number,
  newRotation: number
): Omit<CanvasAction, 'id' | 'timestamp'> {
  return {
    type: 'rotate',
    elementId,
    previousState: { rotation: previousRotation },
    newState: { rotation: newRotation }
  }
}

export function createResizeAction(
  elementId: string,
  previousSize: { width: number; height: number },
  newSize: { width: number; height: number }
): Omit<CanvasAction, 'id' | 'timestamp'> {
  return {
    type: 'resize',
    elementId,
    previousState: previousSize,
    newState: newSize
  }
}

export function createUpdateAction(
  elementId: string,
  previousState: Partial<CanvasElement>,
  newState: Partial<CanvasElement>
): Omit<CanvasAction, 'id' | 'timestamp'> {
  return {
    type: 'update',
    elementId,
    previousState,
    newState
  }
}

export function createDeleteAction(
  element: CanvasElement
): Omit<CanvasAction, 'id' | 'timestamp'> {
  return {
    type: 'delete',
    elementId: element.id,
    elementData: element
  }
}

export function createCreateAction(
  element: CanvasElement
): Omit<CanvasAction, 'id' | 'timestamp'> {
  return {
    type: 'create',
    elementId: element.id,
    elementData: element
  }
}

export function createCopyAction(
  originalElement: CanvasElement,
  copiedElement: CanvasElement
): Omit<CanvasAction, 'id' | 'timestamp'> {
  return {
    type: 'copy',
    elementId: copiedElement.id,
    elementData: copiedElement
  }
}