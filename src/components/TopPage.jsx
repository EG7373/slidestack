import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { useWorkspaceStore, createImageSlide, createBlankSlide } from '../store/workspaceStore'
import { useDrive } from '../hooks/useDrive'
import { readBundleFile, fileToDataUrl } from '../utils/workspaceBundle'

export default function TopPage() {
  const [wsName, setWsName] = useState('')
  const [driveFiles, setDriveFiles] = useState(null)
  const [loadingDrive, setLoadingDrive] = useState(false)
  const [importing, setImporting] = useState(false)
  const bundleInputRef = useRef(null)
  const navigate = useNavigate()
  const { createWorkspace, workspaces, importWorkspace } = useWorkspaceStore()
  const { listWorkspaces, loadWorkspace } = useDrive()

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return
    const slides = await Promise.all(acceptedFiles.map(async (file) => {
      const blobUrl = URL.createObjectURL(file)
      const imageData = await fileToDataUrl(file).catch(() => null)
      return createImageSlide(blobUrl, file, imageData)
    }))
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

  const handleOpenDriveList = async () => {
    setLoadingDrive(true)
    const files = await listWorkspaces()
    setDriveFiles(files)
    setLoadingDrive(false)
  }

  const handleRestoreFile = async (file) => {
    setLoadingDrive(true)
    const data = await loadWorkspace(file.id)
    setLoadingDrive(false)
    if (!data) return
    const id = importWorkspace({ ...data, driveJsonFileId: file.id })
    toast.success('ワークスペースを復元しました')
    navigate(`/workspace/${id}`)
  }

  const handleBundleFile = async (file) => {
    if (!file) return
    setImporting(true)
    const toastId = toast.loading('インポート中…')
    try {
      const data = await readBundleFile(file)
      const id = importWorkspace(data)
      toast.success('インポートしました', { id: toastId })
      navigate(`/workspace/${id}`)
    } catch (err) {
      console.error('bundle import error:', err)
      toast.error('ファイルを読み込めませんでした', { id: toastId })
    } finally {
      setImporting(false)
    }
  }

  const onBundleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleBundleFile(file)
    e.target.value = ''
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

        <button
          onClick={handleOpenDriveList}
          disabled={loadingDrive}
          className="w-full mt-2 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
        >
          {loadingDrive ? '読み込み中…' : '📥 Google Driveから復元'}
        </button>

        <input
          ref={bundleInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={onBundleInputChange}
        />
        <button
          onClick={() => bundleInputRef.current?.click()}
          disabled={importing}
          className="w-full mt-2 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
          title="エクスポート済みのJSONファイル（.slidestack.json）を読み込みます"
        >
          {importing ? '読み込み中…' : '📦 JSONファイルからインポート'}
        </button>

        {driveFiles !== null && (
          <div className="mt-4 bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Drive上のワークスペース</h3>
              <button
                onClick={() => setDriveFiles(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                閉じる
              </button>
            </div>
            {driveFiles.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">
                Driveに保存されたワークスペースはありません
              </p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {driveFiles.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleRestoreFile(f)}
                    disabled={loadingDrive}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm disabled:opacity-50"
                  >
                    <div className="font-medium text-gray-800 truncate">{f.name}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(f.modifiedTime).toLocaleString('ja-JP')}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
