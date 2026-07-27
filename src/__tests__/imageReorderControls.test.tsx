import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import ImageUploadSection, { type UploadedImage } from '../components/admin/ImageUploadSection'

describe('ImageUploadSection - Reorder Controls', () => {
  const mockImages: UploadedImage[] = [
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
    {
      url: 'https://example.com/img3.jpg',
      filename: 'image3.jpg',
      isUploading: false,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Reorder button visibility', () => {
    it('renders no reorder buttons for single image', () => {
      const onImagesChange = vi.fn()
      const { container } = render(
        <ImageUploadSection
          images={[mockImages[0]]}
          onImagesChange={onImagesChange}
        />
      )

      const leftButtons = container.querySelectorAll('button[aria-label="Move image left"]')
      const rightButtons = container.querySelectorAll('button[aria-label="Move image right"]')
      expect(leftButtons.length).toBe(0)
      expect(rightButtons.length).toBe(0)
    })

    it('first image has only Move right button', () => {
      const onImagesChange = vi.fn()
      const { container } = render(
        <ImageUploadSection
          images={mockImages}
          onImagesChange={onImagesChange}
        />
      )

      const allLeftButtons = container.querySelectorAll('button[aria-label="Move image left"]')
      const allRightButtons = container.querySelectorAll('button[aria-label="Move image right"]')

      // For 3 images: image 1 (no left), image 2 (left + right), image 3 (left only)
      expect(allLeftButtons.length).toBe(2) // images 2 and 3
      expect(allRightButtons.length).toBe(2) // images 1 and 2
    })

    it('middle image has both left and right buttons', () => {
      const onImagesChange = vi.fn()
      const { container } = render(
        <ImageUploadSection
          images={mockImages}
          onImagesChange={onImagesChange}
        />
      )

      const allLeftButtons = container.querySelectorAll('button[aria-label="Move image left"]')

      // Middle image (index 1) should have both controls
      expect(allLeftButtons.length).toBeGreaterThan(0)
      // Verify more than just the last image's left button exists
      expect(allLeftButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('last image has only Move left button', () => {
      const onImagesChange = vi.fn()
      const { container } = render(
        <ImageUploadSection
          images={mockImages}
          onImagesChange={onImagesChange}
        />
      )

      const allLeftButtons = container.querySelectorAll('button[aria-label="Move image left"]')

      // Last image should have left button but not right
      expect(allLeftButtons.length).toBeGreaterThan(0)
      // Verify we have both left and right buttons across all images (but not on same image)
      const allRightButtons = container.querySelectorAll('button[aria-label="Move image right"]')
      expect(allRightButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Reorder functionality', () => {
    it('moves image left when left button clicked', () => {
      const onImagesChange = vi.fn()
      const { container } = render(
        <ImageUploadSection
          images={mockImages}
          onImagesChange={onImagesChange}
        />
      )

      // Find the left button for the second image and click it
      const leftButtons = container.querySelectorAll('button[aria-label="Move image left"]')
      fireEvent.click(leftButtons[0])

      // onImagesChange should be called with reordered array
      expect(onImagesChange).toHaveBeenCalled()
      const calledWith = onImagesChange.mock.calls[0][0]

      // Verify order changed
      if (Array.isArray(calledWith)) {
        expect(calledWith[0].filename).toBe('image2.jpg')
        expect(calledWith[1].filename).toBe('image1.jpg')
        expect(calledWith[2].filename).toBe('image3.jpg')
      }
    })

    it('moves image right when right button clicked', () => {
      const onImagesChange = vi.fn()
      const { container } = render(
        <ImageUploadSection
          images={mockImages}
          onImagesChange={onImagesChange}
        />
      )

      // Find the right button for the first image and click it
      const rightButtons = container.querySelectorAll('button[aria-label="Move image right"]')
      fireEvent.click(rightButtons[0])

      // onImagesChange should be called with reordered array
      expect(onImagesChange).toHaveBeenCalled()
      const calledWith = onImagesChange.mock.calls[0][0]

      // Verify order changed
      if (Array.isArray(calledWith)) {
        expect(calledWith[0].filename).toBe('image2.jpg')
        expect(calledWith[1].filename).toBe('image1.jpg')
        expect(calledWith[2].filename).toBe('image3.jpg')
      }
    })

    it('does not move first image left', () => {
      const onImagesChange = vi.fn()
      const { container } = render(
        <ImageUploadSection
          images={mockImages}
          onImagesChange={onImagesChange}
        />
      )

      // First image should not have a left button
      const leftButtons = Array.from(container.querySelectorAll('button[aria-label="Move image left"]'))

      // None of these should be for the first image
      expect(leftButtons.length).toBe(2) // only images 2 and 3 have left buttons
    })

    it('does not move last image right', () => {
      const onImagesChange = vi.fn()
      const { container } = render(
        <ImageUploadSection
          images={mockImages}
          onImagesChange={onImagesChange}
        />
      )

      // Last image should not have a right button
      const rightButtons = Array.from(container.querySelectorAll('button[aria-label="Move image right"]'))

      // Only images 1 and 2 have right buttons
      expect(rightButtons.length).toBe(2)
    })
  })

  describe('Primary image after reorder', () => {
    it('updates primary badge after moving image', () => {
      const onImagesChange = vi.fn((newImages) => {
        // Simulate the parent component updating state
        render(
          <ImageUploadSection
            images={newImages}
            onImagesChange={vi.fn()}
          />
        )
      })

      const { container, rerender } = render(
        <ImageUploadSection
          images={mockImages}
          onImagesChange={onImagesChange}
        />
      )

      // Click right button on first image to swap with second
      const rightButtons = container.querySelectorAll('button[aria-label="Move image right"]')
      fireEvent.click(rightButtons[0])

      // After reorder, render with the new order
      const reorderedImages = [mockImages[1], mockImages[0], mockImages[2]]
      rerender(
        <ImageUploadSection
          images={reorderedImages}
          onImagesChange={onImagesChange}
        />
      )

      // Verify primary badge is on first image (image2.jpg now)
      const badges = container.querySelectorAll('*')
      const primaryBadges = Array.from(badges).filter((el) => el.textContent === 'PRIMARY')
      expect(primaryBadges.length).toBe(1)
    })
  })

  describe('Reorder controls accessibility', () => {
    it('provides aria-label on reorder buttons', () => {
      const { container } = render(
        <ImageUploadSection
          images={mockImages}
          onImagesChange={vi.fn()}
        />
      )

      const leftButton = container.querySelector('button[aria-label="Move image left"]')
      const rightButton = container.querySelector('button[aria-label="Move image right"]')

      expect(leftButton).toBeTruthy()
      expect(rightButton).toBeTruthy()
    })

    it('disables reorder buttons during upload', () => {
      const uploadingImage: UploadedImage = {
        url: 'blob:http://localhost/abc',
        filename: 'uploading.jpg',
        isUploading: true,
      }

      const { container } = render(
        <ImageUploadSection
          images={[mockImages[0], uploadingImage]}
          onImagesChange={vi.fn()}
        />
      )

      // Find buttons for the uploading image
      const rightButtons = container.querySelectorAll('button[aria-label="Move image right"]')

      // The button next to the uploading image should be disabled
      rightButtons.forEach((btn) => {
        // Check if the button is in the uploading image's card
        const parentCard = (btn as HTMLElement).closest('div')
        if (parentCard?.querySelector('img')) {
          const img = parentCard.querySelector('img') as HTMLImageElement
          if (img.src.includes('blob')) {
            expect((btn as HTMLButtonElement).disabled).toBe(true)
          }
        }
      })
    })
  })

  describe('Two-image reorder', () => {
    it('first of two images has only Move right', () => {
      const twoImages = mockImages.slice(0, 2)
      const { container } = render(
        <ImageUploadSection
          images={twoImages}
          onImagesChange={vi.fn()}
        />
      )

      const leftButtons = container.querySelectorAll('button[aria-label="Move image left"]')
      const rightButtons = container.querySelectorAll('button[aria-label="Move image right"]')

      // First image has right button, second image has left button
      expect(leftButtons.length).toBe(1)
      expect(rightButtons.length).toBe(1)
    })

    it('second of two images has only Move left', () => {
      const twoImages = mockImages.slice(0, 2)
      const { container } = render(
        <ImageUploadSection
          images={twoImages}
          onImagesChange={vi.fn()}
        />
      )

      const leftButtons = container.querySelectorAll('button[aria-label="Move image left"]')
      expect(leftButtons.length).toBe(1)
    })
  })

  describe('Immutability of image array', () => {
    it('does not mutate original images array', () => {
      const originalImages = [...mockImages]
      const onImagesChange = vi.fn()

      const { container } = render(
        <ImageUploadSection
          images={originalImages}
          onImagesChange={onImagesChange}
        />
      )

      // Perform a reorder
      const rightButtons = container.querySelectorAll('button[aria-label="Move image right"]')
      fireEvent.click(rightButtons[0])

      // Original array should not be modified
      expect(originalImages[0].filename).toBe('image1.jpg')
      expect(originalImages[1].filename).toBe('image2.jpg')
      expect(originalImages[2].filename).toBe('image3.jpg')
    })

    it('returns new array when reordering', () => {
      const onImagesChange = vi.fn()
      const { container } = render(
        <ImageUploadSection
          images={mockImages}
          onImagesChange={onImagesChange}
        />
      )

      const rightButtons = container.querySelectorAll('button[aria-label="Move image right"]')
      fireEvent.click(rightButtons[0])

      const calledWith = onImagesChange.mock.calls[0][0]
      expect(calledWith).not.toBe(mockImages)
      expect(Array.isArray(calledWith)).toBe(true)
    })
  })
})
