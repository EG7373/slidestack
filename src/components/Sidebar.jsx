import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useDrive } from '../hooks/useDrive'

export default function Sidebar() {
  const navigate = useNavigate()
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [contextMenu, setContextMenu] = useState(null)
  const inputRef = useRef(null)

  const {
    workspaces,
    currentWorkspaceId,
    switchWorkspace,
    setName,
    driveConnected,
  } = useWorkspaceStore()
  const { connect } = useDrive()

  const allWorkspaces = Object.values(workspaces).sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  )

  const handleStartRename = (ws) => {
    setEditingId(ws.id)
    setEditName(ws.name)
    setContextMenu(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleFinishRename = () => {
    if (editingId && editName.trim()) {
      switchWorkspace(editingId)
      setName(editName.trim())
    }
    setEditingId(null)
  }

  const handleContextMenu = (e, ws) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, ws })
  }

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col" onClick={() => setContextMenu(null)}>
      {/* Logo */}
      <div
        className="px-4 py-4 border-b border-gray-200 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <h1 className="text-lg font-bold">
          <span className="text-accent">Slide</span>Stack
        </h1>
      </div>

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="text-xs font-medium text-gray-400 px-2 py-1 uppercase">
          ワークスペース
        </div>
        {allWorkspaces.map((w) => (
          <div key={w.id} onContextMenu={(e) => handleContextMenu(e, w)}>
            {editingId === w.id ? (
              <input
                ref={inputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishRename()
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="w-full px-3 py-2 text-sm border border-accent rounded-md outline-none"
                maxLength={100}
              />
            ) : (
              <button
                onClick={() => {
                  switchWorkspace(w.id)
                  navigate(`/workspace/${w.id}`)
                }}
                className={`
                  w-full text-left px-3 py-2 rounded-md text-sm mb-0.5 transition-colors truncate
                  ${w.id === currentWorkspaceId
                    ? 'bg-accent-light text-accent font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                  }
                `}
                title={w.name}
              >
                {w.name}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleStartRename(contextMenu.ws)}
            className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            名前を変更
          </button>
        </div>
      )}

      {/* New workspace */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={() => navigate('/')}
          className="w-full py-2 text-sm text-accent border border-accent/30 rounded-md hover:bg-accent-light transition-colors"
        >
          + 新しいワークスペース
        </button>
      </div>

      {/* Drive status */}
      <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-400">
        {driveConnected ? (
          <span className="text-accent">Google ドライブ接続済み</span>
        ) : (
          <button
            onClick={connect}
            className="text-gray-400 hover:text-accent transition-colors"
          >
            ドライブに接続
          </button>
        )}
      </div>
    </div>
  )
}
