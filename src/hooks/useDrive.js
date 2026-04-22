import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { useWorkspaceStore } from '../store/workspaceStore'
import {
  getAuthToken,
  loadGapi,
  uploadImage as driveUploadImage,
  saveWorkspaceJson as driveSaveJson,
  loadWorkspaceJson as driveLoadJson,
  downloadImage as driveDownloadImage,
  listWorkspaceFiles as driveListFiles,
} from '../utils/driveHelpers'

export function useDrive() {
  const store = useWorkspaceStore

  const connect = useCallback(async () => {
    try {
      await loadGapi()
      const { token, expiry } = await getAuthToken()
      useWorkspaceStore.getState().setDriveConnected(true, token, expiry)
      toast.success('Googleドライブに接続しました')
      return true
    } catch (err) {
      toast.error('ドライブ接続に失敗しました')
      return false
    }
  }, [])

  const uploadImageToDrive = useCallback(async (file, workspaceId, slideId) => {
    const state = useWorkspaceStore.getState()
    if (!state.driveConnected) {
      const connected = await connect()
      if (!connected) return null
    }

    state.setUploadStatus(slideId, 'uploading')
    try {
      const result = await driveUploadImage(file, workspaceId, store)
      useWorkspaceStore.getState().setUploadStatus(slideId, 'done')
      useWorkspaceStore.getState().updateSlide(slideId, {
        driveFileId: result.fileId,
        imageUrl: result.imageUrl,
      })
      return result
    } catch (err) {
      useWorkspaceStore.getState().setUploadStatus(slideId, 'error')
      toast.error('画像のアップロードに失敗しました')
      return null
    }
  }, [connect])

  const imageDataToFile = (slide) => {
    if (slide.file) return slide.file
    if (!slide.imageData) return null
    try {
      const [meta, base64] = slide.imageData.split(',')
      const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'image/png'
      const bin = atob(base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const ext = mime.split('/')[1] || 'png'
      return new File([bytes], `slide_${slide.id}.${ext}`, { type: mime })
    } catch {
      return null
    }
  }

  const saveWorkspace = useCallback(async () => {
    const state = useWorkspaceStore.getState()
    const ws = state.getCurrentWorkspace()
    if (!ws) return

    if (!state.driveConnected) {
      const connected = await connect()
      if (!connected) return
    }

    const pending = ws.slides.filter((s) => s.type === 'image' && !s.driveFileId && (s.file || s.imageData))
    if (pending.length > 0) {
      const toastId = toast.loading(`画像をアップロード中 (0/${pending.length})`)
      try {
        for (let i = 0; i < pending.length; i++) {
          const s = pending[i]
          const file = imageDataToFile(s)
          if (!file) continue
          await uploadImageToDrive(file, ws.id, s.id)
          toast.loading(`画像をアップロード中 (${i + 1}/${pending.length})`, { id: toastId })
        }
        toast.dismiss(toastId)
      } catch (err) {
        toast.error('画像のアップロードに失敗しました', { id: toastId })
        return
      }
    }

    const freshWs = useWorkspaceStore.getState().workspaces[ws.id]
    try {
      const data = {
        id: freshWs.id,
        name: freshWs.name,
        createdAt: freshWs.createdAt,
        updatedAt: new Date().toISOString(),
        aspectRatio: freshWs.aspectRatio || '16:9',
        slides: freshWs.slides.map((s) => ({
          id: s.id,
          order: s.order,
          type: s.type,
          imageFileId: s.driveFileId,
          imageUrl: s.imageUrl,
          textBoxes: s.textBoxes,
          annotations: s.annotations,
        })),
      }

      const jsonFileId = await driveSaveJson(freshWs.id, data, freshWs.driveJsonFileId, store)
      if (!freshWs.driveJsonFileId && jsonFileId) {
        useWorkspaceStore.setState((prev) => ({
          workspaces: {
            ...prev.workspaces,
            [freshWs.id]: { ...prev.workspaces[freshWs.id], driveJsonFileId: jsonFileId },
          },
        }))
      }
      useWorkspaceStore.getState().setLastSaved()
      toast.success('ワークスペースを保存しました')
    } catch (err) {
      toast.error('保存に失敗しました')
    }
  }, [connect, uploadImageToDrive])

  const loadWorkspace = useCallback(async (fileId) => {
    try {
      const data = await driveLoadJson(fileId, store)
      return data
    } catch (err) {
      toast.error('読み込みに失敗しました')
      return null
    }
  }, [])

  const downloadImage = useCallback(async (fileId) => {
    try {
      return await driveDownloadImage(fileId, store)
    } catch (err) {
      return null
    }
  }, [])

  const listWorkspaces = useCallback(async () => {
    const state = useWorkspaceStore.getState()
    if (!state.driveConnected) {
      const connected = await connect()
      if (!connected) return []
    }
    try {
      return await driveListFiles(store)
    } catch (err) {
      toast.error('Driveの一覧取得に失敗しました')
      return []
    }
  }, [connect])

  return { connect, uploadImageToDrive, saveWorkspace, loadWorkspace, downloadImage, listWorkspaces }
}
