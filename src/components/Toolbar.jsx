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
    const mountedDivs = []
    try {
      const slides = ws.slides || []
      if (slides.length === 0) {
        toast.error('スライドがありません')
        return
      }

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const pdf = new jsPDF({
        unit: 'px',
        format: [1920, 1080],
        orientation: 'landscape',
        hotfixes: ['px_scaling'],
      })

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i]
        const slideDiv = document.createElement('div')
        slideDiv.style.position = 'fixed'
        slideDiv.style.left = '0'
        slideDiv.style.top = '0'
        slideDiv.style.width = '1920px'
        slideDiv.style.height = '1080px'
        slideDiv.style.background = '#ffffff'
        slideDiv.style.overflow = 'hidden'
        slideDiv.style.opacity = '0'
        slideDiv.style.pointerEvents = 'none'
        slideDiv.style.zIndex = '-1'

        const imageLoadPromises = []

        if (slide.type === 'image') {
          let dataUrl = slide.imageData && slide.imageData.startsWith('data:')
            ? slide.imageData
            : null
          if (!dataUrl) {
            const src = slide.blobUrl || slide.imageUrl
            if (src) {
              try {
                const res = await fetch(src)
                const blob = await res.blob()
                dataUrl = await new Promise((resolve, reject) => {
                  const reader = new FileReader()
                  reader.onload = () => resolve(reader.result)
                  reader.onerror = reject
                  reader.readAsDataURL(blob)
                })
              } catch (e) {
                console.warn(`スライド画像の取得に失敗しました (slide ${i + 1}):`, e)
              }
            }
          }
          if (dataUrl) {
            const img = document.createElement('img')
            img.style.width = '100%'
            img.style.height = '100%'
            img.style.objectFit = 'contain'
            imageLoadPromises.push(
              new Promise((resolve) => {
                img.onload = () => resolve()
                img.onerror = () => resolve()
              })
            )
            img.src = dataUrl
            slideDiv.appendChild(img)
          }
        }

        for (const tb of slide.textBoxes || []) {
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

        for (const ann of slide.annotations || []) {
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

        document.body.appendChild(slideDiv)
        mountedDivs.push(slideDiv)

        await Promise.all(imageLoadPromises)

        const canvas = await html2canvas(slideDiv, {
          scale: 1,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 1920,
          height: 1080,
          windowWidth: 1920,
          windowHeight: 1080,
        })

        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        if (i > 0) pdf.addPage([1920, 1080], 'landscape')
        pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080)
      }

      pdf.save(`${ws.name}.pdf`)
      toast.success('PDFをエクスポートしました')
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('PDFエクスポートに失敗しました')
    } finally {
      mountedDivs.forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el)
      })
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
