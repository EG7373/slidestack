export default function ViewerNav({ slides, currentIndex, onGoTo, showUI }) {
  return (
    <div
      className={`
        flex flex-col items-center gap-2 pb-4
        transition-opacity duration-300
        ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
    >
      {/* Dot indicators */}
      <div className="flex items-center gap-1.5">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => onGoTo(i)}
            className={`
              rounded-full transition-all duration-200
              ${i === currentIndex
                ? 'w-3 h-3 bg-white'
                : 'w-2 h-2 bg-white/40 hover:bg-white/60'
              }
            `}
          />
        ))}
      </div>

      {/* Page number */}
      <div className="text-white/50 text-xs">
        {currentIndex + 1} / {slides.length}
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-1 overflow-x-auto max-w-[80vw] px-2 py-1">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => onGoTo(i)}
            className={`
              flex-shrink-0 w-16 h-9 rounded overflow-hidden border-2 transition-all
              ${i === currentIndex ? 'border-white shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}
            `}
          >
            {slide.type === 'image' && (slide.blobUrl || slide.imageUrl) ? (
              <img
                src={slide.blobUrl || slide.imageUrl}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-gray-700" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
