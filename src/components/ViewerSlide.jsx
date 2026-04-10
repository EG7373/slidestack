export default function ViewerSlide({ slide }) {
  return (
    <div className="relative aspect-video bg-white rounded-sm shadow-2xl overflow-hidden transition-opacity duration-300">
      {/* Background image */}
      {slide.type === 'image' && (slide.blobUrl || slide.imageUrl) ? (
        <img
          src={slide.blobUrl || slide.imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-white" />
      )}

      {/* TextBoxes (read-only) */}
      {slide.textBoxes.map((tb) => (
        <div
          key={tb.id}
          className="absolute px-1"
          style={{
            left: `${tb.x}%`,
            top: `${tb.y}%`,
            width: `${tb.width}%`,
            fontSize: `${tb.fontSize}px`,
            color: tb.color,
          }}
          dangerouslySetInnerHTML={{ __html: tb.content }}
        />
      ))}

      {/* Annotations (read-only) */}
      {slide.annotations.map((ann) => (
        <div
          key={ann.id}
          className="absolute rounded-lg px-3 py-2 bg-orange-400/70 backdrop-blur-sm text-sm text-white"
          style={{
            left: `${ann.x}%`,
            top: `${ann.y}%`,
            width: `${ann.width}%`,
          }}
          dangerouslySetInnerHTML={{ __html: ann.content }}
        />
      ))}
    </div>
  )
}
