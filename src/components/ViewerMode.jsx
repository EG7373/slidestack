import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '../store/workspaceStore'
import ViewerSlide from './ViewerSlide'
import ViewerNav from './ViewerNav'

export default function ViewerMode() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    workspaces,
    switchWorkspace,
    currentWorkspaceId,
  } = useWorkspaceStore()

  const [slideIndex, setSlideIndex] = useState(0)
  const [showUI, setShowUI] = useState(true)
  const hideTimerRef = useRef(null)

  const ws = workspaces[id]

  useEffect(() => {
    if (!ws) {
      navigate('/')
      return
    }
    if (currentWorkspaceId !== id) switchWorkspace(id)
  }, [id, ws, currentWorkspaceId, switchWorkspace, navigate])

  const slides = ws?.slides || []
  const totalSlides = slides.length
  const currentSlide = slides[slideIndex] || null

  const goTo = useCallback((index) => {
    setSlideIndex(Math.max(0, Math.min(index, totalSlides - 1)))
  }, [totalSlides])

  const next = useCallback(() => goTo(slideIndex + 1), [slideIndex, goTo])
  const prev = useCallback(() => goTo(slideIndex - 1), [slideIndex, goTo])

  const exitViewer = useCallback(() => {
    navigate(`/workspace/${id}`)
  }, [navigate, id])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }, [])

  // Auto-hide UI
  const resetHideTimer = useCallback(() => {
    setShowUI(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setShowUI(false), 3000)
  }, [])

  useEffect(() => {
    resetHideTimer()
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [resetHideTimer])

  useEffect(() => {
    const handleMouseMove = () => resetHideTimer()
    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [resetHideTimer])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          prev()
          break
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          next()
          break
        case 'Escape':
          exitViewer()
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [next, prev, exitViewer, toggleFullscreen])

  if (!ws) return null

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col z-50">
      {/* Top bar */}
      <div
        className={`
          absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3
          bg-gradient-to-b from-black/60 to-transparent
          transition-opacity duration-300
          ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        <div className="text-white text-sm font-medium">{ws.name}</div>
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-xs hidden sm:inline">
            ← → キーでページ移動 | F フルスクリーン | Esc 終了
          </span>
          <button
            onClick={toggleFullscreen}
            className="text-white/70 hover:text-white text-sm transition-colors"
            title="フルスクリーン"
          >
            ⤢
          </button>
          <button
            onClick={exitViewer}
            className="text-white/70 hover:text-white text-sm transition-colors"
          >
            ✕ 編集に戻る
          </button>
        </div>
      </div>

      {/* Main slide area */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Left arrow */}
        <button
          onClick={prev}
          disabled={slideIndex === 0}
          className={`
            absolute left-4 z-20 w-10 h-10 rounded-full bg-white/10 text-white/70
            hover:bg-white/20 hover:text-white flex items-center justify-center text-lg
            disabled:opacity-0 transition-all duration-300
            ${showUI ? 'opacity-100' : 'opacity-0'}
          `}
        >
          ‹
        </button>

        {/* Slide */}
        <div className="w-[80%] max-w-[1200px] max-h-[80vh]">
          {currentSlide && <ViewerSlide slide={currentSlide} />}
        </div>

        {/* Right arrow */}
        <button
          onClick={next}
          disabled={slideIndex === totalSlides - 1}
          className={`
            absolute right-4 z-20 w-10 h-10 rounded-full bg-white/10 text-white/70
            hover:bg-white/20 hover:text-white flex items-center justify-center text-lg
            disabled:opacity-0 transition-all duration-300
            ${showUI ? 'opacity-100' : 'opacity-0'}
          `}
        >
          ›
        </button>
      </div>

      {/* Bottom nav */}
      <ViewerNav
        slides={slides}
        currentIndex={slideIndex}
        onGoTo={goTo}
        showUI={showUI}
      />
    </div>
  )
}
