import { useDrive } from '../hooks/useDrive'
import { useWorkspaceStore } from '../store/workspaceStore'

export default function DriveSetup() {
  const { connect } = useDrive()
  const driveConnected = useWorkspaceStore((s) => s.driveConnected)

  if (driveConnected) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <h2 className="text-lg font-bold text-gray-800 mb-2">
          Googleドライブに接続
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          画像やワークスペースのデータをGoogleドライブに保存します。
          接続しない場合、リロードするとデータが失われます。
        </p>
        <button
          onClick={connect}
          className="w-full py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent-dark transition-colors"
        >
          Googleドライブに接続
        </button>
        <button
          onClick={() => document.querySelector('[data-drive-modal]')?.remove()}
          className="w-full py-2 mt-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
        >
          あとで接続する
        </button>
      </div>
    </div>
  )
}
