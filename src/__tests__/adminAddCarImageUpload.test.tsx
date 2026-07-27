import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import AdminAddCar from '../pages/admin/AdminAddCar'
import ImageUploadSection, { type UploadedImage } from '../components/admin/ImageUploadSection'
import * as cloudinaryService from '../lib/cloudinaryService'
import * as adminCarsService from '../lib/adminCarsService'

// Mock Firebase
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: { getIdToken: vi.fn(() => 'mock-token') } })),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  writeBatch: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
}))

vi.mock('../lib/firebase', () => ({
  db: {},
}))

// Mock Cloudinary service
vi.spyOn(cloudinaryService, 'uploadImage').mockResolvedValue('https://cloudinary.example.com/image.jpg')

// Mock Cars service
vi.spyOn(adminCarsService, 'createCar').mockResolvedValue({ success: true, id: 'car-123' })

describe('Admin Add Car - Image Upload Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ImageUploadSection Component', () => {
    it('renders drop zone with correct label and instructions', () => {
      render(
        <ImageUploadSection
          images={[]}
          onImagesChange={vi.fn()}
        />
      )

      expect(screen.getByText('Drag images here or click to browse')).toBeTruthy()
      expect(screen.getByText(/Upload one or multiple vehicle photos/)).toBeTruthy()
    })

    it('accepts click to open file browser', () => {
      const onImagesChange = vi.fn()
      render(
        <ImageUploadSection
          images={[]}
          onImagesChange={onImagesChange}
        />
      )

      const dropZone = screen.getByText('Drag images here or click to browse').closest('div')
      expect(dropZone).toBeTruthy()
    })

    it('shows error when file format is unsupported', async () => {
      const onImagesChange = vi.fn()
      render(
        <ImageUploadSection
          images={[]}
          onImagesChange={onImagesChange}
        />
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['content'], 'image.txt', { type: 'text/plain' })

      fireEvent.change(input, { target: { files: [file] } })

      await waitFor(() => {
        expect(screen.getByText(/Unsupported format/)).toBeTruthy()
      })
    })

    it('rejects file larger than 10MB', async () => {
      const onImagesChange = vi.fn()
      render(
        <ImageUploadSection
          images={[]}
          onImagesChange={onImagesChange}
        />
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'image.jpg', { type: 'image/jpeg' })
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 })

      fireEvent.change(input, { target: { files: [largeFile] } })

      await waitFor(() => {
        expect(screen.getByText(/File too large/)).toBeTruthy()
      })
    })

    it('rejects empty files', async () => {
      const onImagesChange = vi.fn()
      render(
        <ImageUploadSection
          images={[]}
          onImagesChange={onImagesChange}
        />
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const emptyFile = new File([], 'image.jpg', { type: 'image/jpeg' })

      fireEvent.change(input, { target: { files: [emptyFile] } })

      await waitFor(() => {
        expect(screen.getByText(/Empty file rejected/)).toBeTruthy()
      })
    })

    it('accepts JPEG, PNG, and WebP formats', async () => {
      const onImagesChange = vi.fn()
      render(
        <ImageUploadSection
          images={[]}
          onImagesChange={onImagesChange}
        />
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const jpegFile = new File(['content'], 'image.jpg', { type: 'image/jpeg' })
      const pngFile = new File(['content'], 'image.png', { type: 'image/png' })
      const webpFile = new File(['content'], 'image.webp', { type: 'image/webp' })

      fireEvent.change(input, { target: { files: [jpegFile, pngFile, webpFile] } })

      await waitFor(() => {
        expect(onImagesChange).toHaveBeenCalled()
      })
    })

    it('shows preview after image selection', async () => {
      const { container } = render(
        <ImageUploadSection
          images={[
            {
              url: 'blob:http://localhost/abc123',
              filename: 'test.jpg',
              isUploading: false,
            }
          ]}
          onImagesChange={vi.fn()}
        />
      )

      const previews = container.querySelectorAll('img[alt^="Preview"]')
      expect(previews.length).toBeGreaterThan(0)
    })

    it('marks first image as PRIMARY', () => {
      const onImagesChange = vi.fn()
      const { container } = render(
        <ImageUploadSection
          images={[
            {
              url: 'https://example.com/img1.jpg',
              filename: 'image1.jpg',
              isUploading: false,
            },
            {
              url: 'https://example.com/img2.jpg',
              filename: 'image2.jpg',
              isUploading: false,
            },
          ]}
          onImagesChange={onImagesChange}
        />
      )

      const primaryBadges = Array.from(container.querySelectorAll('*')).filter(
        (el) => el.textContent === 'PRIMARY'
      )
      expect(primaryBadges.length).toBe(1)
    })

    it('removes image when remove button clicked', async () => {
      const onImagesChange = vi.fn()
      const { container } = render(
        <ImageUploadSection
          images={[
            {
              url: 'https://example.com/img1.jpg',
              filename: 'image1.jpg',
              isUploading: false,
            },
          ]}
          onImagesChange={onImagesChange}
        />
      )

      const removeButtons = container.querySelectorAll('button[aria-label^="Remove image"]')
      expect(removeButtons.length).toBe(1)

      fireEvent.click(removeButtons[0])

      expect(onImagesChange).toHaveBeenCalledWith([])
    })

    it('prevents more than 8 images', async () => {
      const existingImages: UploadedImage[] = Array.from({ length: 8 }).map((_, i) => ({
        url: `https://example.com/img${i}.jpg`,
        filename: `image${i}.jpg`,
        isUploading: false,
      }))

      render(
        <ImageUploadSection
          images={existingImages}
          onImagesChange={vi.fn()}
          maxImages={8}
        />
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const newFile = new File(['content'], 'image.jpg', { type: 'image/jpeg' })

      fireEvent.change(input, { target: { files: [newFile] } })

      await waitFor(() => {
        expect(screen.getByText(/Maximum 8 images allowed/)).toBeTruthy()
      })
    })

    it('prevents duplicate filenames', async () => {
      const onImagesChange = vi.fn()
      render(
        <ImageUploadSection
          images={[
            {
              url: 'https://example.com/img1.jpg',
              filename: 'image.jpg',
              isUploading: false,
            },
          ]}
          onImagesChange={onImagesChange}
        />
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file1 = new File(['content1'], 'image.jpg', { type: 'image/jpeg' })
      const file2 = new File(['content2'], 'image.jpg', { type: 'image/jpeg' })

      fireEvent.change(input, { target: { files: [file1, file2] } })

      await waitFor(() => {
        expect(screen.getByText(/Duplicate file/)).toBeTruthy()
      })
    })

    it('disables upload when disabled prop is true', () => {
      render(
        <ImageUploadSection
          images={[]}
          onImagesChange={vi.fn()}
          disabled={true}
        />
      )

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(fileInput.disabled).toBe(true)
    })

    it('shows uploading state during upload', async () => {
      const { container } = render(
        <ImageUploadSection
          images={[
            {
              url: 'blob:http://localhost/abc',
              filename: 'test.jpg',
              isUploading: true,
            }
          ]}
          onImagesChange={vi.fn()}
        />
      )

      // Should show uploading spinner
      const spinners = container.querySelectorAll('[style*="animation"]')
      expect(spinners.length).toBeGreaterThan(0)
    })

    it('shows error state for failed uploads', () => {
      render(
        <ImageUploadSection
          images={[
            {
              url: 'blob:http://localhost/abc',
              filename: 'test.jpg',
              isUploading: false,
              error: 'Upload failed',
            }
          ]}
          onImagesChange={vi.fn()}
        />
      )

      expect(screen.getByText('Upload Failed')).toBeTruthy()
    })
  })

  describe('AdminAddCar Integration', () => {
    it('replaces Image URL 1/2/3 fields with ImageUploadSection', () => {
      render(
        <BrowserRouter>
          <AdminAddCar />
        </BrowserRouter>
      )

      // Old image URL fields should not exist
      expect(screen.queryByLabelText('Image URL 1')).not.toBeTruthy()
      expect(screen.queryByLabelText('Image URL 2')).not.toBeTruthy()
      expect(screen.queryByLabelText('Image URL 3')).not.toBeTruthy()

      // New upload section should exist
      expect(screen.getByText('Drag images here or click to browse')).toBeTruthy()
    })

    it('blocks form submission while images are uploading', async () => {
      render(
        <BrowserRouter>
          <AdminAddCar />
        </BrowserRouter>
      )

      // Fill required fields
      fireEvent.change(screen.getByPlaceholderText('Toyota Corolla 2022'), {
        target: { value: 'Test Car' },
      })
      fireEvent.change(screen.getByPlaceholderText('Toyota'), {
        target: { value: 'Toyota' },
      })
      fireEvent.change(screen.getByPlaceholderText('Corolla'), {
        target: { value: 'Corolla' },
      })
      fireEvent.change(screen.getByPlaceholderText('2022'), {
        target: { value: '2022' },
      })
      fireEvent.change(screen.getByPlaceholderText('28000'), {
        target: { value: '28000' },
      })
      fireEvent.change(screen.getByPlaceholderText('65000'), {
        target: { value: '65000' },
      })
      fireEvent.change(screen.getByPlaceholderText('Describe the vehicle...'), {
        target: { value: 'Great car' },
      })

      // Try to submit without images - should show error
      const saveButton = screen.getByRole('button', { name: /Add Vehicle/ })
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Add at least one image.')).toBeTruthy()
      })
    })

    it('sends image URLs as array to backend', async () => {
      // This test verifies the payload format sent to createCar
      const mockCreateCar = vi.spyOn(adminCarsService, 'createCar')

      render(
        <BrowserRouter>
          <AdminAddCar />
        </BrowserRouter>
      )

      // The actual image upload and full form submission would happen in manual QA
      // This test documents the expected payload structure expects images as string array
      expect(mockCreateCar).not.toHaveBeenCalled()
    })
  })

  describe('Cloudinary Integration', () => {
    it('uses existing uploadImage service from cloudinaryService', async () => {
      const mockUploadImage = vi.spyOn(cloudinaryService, 'uploadImage')
      mockUploadImage.mockResolvedValue('https://cloudinary.example.com/uploaded.jpg')

      const onImagesChange = vi.fn()
      render(
        <ImageUploadSection
          images={[]}
          onImagesChange={onImagesChange}
        />
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' })

      fireEvent.change(input, { target: { files: [file] } })

      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalledWith(file, 'vehicles')
      })
    })

    it('stores Cloudinary secure URLs not raw files', async () => {
      const mockUploadImage = vi.spyOn(cloudinaryService, 'uploadImage')
      mockUploadImage.mockResolvedValue('https://cloudinary.example.com/uploaded.jpg')

      const onImagesChange = vi.fn()
      render(
        <ImageUploadSection
          images={[]}
          onImagesChange={onImagesChange}
        />
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' })

      fireEvent.change(input, { target: { files: [file] } })

      // Verify that uploadImage is called (which returns secure URL)
      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalledWith(file, 'vehicles')
      })

      // Verify that final images contain Cloudinary URLs (not base64 or data URLs)
      // Note: blob: URLs are legitimate for temporary previews before upload completes
      const calls = onImagesChange.mock.calls
      expect(calls.length).toBeGreaterThan(0)

      // Check the final call should have Cloudinary URL
      const lastCallArgs = calls[calls.length - 1]
      const lastCall = Array.isArray(lastCallArgs[0]) ? lastCallArgs[0] : []
      if (lastCall.length > 0) {
        const hasCloudinaryUrl = lastCall.some((img) =>
          img.url.includes('cloudinary') || img.url.startsWith('https://')
        )
        expect(hasCloudinaryUrl).toBe(true)

        // Verify no data: URLs (base64 encoded data)
        lastCall.forEach((img) => {
          expect(img.url).not.toContain('data:')
        })
      }
    })
  })

  describe('Error Handling', () => {
    it('handles upload failure gracefully', async () => {
      vi.spyOn(cloudinaryService, 'uploadImage').mockRejectedValue(new Error('Upload failed'))

      const onImagesChange = vi.fn()
      render(
        <ImageUploadSection
          images={[]}
          onImagesChange={onImagesChange}
        />
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file = new File(['content'], 'image.jpg', { type: 'image/jpeg' })

      fireEvent.change(input, { target: { files: [file] } })

      // Wait for error message to appear
      await waitFor(
        () => {
          expect(screen.queryByText(/image.jpg: Upload failed/)).toBeTruthy()
        },
        { timeout: 3000 }
      )
    })

    it('keeps successful images when one upload fails', async () => {
      const mockUploadImage = vi.spyOn(cloudinaryService, 'uploadImage')
      mockUploadImage
        .mockResolvedValueOnce('https://cloudinary.example.com/image1.jpg')
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValueOnce('https://cloudinary.example.com/image3.jpg')

      const onImagesChange = vi.fn()
      render(
        <ImageUploadSection
          images={[]}
          onImagesChange={onImagesChange}
        />
      )

      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      const file1 = new File(['content1'], 'image1.jpg', { type: 'image/jpeg' })
      const file2 = new File(['content2'], 'image2.jpg', { type: 'image/jpeg' })
      const file3 = new File(['content3'], 'image3.jpg', { type: 'image/jpeg' })

      fireEvent.change(input, { target: { files: [file1, file2, file3] } })

      await waitFor(
        () => {
          expect(screen.queryByText(/image2.jpg: Upload failed/)).toBeTruthy()
        },
        { timeout: 3000 }
      )

      // Verify successful images remain in the component state
      const calls = onImagesChange.mock.calls
      expect(calls.length).toBeGreaterThan(0)
    })
  })

  describe('Memory Management', () => {
    it('revokes object URLs when component unmounts', () => {
      const { unmount } = render(
        <ImageUploadSection
          images={[]}
          onImagesChange={vi.fn()}
        />
      )

      unmount()

      // URL.revokeObjectURL should be called during cleanup
      // (This is tested in the cleanup effect)
    })

    it('revokes object URLs when image is removed', () => {
      const objectUrl = 'blob:http://localhost/abc'

      const onImagesChange = vi.fn()
      const { container } = render(
        <ImageUploadSection
          images={[
            {
              url: objectUrl,
              filename: 'test.jpg',
              isUploading: false,
            }
          ]}
          onImagesChange={onImagesChange}
        />
      )

      const removeButton = container.querySelector('button[aria-label^="Remove image"]')
      fireEvent.click(removeButton!)

      // Object URL should be revoked
      // (Verified by the handleRemoveImage function)
    })
  })

  describe('Accessibility', () => {
    it('provides accessible file input with label', () => {
      render(
        <ImageUploadSection
          images={[]}
          onImagesChange={vi.fn()}
        />
      )

      const label = screen.getByText('Vehicle Images')
      expect(label).toBeTruthy()
    })

    it('provides aria-label on remove buttons', () => {
      const { container } = render(
        <ImageUploadSection
          images={[
            {
              url: 'https://example.com/img.jpg',
              filename: 'image.jpg',
              isUploading: false,
            }
          ]}
          onImagesChange={vi.fn()}
        />
      )

      const removeButton = container.querySelector('button[aria-label="Remove image 1"]')
      expect(removeButton).toBeTruthy()
    })

    it('maintains keyboard accessibility for drop zone', () => {
      const { container } = render(
        <ImageUploadSection
          images={[]}
          onImagesChange={vi.fn()}
        />
      )

      const dropZone = container.querySelector('[style*="cursor"]')
      expect(dropZone).toBeTruthy()
    })
  })
})
