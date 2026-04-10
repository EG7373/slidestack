import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { useWorkspaceStore } from '../store/workspaceStore'

export function useShare() {
  const copyShareLink = useCallback((viewMode = true) => {
    const ws = useWorkspaceStore.getState().getCurrentWorkspace()
    if (!ws) return

    const path = viewMode ? `/workspace/${ws.id}/view` : `/workspace/${ws.id}`
    const url = `${window.location.origin}${path}`

    navigator.clipboard.writeText(url)
      .then(() => toast.success('共有リンクをコピーしました'))
      .catch(() => toast.error('コピーに失敗しました'))
  }, [])

  return { copyShareLink }
}
