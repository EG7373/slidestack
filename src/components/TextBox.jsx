import { useState, useRef, useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import ContentEditable from 'react-contenteditable'
import { useWorkspaceStore } from '../store/workspaceStore'

export default function TextBox({ slideId, textBox }) {
  const [editing, setEditing] = useState(false)
  const contentRef = useRef(textBox.content)
  const resizeRef = useRef(null)

  const {
    selectedElementId,
    selectElement,
    updateTextBox,
  } = useWorkspaceStore()

  const isSelected = selectedElementId === textBox.id

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: textBox.id,
    disabled: editing,
  })

  const style = {
    position: 'absolute',
    left: `${textBox.x}%`,
    top: `${textBox.y}%`,
    width: `${textBox.width}%`,
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    fontSize: `${textBox.fontSize}px`,
    color: textBox.color,
    zIndex: isSelected ? 20 : 10,
  }

  const handleClick = (e) => {
    e.stopPropagation()
    selectElement(textBox.id, 'textbox')
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation()
    setEditing(true)
  }

  const handleBlur = () => {
    setEditing(false)
    updateTextBox(slideId, textBox.id, { content: contentRef.current })
  }

  const handleChange = (e) => {
    contentRef.current = e.target.value
  }

  const handleResizeStart = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const startWidth = textBox.width

    const handleMove = (moveEvent) => {
      const canvas = resizeRef.current?.closest('[class*="aspect-video"]')
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const deltaXPct = ((moveEvent.clientX - startX) / rect.width) * 100
      const newWidth = Math.max(5, Math.min(100 - textBox.x, startWidth + deltaXPct))
      updateTextBox(slideId, textBox.id, { width: newWidth })
    }

    const handleUp = () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('pointerup', handleUp)
    }

    document.addEventListener('pointermove', handleMove)
    document.addEventListener('pointerup', handleUp)
  }, [textBox.width, textBox.x, textBox.id, slideId, updateTextBox])

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`
        group cursor-move select-none
        ${isSelected ? 'ring-2 ring-accent ring-offset-1' : 'hover:ring-1 hover:ring-gray-300'}
      `}
      {...(editing ? {} : { ...attributes, ...listeners })}
    >
      <ContentEditable
        html={contentRef.current}
        disabled={!editing}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`
          outline-none min-h-[1.5em] px-1
          ${editing ? 'cursor-text bg-white/80' : 'cursor-move'}
        `}
        style={{ fontSize: `${textBox.fontSize}px`, color: textBox.color }}
      />
      {isSelected && (
        <div
          ref={resizeRef}
          onPointerDown={handleResizeStart}
          className="absolute -bottom-1 -right-1 w-3 h-3 bg-accent rounded-sm cursor-se-resize"
        />
      )}
    </div>
  )
}
