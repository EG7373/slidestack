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
      toast.success('画像を保存しました')
      return result
    } catch (err) {
      useWorkspaceStore.getState().setUploadStatus(slideId, 'error')
      toast.error('画像のアップロードに失敗しました')
      return null
    }
  }, [connect])

  const saveWorkspace = useCallback(async () => {
    const state = useWorkspaceStore.getState()
    const ws = state.getCurrentWorkspace()
    if (!ws) return

    if (!state.driveConnected) {
      const connected = await connect()
      if (!connected) return
    }

    try {
      const data = {
        id: ws.id,
        name: ws.name,
        createdAt: ws.createdAt,
        updatedAt: new Date().toISOString(),
        slides: ws.slides.map((s) => ({
          id: s.id,
          order: s.order,
          type: s.type,
          imageFileId: s.driveFileId,
          imageUrl: s.imageUrl,
          textBoxes: s.textBoxes,
          annotations: s.annotations,
        })),
      }

      await driveSaveJson(ws.id, data, ws.driveJsonFileId, store)
      useWorkspaceStore.getState().setLastSaved()
      toast.success('ワークスペースを保存しました')
    } catch (err) {
      toast.error('保存に失敗しました')
    }
  }, [connect])

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

  return { connect, uploadImageToDrive, saveWorkspace, loadWorkspace, downloadImage }
}
