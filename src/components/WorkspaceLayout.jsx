import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '../store/workspaceStore'
import Sidebar from './Sidebar'
import SlidePanel from './SlidePanel'
import SlideCanvas from './SlideCanvas'
import RightPanel from './RightPanel'
import Toolbar from './Toolbar'
import { useFirestoreSync, useBeforeUnloadWarning } from '../hooks/useWorkspace'

export default function WorkspaceLayout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    workspaces,
    currentWorkspaceId,
    switchWorkspace,
    nextSlide,
    prevSlide,
    selectedElementId,
    selectedElementType,
    getCurrentSlide,
    removeTextBox,
    removeAnnotation,
    getCurrentWorkspace,
    removeSlide,
    clearSelection,
  } = useWorkspaceStore()

  useFirestoreSync(id)
  useBeforeUnloadWarning()

  useEffect(() => {
    if (workspaces[id]) {
      if (currentWorkspaceId !== id) switchWorkspace(id)
    } else {
      navigate('/')
    }
  }, [id, workspaces, currentWorkspaceId, switchWorkspace, navigate])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName
      const editable = document.activeElement?.isContentEditable
      if (tag === 'INPUT' || tag === 'TEXTAREA' || editable) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevSlide()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextSlide()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault()
          const slide = getCurrentSlide()
          if (!slide) return
          if (selectedElementType === 'textbox') {
            removeTextBox(slide.id, selectedElementId)
          } else if (selectedElementType === 'annotation') {
            removeAnnotation(slide.id, selectedElementId)
          }
        }
      } else if (e.key === 'Escape') {
        clearSelection()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [nextSlide, prevSlide, selectedElementId, selectedElementType, getCurrentSlide, removeTextBox, removeAnnotation, removeSlide, clearSelection])

  const ws = workspaces[id]
  if (!ws) return null

  return (
    <div className="h-screen grid grid-cols-[220px_130px_1fr_170px] grid-rows-[auto_1fr] bg-gray-100">
      <div className="row-span-2">
        <Sidebar />
      </div>
      <div className="col-span-3">
        <Toolbar />
      </div>
      <SlidePanel />
      <SlideCanvas />
      <RightPanel />
    </div>
  )
}
