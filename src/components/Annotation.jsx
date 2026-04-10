import { useState, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import ContentEditable from 'react-contenteditable'
import { useWorkspaceStore } from '../store/workspaceStore'

export default function Annotation({ slideId, annotation }) {
  const [editing, setEditing] = useState(false)
  const contentRef = useRef(annotation.content)

  const {
    selectedElementId,
    selectElement,
    updateAnnotation,
  } = useWorkspaceStore()

  const isSelected = selectedElementId === annotation.id

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: annotation.id,
    disabled: editing,
  })

  const style = {
    position: 'absolute',
    left: `${annotation.x}%`,
    top: `${annotation.y}%`,
    width: `${annotation.width}%`,
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    zIndex: isSelected ? 20 : 10,
  }

  const handleClick = (e) => {
    e.stopPropagation()
    selectElement(annotation.id, 'annotation')
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation()
    setEditing(true)
  }

  const handleBlur = () => {
    setEditing(false)
    updateAnnotation(slideId, annotation.id, { content: contentRef.current })
  }

  const handleChange = (e) => {
    contentRef.current = e.target.value
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`
        group cursor-move select-none rounded-lg px-3 py-2
        bg-orange-400/70 backdrop-blur-sm shadow-sm
        ${isSelected ? 'ring-2 ring-accent ring-offset-1' : 'hover:ring-1 hover:ring-orange-300'}
      `}
      {...(editing ? {} : { ...attributes, ...listeners })}
    >
      <ContentEditable
        html={contentRef.current}
        disabled={!editing}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`
          outline-none text-sm text-white min-h-[1.2em]
          ${editing ? 'cursor-text' : 'cursor-move'}
        `}
      />
    </div>
  )
}
