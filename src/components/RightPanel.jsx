import { useWorkspaceStore } from '../store/workspaceStore'

const COLORS = ['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6']

export default function RightPanel() {
  const {
    getCurrentSlide,
    selectedElementId,
    selectedElementType,
    addTextBox,
    addAnnotation,
    updateTextBox,
    removeTextBox,
    removeAnnotation,
  } = useWorkspaceStore()

  const slide = getCurrentSlide()
  if (!slide) return <div className="bg-white border-l border-gray-200" />

  const selectedTb = selectedElementType === 'textbox'
    ? slide.textBoxes.find((tb) => tb.id === selectedElementId)
    : null

  const selectedAnn = selectedElementType === 'annotation'
    ? slide.annotations.find((a) => a.id === selectedElementId)
    : null

  return (
    <div className="h-full bg-white border-l border-gray-200 p-3 flex flex-col gap-4 overflow-y-auto">
      {/* Insert section */}
      <div>
        <div className="text-xs font-medium text-gray-400 mb-2 uppercase">挿入</div>
        <button
          onClick={() => addTextBox(slide.id)}
          className="w-full py-1.5 mb-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 transition-colors"
        >
          + テキスト追加
        </button>
        <button
          onClick={() => addAnnotation(slide.id)}
          className="w-full py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 transition-colors"
        >
          + 注釈追加
        </button>
      </div>

      {/* TextBox properties */}
      {selectedTb && (
        <div>
          <div className="text-xs font-medium text-gray-400 mb-2 uppercase">テキスト設定</div>
          <label className="text-xs text-gray-500 block mb-1">フォントサイズ</label>
          <input
            type="range"
            min="10"
            max="72"
            value={selectedTb.fontSize}
            onChange={(e) =>
              updateTextBox(slide.id, selectedTb.id, { fontSize: Number(e.target.value) })
            }
            className="w-full mb-1 accent-accent"
          />
          <div className="text-xs text-gray-400 text-right mb-3">{selectedTb.fontSize}px</div>

          <label className="text-xs text-gray-500 block mb-1">色</label>
          <div className="flex flex-wrap gap-1 mb-3">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => updateTextBox(slide.id, selectedTb.id, { color: c })}
                className={`w-5 h-5 rounded-full border transition-transform ${
                  selectedTb.color === c ? 'ring-2 ring-accent scale-110' : 'border-gray-200'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <button
            onClick={() => removeTextBox(slide.id, selectedTb.id)}
            className="w-full py-1.5 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
          >
            テキスト削除
          </button>
        </div>
      )}

      {/* Annotation properties */}
      {selectedAnn && (
        <div>
          <div className="text-xs font-medium text-gray-400 mb-2 uppercase">注釈設定</div>
          <button
            onClick={() => removeAnnotation(slide.id, selectedAnn.id)}
            className="w-full py-1.5 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
          >
            注釈削除
          </button>
        </div>
      )}

      {/* Slide info */}
      <div className="mt-auto">
        <div className="text-xs font-medium text-gray-400 mb-1 uppercase">スライド情報</div>
        <div className="text-xs text-gray-400">
          テキスト: {slide.textBoxes.length}個
        </div>
        <div className="text-xs text-gray-400">
          注釈: {slide.annotations.length}個
        </div>
      </div>
    </div>
  )
}
