import { useRef } from 'react'
import { useWorkspaceStore, createBlankSlide, createImageSlide } from '../store/workspaceStore'
import { fileToDataUrl } from '../utils/workspaceBundle'

export default function InsertMenu({ onClose }) {
  const fileInputRef = useRef(null)
  const { addSlide } = useWorkspaceStore()

  const handleBlank = () => {
    addSlide(createBlankSlide())
    onClose()
  }

  const handleImageSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      const blobUrl = URL.createObjectURL(file)
      const imageData = await fileToDataUrl(file).catch(() => null)
      addSlide(createImageSlide(blobUrl, file, imageData))
    }
    onClose()
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
      <button
        onClick={handleBlank}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
      >
        空白スライドを挿入
      </button>
      <button
        onClick={handleImageSelect}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
      >
        画像を挿入してページを追加
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
    </div>
  )
}
