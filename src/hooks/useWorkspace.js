import { useEffect, useRef, useCallback } from 'react'
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { getDb } from '../utils/firebaseConfig'
import { useWorkspaceStore } from '../store/workspaceStore'

function serializeWorkspace(ws) {
  return {
    id: ws.id,
    name: ws.name,
    createdAt: ws.createdAt,
    updatedAt: new Date().toISOString(),
    aspectRatio: ws.aspectRatio || '16:9',
    slides: ws.slides.map((s) => ({
      id: s.id,
      order: s.order,
      type: s.type,
      imageFileId: s.driveFileId || null,
      imageUrl: s.imageUrl || null,
      textBoxes: s.textBoxes || [],
      annotations: s.annotations || [],
    })),
  }
}

function deserializeWorkspace(data) {
  return {
    id: data.id,
    name: data.name,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    aspectRatio: data.aspectRatio || '16:9',
    slides: (data.slides || []).map((s) => ({
      id: s.id,
      order: s.order,
      type: s.type,
      imageUrl: s.imageUrl || null,
      blobUrl: null,
      driveFileId: s.imageFileId || null,
      uploadStatus: 'idle',
      file: null,
      textBoxes: s.textBoxes || [],
      annotations: s.annotations || [],
    })),
  }
}

export function useFirestoreSync(workspaceId) {
  const db = getDb()
  const saveTimerRef = useRef(null)
  const isRemoteUpdateRef = useRef(false)
  const lastModifiedAt = useWorkspaceStore((s) => s.lastModifiedAt)

  // Subscribe to Firestore changes
  useEffect(() => {
    if (!db || !workspaceId) return

    const docRef = doc(db, 'workspaces', workspaceId)
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) return
      const data = snapshot.data()
      const ws = deserializeWorkspace(data)

      isRemoteUpdateRef.current = true
      const state = useWorkspaceStore.getState()
      state.workspaces[workspaceId] = {
        ...state.workspaces[workspaceId],
        ...ws,
        slides: ws.slides.map((s, i) => {
          const existing = state.workspaces[workspaceId]?.slides?.find((es) => es.id === s.id)
          return {
            ...s,
            blobUrl: existing?.blobUrl || null,
            file: existing?.file || null,
            uploadStatus: existing?.uploadStatus || 'idle',
          }
        }),
      }
      useWorkspaceStore.setState({ workspaces: { ...state.workspaces } })

      setTimeout(() => { isRemoteUpdateRef.current = false }, 100)
    })

    return () => unsubscribe()
  }, [db, workspaceId])

  // Debounced save to Firestore on local changes
  useEffect(() => {
    if (!db || !workspaceId || isRemoteUpdateRef.current) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const ws = useWorkspaceStore.getState().workspaces[workspaceId]
      if (!ws) return

      const docRef = doc(db, 'workspaces', workspaceId)
      const data = serializeWorkspace(ws)
      setDoc(docRef, { ...data, _serverTimestamp: serverTimestamp() }, { merge: true })
        .catch((err) => console.warn('Firestore save failed:', err))
    }, 2000)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [db, workspaceId, lastModifiedAt])
}

export function useBeforeUnloadWarning() {
  useEffect(() => {
    const handler = (e) => {
      const statuses = useWorkspaceStore.getState().uploadStatuses
      const hasUploading = Object.values(statuses).some((s) => s === 'uploading')
      if (hasUploading) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])
}
