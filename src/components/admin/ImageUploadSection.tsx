import { useState, useRef, useEffect } from 'react'
import { X, Upload, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import { uploadImage } from '../../lib/cloudinaryService'
import AdminLabel from './AdminLabel'

export interface UploadedImage {
  url: string
  filename: string
  isUploading: boolean
  error?: string
  _tempId?: string
}

interface ImageUploadSectionProps {
  images: UploadedImage[]
  onImagesChange: (images: UploadedImage[] | ((prev: UploadedImage[]) => UploadedImage[])) => void
  disabled?: boolean
  maxImages?: number
  maxFileSize?: number
}

const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_IMAGES = 8

export default function ImageUploadSection({
  images,
  onImagesChange,
  disabled = false,
  maxImages = MAX_IMAGES,
  maxFileSize = MAX_FILE_SIZE,
}: ImageUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const objectUrlsRef = useRef<Set<string>>(new Set())

  // Cleanup object URLs on unmount
  useEffect(() => {
    const urlsToCleanup = objectUrlsRef.current
    return () => {
      urlsToCleanup.forEach((url) => URL.revokeObjectURL(url))
      urlsToCleanup.clear()
    }
  }, [])

  const validateFiles = (files: FileList): { valid: File[]; errors: string[] } => {
    const validFiles: File[] = []
    const newErrors: string[] = []
    const seenNames = new Set<string>()

    // Check total image count
    const totalImages = images.filter((img) => !img.error).length + files.length
    if (totalImages > maxImages) {
      newErrors.push(`Maximum ${maxImages} images allowed. You have ${images.filter((img) => !img.error).length} and are trying to add ${files.length}.`)
      return { valid: [], errors: newErrors }
    }

    Array.from(files).forEach((file) => {
      // Check if duplicate
      if (seenNames.has(file.name)) {
        newErrors.push(`Duplicate file: ${file.name}`)
        return
      }
      seenNames.add(file.name)

      // Check format
      if (!ACCEPTED_FORMATS.includes(file.type)) {
        newErrors.push(`${file.name}: Unsupported format. Accept JPEG, PNG, WebP.`)
        return
      }

      // Check size
      if (file.size === 0) {
        newErrors.push(`${file.name}: Empty file rejected.`)
        return
      }

      if (file.size > maxFileSize) {
        newErrors.push(`${file.name}: File too large (max ${maxFileSize / 1024 / 1024}MB).`)
        return
      }

      validFiles.push(file)
    })

    return { valid: validFiles, errors: newErrors }
  }

  const handleFiles = async (files: FileList) => {
    const { valid, errors: validationErrors } = validateFiles(files)
    setErrors(validationErrors)

    if (valid.length === 0) return

    // Create preview images immediately with unique IDs
    const newImages: (UploadedImage & { _tempId: string })[] = valid.map((file) => {
      const objectUrl = URL.createObjectURL(file)
      objectUrlsRef.current.add(objectUrl)
      return {
        url: objectUrl,
        filename: file.name,
        isUploading: true,
        _tempId: `${Date.now()}-${Math.random()}`,
      }
    })

    const allImages = [...images, ...newImages]
    onImagesChange(allImages)

    // Upload each file and update when done
    newImages.forEach((newImg, idx) => {
      const originalIndex = images.length + idx
      uploadImage(valid[idx], 'vehicles')
        .then((cloudinaryUrl) => {
          onImagesChange((currentImages) => {
            return currentImages.map((img, imgIdx) => {
              if (imgIdx === originalIndex) {
                // Revoke object URL after successful upload
                if (objectUrlsRef.current.has(newImg.url)) {
                  URL.revokeObjectURL(newImg.url)
                  objectUrlsRef.current.delete(newImg.url)
                }
                return {
                  url: cloudinaryUrl,
                  filename: newImg.filename,
                  isUploading: false,
                }
              }
              return img
            })
          })
        })
        .catch((err) => {
          console.error('Upload error:', err)
          setErrors((prev) => [...prev, `${newImg.filename}: Upload failed`])
          onImagesChange((currentImages) => {
            return currentImages.map((img, imgIdx) => {
              if (imgIdx === originalIndex) {
                return {
                  ...img,
                  isUploading: false,
                  error: 'Upload failed',
                }
              }
              return img
            })
          })
        })
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!disabled && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleRemoveImage = (index: number) => {
    const imgToRemove = images[index]
    // Revoke object URL if it's a preview
    if (objectUrlsRef.current.has(imgToRemove.url)) {
      URL.revokeObjectURL(imgToRemove.url)
      objectUrlsRef.current.delete(imgToRemove.url)
    }
    const newImages = images.filter((_, idx) => idx !== index)
    onImagesChange(newImages)
    // Clear errors when removing image
    setErrors((prev) => prev.filter((err) => !err.includes(images[index].filename)))
  }

  const moveImageLeft = (index: number) => {
    if (index <= 0) return
    const newImages = [...images]
    ;[newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]]
    onImagesChange(newImages)
  }

  const moveImageRight = (index: number) => {
    if (index >= images.length - 1) return
    const newImages = [...images]
    ;[newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]]
    onImagesChange(newImages)
  }

  const isUploading = images.some((img) => img.isUploading)

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <AdminLabel required>Vehicle Images</AdminLabel>

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          borderRadius: '0.625rem',
          border: `2px dashed ${isDragging ? '#f59e0b' : '#E0E0DC'}`,
          padding: '2rem 1rem',
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: isDragging ? 'rgba(245, 158, 11, 0.05)' : '#FAFAF8',
          transition: 'all 0.2s',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Upload size={32} style={{ margin: '0 auto 0.75rem', color: '#767676' }} />
        <div style={{ fontFamily: 'Poppins', fontSize: '0.95rem', fontWeight: 500, color: '#0D1B2A', marginBottom: '0.25rem' }}>
          Drag images here or click to browse
        </div>
        <div style={{ fontFamily: 'Outfit', fontSize: '0.8rem', color: '#767676' }}>
          Upload one or multiple vehicle photos (JPEG, PNG, WebP)
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '0.625rem',
            fontFamily: 'Outfit',
            fontSize: '0.8rem',
            color: '#DC2626',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              {errors.map((err, idx) => (
                <div key={idx}>{err}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Previews */}
      {images.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            {images.map((img, idx) => (
              <div key={idx}>
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    border: img.error ? '2px solid #DC2626' : '1px solid #E0E0DC',
                    backgroundColor: '#F5F5F0',
                  }}
                >
                  <img
                    src={img.url}
                    alt={`Preview ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: img.isUploading ? 0.6 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  />

                  {/* Primary badge */}
                  {idx === 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '0.5rem',
                        left: '0.5rem',
                        backgroundColor: 'rgba(21, 128, 61, 0.9)',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontFamily: 'Poppins',
                      }}
                    >
                      PRIMARY
                    </div>
                  )}

                  {/* Uploading overlay */}
                  {img.isUploading && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          border: '3px solid rgba(255, 255, 255, 0.3)',
                          borderTop: '3px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                    </div>
                  )}

                  {/* Error overlay */}
                  {img.error && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      }}
                    >
                      <div style={{ color: 'white', fontSize: '0.75rem', textAlign: 'center' }}>
                        Upload Failed
                      </div>
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    disabled={img.isUploading}
                    aria-label={`Remove image ${idx + 1}`}
                    style={{
                      position: 'absolute',
                      top: '0.25rem',
                      right: '0.25rem',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      border: 'none',
                      color: 'white',
                      cursor: img.isUploading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: img.isUploading ? 0.5 : 1,
                      transition: 'background-color 0.2s',
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      if (!img.isUploading) {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'
                    }}
                  >
                    <X size={16} />
                  </button>

                  {/* Filename tooltip */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.65rem',
                      fontFamily: 'Outfit',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {img.filename}
                  </div>
                </div>

                {/* Reorder controls below each card */}
                {images.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.5rem',
                      marginTop: '0.5rem',
                      justifyContent: 'center',
                    }}
                  >
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => moveImageLeft(idx)}
                        disabled={disabled || img.isUploading}
                        aria-label="Move image left"
                        title="Move image left"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '0.375rem',
                          border: '1px solid #E0E0DC',
                          backgroundColor: '#FFFFFF',
                          cursor: disabled || img.isUploading ? 'not-allowed' : 'pointer',
                          opacity: disabled || img.isUploading ? 0.5 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          color: '#1A1A1A',
                          padding: 0,
                        }}
                        onMouseEnter={(e) => {
                          if (!disabled && !img.isUploading) {
                            e.currentTarget.style.backgroundColor = '#F5F5F0'
                            e.currentTarget.style.borderColor = '#1A1A1A'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF'
                          e.currentTarget.style.borderColor = '#E0E0DC'
                        }}
                      >
                        <ArrowLeft size={18} />
                      </button>
                    )}
                    {idx < images.length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveImageRight(idx)}
                        disabled={disabled || img.isUploading}
                        aria-label="Move image right"
                        title="Move image right"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '0.375rem',
                          border: '1px solid #E0E0DC',
                          backgroundColor: '#FFFFFF',
                          cursor: disabled || img.isUploading ? 'not-allowed' : 'pointer',
                          opacity: disabled || img.isUploading ? 0.5 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          color: '#1A1A1A',
                          padding: 0,
                        }}
                        onMouseEnter={(e) => {
                          if (!disabled && !img.isUploading) {
                            e.currentTarget.style.backgroundColor = '#F5F5F0'
                            e.currentTarget.style.borderColor = '#1A1A1A'
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF'
                          e.currentTarget.style.borderColor = '#E0E0DC'
                        }}
                      >
                        <ArrowRight size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FORMATS.join(',')}
        onChange={handleInputChange}
        disabled={disabled || isUploading}
        style={{ display: 'none' }}
      />
    </div>
  )
}
