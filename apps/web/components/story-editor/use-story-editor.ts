import { useReducer, useCallback, useRef } from "react";
import type { EditorState, EditorAction, StoryData, StoryElement, BackgroundConfig } from "./types";
import { getDefaultStoryData, createStoryElement } from "./types";

const MAX_HISTORY = 50;

function pushHistory(state: EditorState, newData: StoryData): EditorState {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(JSON.parse(JSON.stringify(newData)));
  if (newHistory.length > MAX_HISTORY) newHistory.shift();
  return {
    ...state,
    storyData: newData,
    history: newHistory,
    historyIndex: newHistory.length - 1,
    isDirty: true,
  };
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "ADD_ELEMENT": {
      const newData = {
        ...state.storyData,
        elements: [...state.storyData.elements, action.element],
      };
      return {
        ...pushHistory(state, newData),
        selectedElementId: action.element.id,
      };
    }

    case "UPDATE_ELEMENT": {
      const newData = {
        ...state.storyData,
        elements: state.storyData.elements.map((el) =>
          el.id === action.id ? { ...el, ...action.changes } : el
        ),
      };
      return pushHistory(state, newData);
    }

    case "DELETE_ELEMENT": {
      const newData = {
        ...state.storyData,
        elements: state.storyData.elements.filter((el) => el.id !== action.id),
      };
      return {
        ...pushHistory(state, newData),
        selectedElementId:
          state.selectedElementId === action.id ? null : state.selectedElementId,
      };
    }

    case "SELECT_ELEMENT":
      return { ...state, selectedElementId: action.id };

    case "SET_BACKGROUND": {
      const newData = { ...state.storyData, background: action.background };
      return pushHistory(state, newData);
    }

    case "REORDER_ELEMENT": {
      const elements = [...state.storyData.elements];
      const idx = elements.findIndex((el) => el.id === action.id);
      if (idx < 0) return state;
      const target = action.direction === "up" ? idx + 1 : idx - 1;
      if (target < 0 || target >= elements.length) return state;
      [elements[idx], elements[target]] = [elements[target]!, elements[idx]!];
      return pushHistory(state, { ...state.storyData, elements });
    }

    case "UNDO": {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        storyData: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
        isDirty: true,
        selectedElementId: null,
      };
    }

    case "REDO": {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        storyData: JSON.parse(JSON.stringify(state.history[newIndex])),
        historyIndex: newIndex,
        isDirty: true,
        selectedElementId: null,
      };
    }

    case "LOAD": {
      const data = action.storyData;
      return {
        storyData: data,
        selectedElementId: null,
        history: [JSON.parse(JSON.stringify(data))],
        historyIndex: 0,
        isDirty: false,
      };
    }

    case "MARK_CLEAN":
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

function getInitialState(initial?: StoryData): EditorState {
  const data = initial ?? getDefaultStoryData();
  return {
    storyData: data,
    selectedElementId: null,
    history: [JSON.parse(JSON.stringify(data))],
    historyIndex: 0,
    isDirty: false,
  };
}

export function useStoryEditor(initial?: StoryData) {
  const [state, dispatch] = useReducer(editorReducer, initial, getInitialState);
  const stageRef = useRef<any>(null);

  const addElement = useCallback(
    (type: StoryElement["type"], props: StoryElement["props"], overrides?: Partial<StoryElement>) => {
      dispatch({ type: "ADD_ELEMENT", element: createStoryElement(type, props, overrides) });
    },
    []
  );

  const updateElement = useCallback((id: string, changes: Partial<StoryElement>) => {
    dispatch({ type: "UPDATE_ELEMENT", id, changes });
  }, []);

  const deleteElement = useCallback((id: string) => {
    dispatch({ type: "DELETE_ELEMENT", id });
  }, []);

  const selectElement = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_ELEMENT", id });
  }, []);

  const setBackground = useCallback((background: BackgroundConfig) => {
    dispatch({ type: "SET_BACKGROUND", background });
  }, []);

  const reorderElement = useCallback((id: string, direction: "up" | "down") => {
    dispatch({ type: "REORDER_ELEMENT", id, direction });
  }, []);

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);
  const load = useCallback((data: StoryData) => dispatch({ type: "LOAD", storyData: data }), []);
  const markClean = useCallback(() => dispatch({ type: "MARK_CLEAN" }), []);

  const selectedElement = state.selectedElementId
    ? state.storyData.elements.find((el) => el.id === state.selectedElementId) ?? null
    : null;

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return {
    state,
    stageRef,
    selectedElement,
    canUndo,
    canRedo,
    addElement,
    updateElement,
    deleteElement,
    selectElement,
    setBackground,
    reorderElement,
    undo,
    redo,
    load,
    markClean,
    dispatch,
  };
}
