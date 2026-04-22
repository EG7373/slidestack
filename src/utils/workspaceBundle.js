const BUNDLE_FORMAT_VERSION = 1

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function fileToDataUrl(file) {
  return blobToDataUrl(file)
}

async function sourceToDataUrl(src) {
  const res = await fetch(src)
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`)
  const blob = await res.blob()
  return blobToDataUrl(blob)
}

function dataUrlToBlobUrl(dataUrl) {
  const [meta, base64] = dataUrl.split(',')
  const mimeMatch = meta.match(/data:([^;]+)/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}

export async function buildBundle(workspace, { downloadDriveImage } = {}) {
  const slides = []
  for (const s of workspace.slides) {
    const slide = {
      id: s.id,
      order: s.order,
      type: s.type,
      textBoxes: s.textBoxes || [],
      annotations: s.annotations || [],
    }
    if (s.type === 'image') {
      let dataUrl = s.imageData || null
      if (!dataUrl && s.blobUrl) {
        try {
          dataUrl = await sourceToDataUrl(s.blobUrl)
        } catch {
          dataUrl = null
        }
      }
      if (!dataUrl && s.driveFileId && downloadDriveImage) {
        const blobUrl = await downloadDriveImage(s.driveFileId)
        if (blobUrl) {
          try {
            dataUrl = await sourceToDataUrl(blobUrl)
          } catch {
            dataUrl = null
          }
        }
      }
      slide.imageData = dataUrl
    }
    slides.push(slide)
  }

  return {
    bundleFormat: 'slidestack-bundle',
    bundleVersion: BUNDLE_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    id: workspace.id,
    name: workspace.name,
    createdAt: workspace.createdAt,
    updatedAt: workspace.updatedAt,
    aspectRatio: workspace.aspectRatio || '16:9',
    slides,
  }
}

export function downloadBundle(bundle) {
  const json = JSON.stringify(bundle, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeName = (bundle.name || 'slidestack').replace(/[\\/:*?"<>|]+/g, '_')
  a.download = `${safeName}.slidestack.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function readBundleFile(file) {
  const text = await file.text()
  const data = JSON.parse(text)
  return hydrateBundle(data)
}

export function hydrateBundle(data) {
  const slides = (data.slides || []).map((s) => {
    const slide = {
      id: s.id,
      order: s.order ?? 0,
      type: s.type || 'blank',
      textBoxes: s.textBoxes || [],
      annotations: s.annotations || [],
      imageUrl: null,
      imageData: s.imageData || null,
      driveFileId: null,
      file: null,
      uploadStatus: 'idle',
      blobUrl: null,
    }
    if (s.type === 'image' && s.imageData) {
      try {
        slide.blobUrl = dataUrlToBlobUrl(s.imageData)
      } catch {
        slide.blobUrl = null
      }
    }
    return slide
  })
  return {
    id: data.id,
    name: data.name,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    aspectRatio: data.aspectRatio || '16:9',
    slides,
  }
}
