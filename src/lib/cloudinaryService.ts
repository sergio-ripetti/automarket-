const CLOUD_NAME = 'dlfgvbtzz'
const UPLOAD_PRESET = 'automarket_docs'

// Uploads a document file (e.g. ID, payslip, PDF) to Cloudinary under automarket/{folder} and returns its secure URL.
// A 200 upload response does not guarantee the file can actually be retrieved afterward - Cloudinary
// can accept and store a file while still blocking delivery of it (e.g. the account-level "PDF and ZIP
// delivery" restriction), which otherwise surfaces to users only later as a silently broken View/Download
// link. So we verify the returned secure_url is actually reachable before treating the upload as successful.
export async function uploadDocument(file: File, folder: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', `automarket/${folder}`)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to upload document')
  }

  const data = await response.json()
  const secureUrl: string = data.secure_url

  const deliveryCheck = await fetch(secureUrl, { method: 'HEAD', mode: 'cors' }).catch(() => null)
  if (!deliveryCheck || !deliveryCheck.ok) {
    throw new Error(
      'File uploaded but is not retrievable from Cloudinary. This usually means the Cloudinary account blocks delivery of this file type (e.g. PDF/ZIP delivery restriction) - contact the account owner.'
    )
  }

  return secureUrl
}

// Uploads an image file to Cloudinary under automarket/{folder} and returns its secure URL
export async function uploadImage(file: File, folder: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', `automarket/${folder}`)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to upload image')
  }

  const data = await response.json()
  return data.secure_url
}

export interface UploadedFileMeta {
  url: string
  publicId: string
  resourceType: string
}

// Uploads a Sales document/photo and returns full Cloudinary metadata (url, publicId, resourceType),
// not just the URL - the publicId + resourceType are required later to delete the file from
// Cloudinary via deleteFile() when it's removed in Record New Sale / Edit Sale. Used only by the
// Sales flows; other callers (Inventory, Financing) keep using the plain-string uploadImage/uploadDocument above.
export async function uploadSalesDocument(file: File, folder: string): Promise<UploadedFileMeta> {
  const isImage = file.type.startsWith('image/')
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', `automarket/${folder}`)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(isImage ? 'Failed to upload image' : 'Failed to upload document')
  }

  const data = await response.json()
  const secureUrl: string = data.secure_url
  const publicId: string = data.public_id
  const resourceType: string = data.resource_type

  if (!isImage) {
    const deliveryCheck = await fetch(secureUrl, { method: 'HEAD', mode: 'cors' }).catch(() => null)
    if (!deliveryCheck || !deliveryCheck.ok) {
      throw new Error(
        'File uploaded but is not retrievable from Cloudinary. This usually means the Cloudinary account blocks delivery of this file type (e.g. PDF/ZIP delivery restriction) - contact the account owner.'
      )
    }
  }

  return { url: secureUrl, publicId, resourceType }
}
