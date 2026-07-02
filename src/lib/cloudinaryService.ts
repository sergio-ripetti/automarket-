const CLOUD_NAME = 'dlfgvbtzz'
const UPLOAD_PRESET = 'automarket_docs'

// Uploads a document file (e.g. ID, payslip) to Cloudinary under automarket/{folder} and returns its secure URL
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
  return data.secure_url
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
