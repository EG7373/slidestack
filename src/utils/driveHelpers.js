const SCOPES = 'https://www.googleapis.com/auth/drive.file'
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
const FOLDER_NAME = 'SlideStack'

let gapiLoaded = false
let gisLoaded = false
let tokenClient = null

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export async function loadGapi() {
  if (gapiLoaded) return
  await loadScript('https://apis.google.com/js/api.js')
  await new Promise((resolve) => window.gapi.load('client', resolve))
  await window.gapi.client.init({
    apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  })
  gapiLoaded = true
}

export async function loadGis() {
  if (gisLoaded) return
  await loadScript('https://accounts.google.com/gsi/client')
  gisLoaded = true
}

export function getAuthToken() {
  return new Promise(async (resolve, reject) => {
    await loadGis()
    if (!tokenClient) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            reject(response)
          } else {
            resolve({
              token: response.access_token,
              expiry: Date.now() + response.expires_in * 1000,
            })
          }
        },
      })
    }
    tokenClient.requestAccessToken({ prompt: '' })
  })
}

async function ensureAuth(store) {
  const { driveToken, driveTokenExpiry } = store.getState()
  if (driveToken && driveTokenExpiry && Date.now() < driveTokenExpiry - 60000) {
    return driveToken
  }
  const { token, expiry } = await getAuthToken()
  store.getState().setDriveConnected(true, token, expiry)
  return token
}

async function getOrCreateFolder(token) {
  const searchRes = await window.gapi.client.drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  })

  if (searchRes.result.files?.length > 0) {
    return searchRes.result.files[0].id
  }

  const createRes = await window.gapi.client.drive.files.create({
    resource: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  })
  return createRes.result.id
}

export async function uploadImage(file, workspaceId, store) {
  await loadGapi()
  const token = await ensureAuth(store)
  const folderId = await getOrCreateFolder(token)

  const metadata = {
    name: `${workspaceId}_${file.name}`,
    parents: [folderId],
  }

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file)

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webContentLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  )

  if (!response.ok) throw new Error(`Upload failed: ${response.status}`)
  const result = await response.json()
  return { fileId: result.id, imageUrl: result.webContentLink }
}

export async function downloadImage(fileId, store) {
  await loadGapi()
  const token = await ensureAuth(store)

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!response.ok) throw new Error(`Download failed: ${response.status}`)
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export async function saveWorkspaceJson(workspaceId, data, existingFileId, store) {
  await loadGapi()
  const token = await ensureAuth(store)
  const folderId = await getOrCreateFolder(token)

  const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })

  if (existingFileId) {
    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: jsonBlob,
      }
    )
    if (!response.ok) throw new Error(`Save failed: ${response.status}`)
    return existingFileId
  }

  const metadata = {
    name: `workspace_${workspaceId}.json`,
    parents: [folderId],
    mimeType: 'application/json',
  }

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', jsonBlob)

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  )

  if (!response.ok) throw new Error(`Save failed: ${response.status}`)
  const result = await response.json()
  return result.id
}

export async function loadWorkspaceJson(fileId, store) {
  await loadGapi()
  const token = await ensureAuth(store)

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!response.ok) throw new Error(`Load failed: ${response.status}`)
  return response.json()
}

export async function listWorkspaceFiles(store) {
  await loadGapi()
  const token = await ensureAuth(store)
  const folderId = await getOrCreateFolder(token)

  const res = await window.gapi.client.drive.files.list({
    q: `'${folderId}' in parents and name contains 'workspace_' and name contains '.json' and trashed=false`,
    fields: 'files(id, name, modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: 20,
  })

  return res.result.files || []
}
