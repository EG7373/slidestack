import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { useWorkspaceStore, createImageSlide, createBlankSlide } from '../store/workspaceStore'

export default function TopPage() {
  const [wsName, setWsName] = useState('')
  const navigate = useNavigate()
  const { createWorkspace, workspaces } = useWorkspaceStore()

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length === 0) return
    const slides = acceptedFiles.map((file) => {
      const blobUrl = URL.createObjectURL(file)
      return createImageSlide(blobUrl, file)
    })
    const id = createWorkspace(wsName, slides)
    navigate(`/workspace/${id}`)
  }, [wsName, createWorkspace, navigate])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
  })

  const handleCreateBlank = () => {
    const id = createWorkspace(wsName, [createBlankSlide()])
    navigate(`/workspace/${id}`)
  }

  const recentWorkspaces = Object.values(workspaces)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
          <span className="text-accent">Slide</span>Stack
        </h1>
        <p className="text-center text-gray-500 mb-8">
          画像をドロップしてスライドを作成
        </p>

        <input
          type="text"
          placeholder="ワークスペース名（任意）"
          value={wsName}
          onChange={(e) => setWsName(e.target.value)}
          className="w-full px-4 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm"
        />

        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-16 text-center cursor-pointer transition-colors
            ${isDragActive
              ? 'border-accent bg-accent-light'
              : 'border-gray-300 hover:border-accent hover:bg-accent-light/50'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="text-5xl mb-4">📂</div>
          {isDragActive ? (
            <p className="text-accent font-medium">ドロップしてスライドを作成</p>
          ) : (
            <>
              <p className="text-gray-600 font-medium">
                画像をドラッグ＆ドロップ
              </p>
              <p className="text-gray-400 text-sm mt-1">
                またはクリックして画像を選択
              </p>
            </>
          )}
        </div>

        <button
          onClick={handleCreateBlank}
          className="w-full mt-4 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent-dark transition-colors"
        >
          + 空のワークスペースを作成
        </button>

        {recentWorkspaces.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-gray-500 mb-3">
              最近のワークスペース
            </h2>
            <div className="space-y-2">
              {recentWorkspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => navigate(`/workspace/${ws.id}`)}
                  className="w-full text-left px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-accent hover:shadow-sm transition-all"
                >
                  <div className="font-medium text-gray-800 text-sm">{ws.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {ws.slides.length} スライド
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
