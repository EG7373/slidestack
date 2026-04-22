import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useWorkspaceStore } from '../store/workspaceStore'
import { useDrive } from '../hooks/useDrive'
import { buildBundle, downloadBundle } from '../utils/workspaceBundle'

export default function Toolbar() {
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)
  const [bundling, setBundling] = useState(false)
  const {
    getCurrentWorkspace,
    getCurrentSlide,
    addTextBox,
    addAnnotation,
    driveConnected,
    lastSavedAt,
    lastModifiedAt,
  } = useWorkspaceStore()
  const { saveWorkspace, connect, downloadImage } = useDrive()

  const ws = getCurrentWorkspace()
  const slide = getCurrentSlide()
  if (!ws) return null

  const hasUnsaved = lastModifiedAt && (!lastSavedAt || lastModifiedAt > lastSavedAt)

  const handleShare = async () => {
    const url = `${window.location.origin}/workspace/${ws.id}/view`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('共有リンクをコピーしました')
    } catch {
      toast.error('コピーに失敗しました')
    }
  }

  const handleSave = async () => {
    if (!driveConnected) {
      await connect()
    }
    await saveWorkspace()
  }

  const handleExportBundle = async () => {
    if (bundling) return
    setBundling(true)
    const toastId = toast.loading('バンドルを作成中…')
    try {
      const bundle = await buildBundle(ws, { downloadDriveImage: downloadImage })
      const missing = bundle.slides.filter((s) => s.type === 'image' && !s.imageData).length
      downloadBundle(bundle)
      if (missing > 0) {
        toast.success(`エクスポートしました（${missing}枚の画像は取得できず空になりました）`, { id: toastId })
      } else {
        toast.success('エクスポートしました', { id: toastId })
      }
    } catch (err) {
      console.error('bundle export error:', err)
      toast.error('エクスポートに失敗しました', { id: toastId })
    } finally {
      setBundling(false)
    }
  }

  const handleExportPdf = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const html2pdf = (await import('html2pdf.js')).default

      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '0'
      document.body.appendChild(container)

      for (const slide of ws.slides) {
        const slideDiv = document.createElement('div')
        slideDiv.style.width = '1920px'
        slideDiv.style.height = '1080px'
        slideDiv.style.position = 'relative'
        slideDiv.style.background = '#ffffff'
        slideDiv.style.overflow = 'hidden'

        if (slide.type === 'image' && (slide.blobUrl || slide.imageUrl)) {
          const img = document.createElement('img')
          img.src = slide.blobUrl || slide.imageUrl
          img.style.width = '100%'
          img.style.height = '100%'
          img.style.objectFit = 'contain'
          slideDiv.appendChild(img)
        }

        for (const tb of slide.textBoxes) {
          const div = document.createElement('div')
          div.style.position = 'absolute'
          div.style.left = `${tb.x}%`
          div.style.top = `${tb.y}%`
          div.style.width = `${tb.width}%`
          div.style.fontSize = `${tb.fontSize}px`
          div.style.color = tb.color
          div.innerHTML = tb.content
          slideDiv.appendChild(div)
        }

        for (const ann of slide.annotations) {
          const div = document.createElement('div')
          div.style.position = 'absolute'
          div.style.left = `${ann.x}%`
          div.style.top = `${ann.y}%`
          div.style.width = `${ann.width}%`
          div.style.padding = '12px'
          div.style.background = 'rgba(251, 146, 60, 0.7)'
          div.style.borderRadius = '8px'
          div.style.color = '#ffffff'
          div.style.fontSize = '14px'
          div.innerHTML = ann.content
          slideDiv.appendChild(div)
        }

        container.appendChild(slideDiv)
      }

      await html2pdf()
        .set({
          margin: 0,
          filename: `${ws.name}.pdf`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 1, useCORS: true, width: 1920, height: 1080 },
          jsPDF: { unit: 'px', format: [1920, 1080], orientation: 'landscape' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(container)
        .save()

      document.body.removeChild(container)
      toast.success('PDFをエクスポートしました')
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('PDFエクスポートに失敗しました')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
          {ws.name}
        </span>
        {hasUnsaved && !driveConnected && (
          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">
            未保存
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {slide && (
          <>
            <button
              onClick={() => addTextBox(slide.id)}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="テキストボックス追加"
            >
              T テキスト
            </button>
            <button
              onClick={() => addAnnotation(slide.id)}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="注釈追加"
            >
              💬 注釈
            </button>
          </>
        )}

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <button
          onClick={() => navigate(`/workspace/${ws.id}/view`)}
          className="px-2 py-1 text-xs text-accent hover:bg-accent-light rounded transition-colors"
          title="閲覧モード"
        >
          ▶ 閲覧
        </button>

        <button
          onClick={handleSave}
          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Googleドライブに保存"
        >
          💾 保存
        </button>

        <button
          onClick={handleShare}
          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="共有リンクをコピー"
        >
          🔗 共有
        </button>

        <button
          onClick={handleExportBundle}
          disabled={bundling}
          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          title="ワークスペースをJSONファイルとしてエクスポート（画像埋め込み・配布用）"
        >
          {bundling ? '⏳ 書き出し中...' : '📦 エクスポート'}
        </button>

        <button
          onClick={handleExportPdf}
          disabled={exporting}
          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          title="PDFエクスポート"
        >
          {exporting ? '⏳ 出力中...' : '📄 PDF'}
        </button>
      </div>
    </div>
  )
}
