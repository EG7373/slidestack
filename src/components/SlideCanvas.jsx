import { useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToParentElement } from '@dnd-kit/modifiers'
import { useWorkspaceStore, createImageSlide } from '../store/workspaceStore'
import TextBox from './TextBox'
import Annotation from './Annotation'

export default function SlideCanvas() {
  const canvasRef = useRef(null)
  const {
    getCurrentWorkspace,
    getCurrentSlide,
    currentSlideIndex,
    nextSlide,
    prevSlide,
    updateSlide,
    updateTextBox,
    updateAnnotation,
    clearSelection,
  } = useWorkspaceStore()

  const ws = getCurrentWorkspace()
  const slide = getCurrentSlide()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } })
  )

  const onDrop = useCallback((acceptedFiles) => {
    if (!slide || acceptedFiles.length === 0) return
    const file = acceptedFiles[0]
    const blobUrl = URL.createObjectURL(file)
    if (slide.blobUrl) URL.revokeObjectURL(slide.blobUrl)
    updateSlide(slide.id, { type: 'image', blobUrl, file })
  }, [slide, updateSlide])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    noClick: true,
  })

  const handleDragEnd = (event) => {
    const { active, delta } = event
    if (!canvasRef.current || !slide) return

    const rect = canvasRef.current.getBoundingClientRect()
    const deltaXPct = (delta.x / rect.width) * 100
    const deltaYPct = (delta.y / rect.height) * 100

    const tb = slide.textBoxes.find((t) => t.id === active.id)
    if (tb) {
      updateTextBox(slide.id, tb.id, {
        x: Math.max(0, Math.min(100 - tb.width, tb.x + deltaXPct)),
        y: Math.max(0, Math.min(95, tb.y + deltaYPct)),
      })
      return
    }

    const ann = slide.annotations.find((a) => a.id === active.id)
    if (ann) {
      updateAnnotation(slide.id, ann.id, {
        x: Math.max(0, Math.min(100 - ann.width, ann.x + deltaXPct)),
        y: Math.max(0, Math.min(95, ann.y + deltaYPct)),
      })
    }
  }

  const handleCanvasClick = (e) => {
    if (e.target === e.currentTarget || e.target === canvasRef.current) {
      clearSelection()
    }
  }

  if (!ws || !slide) return <div className="bg-gray-200 flex-1" />

  return (
    <div className="flex flex-col h-full bg-gray-200">
      {/* Canvas area */}
      <div
        className="flex-1 flex items-center justify-center p-4 overflow-hidden"
        onClick={handleCanvasClick}
      >
        <div
          {...getRootProps()}
          ref={canvasRef}
          className={`
            relative w-full max-h-full aspect-video bg-white shadow-lg rounded-sm overflow-hidden
            ${isDragActive ? 'ring-2 ring-accent' : ''}
          `}
          style={{ maxWidth: '100%' }}
        >
          <input {...getInputProps()} />

          {/* Background image */}
          {slide.type === 'image' && (slide.blobUrl || slide.imageUrl) ? (
            <img
              src={slide.blobUrl || slide.imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
            />
          ) : (
            isDragActive && (
              <div className="absolute inset-0 flex items-center justify-center text-accent text-sm">
                ドロップして画像を設定
              </div>
            )
          )}

          {/* DnD context for TextBoxes and Annotations */}
          <DndContext
            sensors={sensors}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToParentElement]}
          >
            {slide.textBoxes.map((tb) => (
              <TextBox key={tb.id} slideId={slide.id} textBox={tb} />
            ))}
            {slide.annotations.map((ann) => (
              <Annotation key={ann.id} slideId={slide.id} annotation={ann} />
            ))}
          </DndContext>
        </div>
      </div>

      {/* Page navigation */}
      <div className="flex items-center justify-center gap-4 py-2 bg-gray-100 border-t border-gray-200">
        <button
          onClick={prevSlide}
          disabled={currentSlideIndex === 0}
          className="px-3 py-1 text-sm text-gray-600 hover:text-accent disabled:text-gray-300 transition-colors"
        >
          ‹
        </button>
        <span className="text-sm text-gray-500">
          {currentSlideIndex + 1} / {ws.slides.length}
        </span>
        <button
          onClick={nextSlide}
          disabled={currentSlideIndex === ws.slides.length - 1}
          className="px-3 py-1 text-sm text-gray-600 hover:text-accent disabled:text-gray-300 transition-colors"
        >
          ›
        </button>
      </div>
    </div>
  )
}
