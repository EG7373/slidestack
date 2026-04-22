import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useWorkspaceStore } from '../store/workspaceStore'
import InsertMenu from './InsertMenu'

function SortableThumb({ slide, index, isActive, onClick, onDelete, canDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: slide.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const uploadStatus = useWorkspaceStore((s) => s.uploadStatuses[slide.id])

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    if (!canDelete) return
    if (window.confirm(`スライド ${index + 1} を削除しますか？`)) {
      onDelete(slide.id)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(index)}
      className={`
        group relative cursor-pointer rounded-md overflow-hidden border-2 transition-colors
        ${isActive ? 'border-accent shadow-md' : 'border-transparent hover:border-gray-300'}
      `}
    >
      <div className="aspect-video bg-white">
        {slide.type === 'image' && (slide.blobUrl || slide.imageUrl) ? (
          <img
            src={slide.blobUrl || slide.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
            空白
          </div>
        )}
      </div>
      <div className="text-[10px] text-center text-gray-400 py-0.5">
        {index + 1}
      </div>
      {uploadStatus === 'uploading' && (
        <div className="absolute top-1 right-1 w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      )}
      {uploadStatus === 'error' && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-bold">!</div>
      )}
      {canDelete && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleDeleteClick}
          className="absolute top-1 left-1 w-5 h-5 bg-white/90 hover:bg-red-500 hover:text-white text-gray-500 rounded-full flex items-center justify-center text-xs leading-none shadow opacity-0 group-hover:opacity-100 transition-opacity"
          title="このスライドを削除"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default function SlidePanel() {
  const [showInsertMenu, setShowInsertMenu] = useState(false)
  const {
    getCurrentWorkspace,
    currentSlideIndex,
    setCurrentSlide,
    reorderSlides,
    removeSlide,
  } = useWorkspaceStore()

  const ws = getCurrentWorkspace()
  if (!ws) return null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ws.slides.findIndex((s) => s.id === active.id)
    const newIndex = ws.slides.findIndex((s) => s.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderSlides(oldIndex, newIndex)
    }
  }

  return (
    <div className="h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={ws.slides.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {ws.slides.map((slide, index) => (
              <SortableThumb
                key={slide.id}
                slide={slide}
                index={index}
                isActive={index === currentSlideIndex}
                onClick={setCurrentSlide}
                onDelete={removeSlide}
                canDelete={ws.slides.length > 1}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Insert button */}
      <div className="p-2 border-t border-gray-200 relative">
        <button
          onClick={() => setShowInsertMenu(!showInsertMenu)}
          className="w-full py-1.5 text-sm text-accent border border-accent/30 rounded-md hover:bg-accent-light transition-colors"
        >
          + スライド挿入
        </button>
        {showInsertMenu && (
          <InsertMenu onClose={() => setShowInsertMenu(false)} />
        )}
      </div>

      {/* Page indicator */}
      <div className="text-center text-xs text-gray-400 py-1.5 border-t border-gray-200">
        {currentSlideIndex + 1} / {ws.slides.length}
      </div>
    </div>
  )
}
