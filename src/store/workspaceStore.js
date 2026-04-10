import { create } from 'zustand'
import { nanoid } from 'nanoid'

const formatDate = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

const createBlankSlide = () => ({
  id: nanoid(),
  order: 0,
  type: 'blank',
  imageUrl: null,
  blobUrl: null,
  driveFileId: null,
  uploadStatus: 'idle',
  textBoxes: [],
  annotations: [],
})

const createImageSlide = (blobUrl, file = null) => ({
  id: nanoid(),
  order: 0,
  type: 'image',
  imageUrl: null,
  blobUrl,
  file,
  driveFileId: null,
  uploadStatus: 'idle',
  textBoxes: [],
  annotations: [],
})

export const useWorkspaceStore = create((set, get) => ({
  workspaces: {},
  currentWorkspaceId: null,
  currentSlideIndex: 0,
  selectedElementId: null,
  selectedElementType: null,

  driveConnected: false,
  driveToken: null,
  driveTokenExpiry: null,
  uploadStatuses: {},

  lastSavedAt: null,
  lastModifiedAt: null,

  getCurrentWorkspace: () => {
    const { workspaces, currentWorkspaceId } = get()
    return currentWorkspaceId ? workspaces[currentWorkspaceId] : null
  },

  getCurrentSlide: () => {
    const ws = get().getCurrentWorkspace()
    if (!ws) return null
    return ws.slides[get().currentSlideIndex] || null
  },

  createWorkspace: (name, initialSlides = []) => {
    const id = nanoid(10)
    const wsName = name?.trim() || `スライドブック_${formatDate()}`
    const slides = initialSlides.length > 0
      ? initialSlides.map((s, i) => ({ ...s, order: i }))
      : [{ ...createBlankSlide(), order: 0 }]

    set((state) => ({
      workspaces: {
        ...state.workspaces,
        [id]: {
          id,
          name: wsName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          slides,
          aspectRatio: '16:9',
        },
      },
      currentWorkspaceId: id,
      currentSlideIndex: 0,
      selectedElementId: null,
      selectedElementType: null,
      lastModifiedAt: Date.now(),
    }))
    return id
  },

  switchWorkspace: (id) => {
    set({
      currentWorkspaceId: id,
      currentSlideIndex: 0,
      selectedElementId: null,
      selectedElementType: null,
    })
  },

  setName: (name) => {
    const { currentWorkspaceId } = get()
    if (!currentWorkspaceId) return
    set((state) => ({
      workspaces: {
        ...state.workspaces,
        [currentWorkspaceId]: {
          ...state.workspaces[currentWorkspaceId],
          name,
          updatedAt: new Date().toISOString(),
        },
      },
      lastModifiedAt: Date.now(),
    }))
  },

  addSlide: (slide) => {
    const { currentWorkspaceId, currentSlideIndex } = get()
    if (!currentWorkspaceId) return
    set((state) => {
      const ws = state.workspaces[currentWorkspaceId]
      const newSlides = [...ws.slides]
      const insertIndex = currentSlideIndex + 1
      newSlides.splice(insertIndex, 0, { ...slide, order: insertIndex })
      const reordered = newSlides.map((s, i) => ({ ...s, order: i }))
      return {
        workspaces: {
          ...state.workspaces,
          [currentWorkspaceId]: { ...ws, slides: reordered, updatedAt: new Date().toISOString() },
        },
        currentSlideIndex: insertIndex,
        lastModifiedAt: Date.now(),
      }
    })
  },

  removeSlide: (slideId) => {
    const { currentWorkspaceId } = get()
    if (!currentWorkspaceId) return
    set((state) => {
      const ws = state.workspaces[currentWorkspaceId]
      if (ws.slides.length <= 1) return state
      const removed = ws.slides.find((s) => s.id === slideId)
      if (removed?.blobUrl) URL.revokeObjectURL(removed.blobUrl)
      const newSlides = ws.slides.filter((s) => s.id !== slideId).map((s, i) => ({ ...s, order: i }))
      const newIndex = Math.min(state.currentSlideIndex, newSlides.length - 1)
      return {
        workspaces: {
          ...state.workspaces,
          [currentWorkspaceId]: { ...ws, slides: newSlides, updatedAt: new Date().toISOString() },
        },
        currentSlideIndex: newIndex,
        selectedElementId: null,
        selectedElementType: null,
        lastModifiedAt: Date.now(),
      }
    })
  },

  updateSlide: (slideId, patch) => {
    const { currentWorkspaceId } = get()
    if (!currentWorkspaceId) return
    set((state) => {
      const ws = state.workspaces[currentWorkspaceId]
      const newSlides = ws.slides.map((s) => (s.id === slideId ? { ...s, ...patch } : s))
      return {
        workspaces: {
          ...state.workspaces,
          [currentWorkspaceId]: { ...ws, slides: newSlides, updatedAt: new Date().toISOString() },
        },
        lastModifiedAt: Date.now(),
      }
    })
  },

  setCurrentSlide: (index) => {
    const ws = get().getCurrentWorkspace()
    if (!ws) return
    const clamped = Math.max(0, Math.min(index, ws.slides.length - 1))
    set({ currentSlideIndex: clamped, selectedElementId: null, selectedElementType: null })
  },

  nextSlide: () => {
    const ws = get().getCurrentWorkspace()
    if (!ws) return
    const { currentSlideIndex } = get()
    if (currentSlideIndex < ws.slides.length - 1) {
      set({ currentSlideIndex: currentSlideIndex + 1, selectedElementId: null, selectedElementType: null })
    }
  },

  prevSlide: () => {
    const { currentSlideIndex } = get()
    if (currentSlideIndex > 0) {
      set({ currentSlideIndex: currentSlideIndex - 1, selectedElementId: null, selectedElementType: null })
    }
  },

  reorderSlides: (fromIndex, toIndex) => {
    const { currentWorkspaceId } = get()
    if (!currentWorkspaceId) return
    set((state) => {
      const ws = state.workspaces[currentWorkspaceId]
      const newSlides = [...ws.slides]
      const [moved] = newSlides.splice(fromIndex, 1)
      newSlides.splice(toIndex, 0, moved)
      const reordered = newSlides.map((s, i) => ({ ...s, order: i }))
      return {
        workspaces: {
          ...state.workspaces,
          [currentWorkspaceId]: { ...ws, slides: reordered, updatedAt: new Date().toISOString() },
        },
        currentSlideIndex: toIndex,
        lastModifiedAt: Date.now(),
      }
    })
  },

  selectElement: (id, type) => {
    set({ selectedElementId: id, selectedElementType: type })
  },

  clearSelection: () => {
    set({ selectedElementId: null, selectedElementType: null })
  },

  // TextBox actions
  addTextBox: (slideId) => {
    const tb = {
      id: nanoid(),
      content: 'テキスト',
      x: 10,
      y: 10,
      width: 30,
      fontSize: 16,
      color: '#000000',
    }
    const { currentWorkspaceId } = get()
    set((state) => {
      const ws = state.workspaces[currentWorkspaceId]
      const newSlides = ws.slides.map((s) =>
        s.id === slideId ? { ...s, textBoxes: [...s.textBoxes, tb] } : s
      )
      return {
        workspaces: {
          ...state.workspaces,
          [currentWorkspaceId]: { ...ws, slides: newSlides, updatedAt: new Date().toISOString() },
        },
        selectedElementId: tb.id,
        selectedElementType: 'textbox',
        lastModifiedAt: Date.now(),
      }
    })
    return tb.id
  },

  updateTextBox: (slideId, textBoxId, patch) => {
    const { currentWorkspaceId } = get()
    set((state) => {
      const ws = state.workspaces[currentWorkspaceId]
      const newSlides = ws.slides.map((s) =>
        s.id === slideId
          ? { ...s, textBoxes: s.textBoxes.map((tb) => (tb.id === textBoxId ? { ...tb, ...patch } : tb)) }
          : s
      )
      return {
        workspaces: {
          ...state.workspaces,
          [currentWorkspaceId]: { ...ws, slides: newSlides, updatedAt: new Date().toISOString() },
        },
        lastModifiedAt: Date.now(),
      }
    })
  },

  removeTextBox: (slideId, textBoxId) => {
    const { currentWorkspaceId } = get()
    set((state) => {
      const ws = state.workspaces[currentWorkspaceId]
      const newSlides = ws.slides.map((s) =>
        s.id === slideId ? { ...s, textBoxes: s.textBoxes.filter((tb) => tb.id !== textBoxId) } : s
      )
      return {
        workspaces: {
          ...state.workspaces,
          [currentWorkspaceId]: { ...ws, slides: newSlides, updatedAt: new Date().toISOString() },
        },
        selectedElementId: null,
        selectedElementType: null,
        lastModifiedAt: Date.now(),
      }
    })
  },

  // Annotation actions
  addAnnotation: (slideId) => {
    const ann = {
      id: nanoid(),
      content: '注釈',
      x: 60,
      y: 10,
      width: 25,
    }
    const { currentWorkspaceId } = get()
    set((state) => {
      const ws = state.workspaces[currentWorkspaceId]
      const newSlides = ws.slides.map((s) =>
        s.id === slideId ? { ...s, annotations: [...s.annotations, ann] } : s
      )
      return {
        workspaces: {
          ...state.workspaces,
          [currentWorkspaceId]: { ...ws, slides: newSlides, updatedAt: new Date().toISOString() },
        },
        selectedElementId: ann.id,
        selectedElementType: 'annotation',
        lastModifiedAt: Date.now(),
      }
    })
    return ann.id
  },

  updateAnnotation: (slideId, annotationId, patch) => {
    const { currentWorkspaceId } = get()
    set((state) => {
      const ws = state.workspaces[currentWorkspaceId]
      const newSlides = ws.slides.map((s) =>
        s.id === slideId
          ? { ...s, annotations: s.annotations.map((a) => (a.id === annotationId ? { ...a, ...patch } : a)) }
          : s
      )
      return {
        workspaces: {
          ...state.workspaces,
          [currentWorkspaceId]: { ...ws, slides: newSlides, updatedAt: new Date().toISOString() },
        },
        lastModifiedAt: Date.now(),
      }
    })
  },

  removeAnnotation: (slideId, annotationId) => {
    const { currentWorkspaceId } = get()
    set((state) => {
      const ws = state.workspaces[currentWorkspaceId]
      const newSlides = ws.slides.map((s) =>
        s.id === slideId ? { ...s, annotations: s.annotations.filter((a) => a.id !== annotationId) } : s
      )
      return {
        workspaces: {
          ...state.workspaces,
          [currentWorkspaceId]: { ...ws, slides: newSlides, updatedAt: new Date().toISOString() },
        },
        selectedElementId: null,
        selectedElementType: null,
        lastModifiedAt: Date.now(),
      }
    })
  },

  // Drive actions
  setDriveConnected: (connected, token = null, expiry = null) => {
    set({ driveConnected: connected, driveToken: token, driveTokenExpiry: expiry })
  },

  setUploadStatus: (slideId, status) => {
    set((state) => ({
      uploadStatuses: { ...state.uploadStatuses, [slideId]: status },
    }))
  },

  setLastSaved: () => {
    set({ lastSavedAt: Date.now() })
  },
}))

export { createBlankSlide, createImageSlide }
