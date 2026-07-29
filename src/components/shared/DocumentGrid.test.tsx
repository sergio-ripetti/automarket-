import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { DocumentGrid } from './DocumentGrid'

const originalFetch = globalThis.fetch

beforeEach(() => {
  // Default: every non-image file is reachable, so tests aren't affected by the availability
  // check unless they explicitly override it.
  globalThis.fetch = vi.fn(async () => new Response(null, { status: 200 })) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('DocumentGrid', () => {
  it('renders the title with a count when documents are present', () => {
    render(
      <DocumentGrid
        title="Supporting Documents"
        emptyMessage="No supporting documents provided"
        documents={[{ url: 'https://example.com/a.jpg', filename: 'a.jpg' }]}
      />
    )
    expect(screen.getByText('Supporting Documents (1)')).toBeInTheDocument()
  })

  it('shows the empty state message and no grid when there are no documents', () => {
    render(
      <DocumentGrid title="Supporting Documents" emptyMessage="No supporting documents provided" documents={[]} />
    )
    expect(screen.getByText('No supporting documents provided')).toBeInTheDocument()
    expect(screen.queryByText('View')).not.toBeInTheDocument()
  })

  it('renders an image document as a thumbnail (mimeType detected)', () => {
    render(
      <DocumentGrid
        title="Documents"
        emptyMessage="None"
        documents={[{ url: 'https://example.com/photo', filename: 'photo', mimeType: 'image/jpeg' }]}
      />
    )
    const img = screen.getByAltText('photo')
    expect(img.tagName).toBe('IMG')
    expect(img).toHaveAttribute('src', 'https://example.com/photo')
  })

  it('renders an image document as a thumbnail (filename extension detected, no mimeType)', () => {
    render(
      <DocumentGrid
        title="Documents"
        emptyMessage="None"
        documents={[{ url: 'https://example.com/raw-id-123', filename: 'license.png' }]}
      />
    )
    expect(screen.getByAltText('license.png').tagName).toBe('IMG')
  })

  it('renders a PDF document with a document icon, not a thumbnail', async () => {
    render(
      <DocumentGrid
        title="Documents"
        emptyMessage="None"
        documents={[{ url: 'https://example.com/contract.pdf', filename: 'contract.pdf' }]}
      />
    )
    await waitFor(() => screen.getByText('View'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByLabelText('contract.pdf (PDF document)')).toBeInTheDocument()
  })

  it('renders a generic document icon for an unrecognized file type', async () => {
    render(
      <DocumentGrid
        title="Documents"
        emptyMessage="None"
        documents={[{ url: 'https://example.com/data', filename: 'data.xyz' }]}
      />
    )
    await waitFor(() => screen.getByText('View'))
    expect(screen.getByLabelText('data.xyz (document)')).toBeInTheDocument()
  })

  it('does not classify a document as an image merely because the URL contains the word "image"', async () => {
    render(
      <DocumentGrid
        title="Documents"
        emptyMessage="None"
        documents={[{ url: 'https://example.com/image-uploads/contract.pdf', filename: 'contract.pdf' }]}
      />
    )
    await waitFor(() => screen.getByText('View'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renders the filename for each document', () => {
    render(
      <DocumentGrid
        title="Documents"
        emptyMessage="None"
        documents={[{ url: 'https://example.com/a.jpg', filename: 'my-photo.jpg' }]}
      />
    )
    expect(screen.getByText('my-photo.jpg')).toBeInTheDocument()
  })

  it('View link uses the stored URL with a safe target/rel and a descriptive aria-label', async () => {
    render(
      <DocumentGrid
        title="Documents"
        emptyMessage="None"
        documents={[{ url: 'https://res.cloudinary.com/demo/doc.pdf', filename: 'doc.pdf' }]}
      />
    )
    await waitFor(() => screen.getByText('View'))
    const link = screen.getByLabelText('View doc.pdf')
    expect(link).toHaveAttribute('href', 'https://res.cloudinary.com/demo/doc.pdf')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('Download link uses the stored URL, the download attribute, and a descriptive aria-label', async () => {
    render(
      <DocumentGrid
        title="Documents"
        emptyMessage="None"
        documents={[{ url: 'https://res.cloudinary.com/demo/doc.pdf', filename: 'doc.pdf' }]}
      />
    )
    await waitFor(() => screen.getByText('View'))
    const link = screen.getByLabelText('Download doc.pdf')
    expect(link).toHaveAttribute('href', 'https://res.cloudinary.com/demo/doc.pdf')
    expect(link).toHaveAttribute('download', 'doc.pdf')
  })

  it('renders multiple documents in a compact grid', () => {
    const { container } = render(
      <DocumentGrid
        title="Documents"
        emptyMessage="None"
        documents={[
          { url: 'https://example.com/a.jpg', filename: 'a.jpg', mimeType: 'image/jpeg' },
          { url: 'https://example.com/b.pdf', filename: 'b.pdf' },
          { url: 'https://example.com/c.png', filename: 'c.png', mimeType: 'image/png' },
        ]}
      />
    )
    const grid = container.querySelector('div[style*="grid-template-columns"]')
    expect(grid).toBeInTheDocument()
    expect(grid?.children.length).toBe(3)
  })

  it('a long filename is truncated (ellipsis) rather than breaking the card layout', () => {
    const longName = 'this-is-a-very-long-supporting-document-filename-that-should-not-overflow-the-card.pdf'
    render(
      <DocumentGrid
        title="Documents"
        emptyMessage="None"
        documents={[{ url: 'https://example.com/long.pdf', filename: longName }]}
      />
    )
    const filenameEl = screen.getByTitle(longName)
    expect(filenameEl).toHaveStyle({ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' })
  })

  it('shows a safe fallback (not a crash) for an unreachable non-image document, preserving the filename', async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 401 })) as typeof fetch
    render(
      <DocumentGrid
        title="Documents"
        emptyMessage="None"
        documents={[{ url: 'https://example.com/broken.pdf', filename: 'broken.pdf' }]}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('File unavailable')).toBeInTheDocument()
    })
    expect(screen.getByText('broken.pdf')).toBeInTheDocument()
    expect(screen.queryByText('View')).not.toBeInTheDocument()
    expect(screen.queryByText('Download')).not.toBeInTheDocument()
  })

  it('does not repeatedly re-check the same URL (single availability check per unique URL)', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }))
    globalThis.fetch = fetchMock as typeof fetch
    const { rerender } = render(
      <DocumentGrid
        title="Documents"
        emptyMessage="None"
        documents={[{ url: 'https://example.com/doc.pdf', filename: 'doc.pdf' }]}
      />
    )
    await waitFor(() => screen.getByText('View'))
    rerender(
      <DocumentGrid
        title="Documents"
        emptyMessage="None"
        documents={[{ url: 'https://example.com/doc.pdf', filename: 'doc.pdf' }]}
      />
    )
    await waitFor(() => screen.getByText('View'))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  describe('onDownload (protected download path)', () => {
    it('falls back to a plain anchor download when onDownload is not provided (Financing behavior unchanged)', () => {
      render(
        <DocumentGrid
          title="Documents"
          emptyMessage="None"
          documents={[{ url: 'https://example.com/a.jpg', filename: 'a.jpg', mimeType: 'image/jpeg' }]}
        />
      )
      const downloadLink = screen.getByText('Download')
      expect(downloadLink.tagName).toBe('A')
      expect(downloadLink).toHaveAttribute('href', 'https://example.com/a.jpg')
      expect(downloadLink).toHaveAttribute('download', 'a.jpg')
    })

    it('routes Download through onDownload as a button, not a direct link, when provided', () => {
      const onDownload = vi.fn().mockResolvedValue(undefined)
      render(
        <DocumentGrid
          title="Documents"
          emptyMessage="None"
          documents={[{ url: 'https://example.com/a.jpg', filename: 'a.jpg', mimeType: 'image/jpeg' }]}
          onDownload={onDownload}
        />
      )
      const downloadButton = screen.getByText('Download')
      expect(downloadButton.tagName).toBe('BUTTON')
      fireEvent.click(downloadButton)
      expect(onDownload).toHaveBeenCalledTimes(1)
    })

    it('shows a loading state and disables the button while a download is in flight', async () => {
      let resolveDownload: () => void = () => {}
      const onDownload = vi.fn(() => new Promise<void>((resolve) => { resolveDownload = resolve }))
      render(
        <DocumentGrid
          title="Documents"
          emptyMessage="None"
          documents={[{ url: 'https://example.com/a.jpg', filename: 'a.jpg', mimeType: 'image/jpeg' }]}
          onDownload={onDownload}
        />
      )
      fireEvent.click(screen.getByText('Download'))
      expect(await screen.findByText('Downloading…')).toBeInTheDocument()
      expect(screen.getByText('Downloading…')).toBeDisabled()
      resolveDownload()
      await waitFor(() => expect(screen.getByText('Download')).toBeInTheDocument())
    })

    it('prevents duplicate clicks from firing overlapping downloads', async () => {
      let resolveDownload: () => void = () => {}
      const onDownload = vi.fn(() => new Promise<void>((resolve) => { resolveDownload = resolve }))
      render(
        <DocumentGrid
          title="Documents"
          emptyMessage="None"
          documents={[{ url: 'https://example.com/a.jpg', filename: 'a.jpg', mimeType: 'image/jpeg' }]}
          onDownload={onDownload}
        />
      )
      const button = await screen.findByText('Download')
      fireEvent.click(button)
      fireEvent.click(await screen.findByText('Downloading…'))
      fireEvent.click(await screen.findByText('Downloading…'))
      expect(onDownload).toHaveBeenCalledTimes(1)
      resolveDownload()
    })

    it('shows a controlled inline error when the download fails, without crashing the page', async () => {
      const onDownload = vi.fn().mockRejectedValue(new Error('Attachment not found on this sale'))
      render(
        <DocumentGrid
          title="Documents"
          emptyMessage="None"
          documents={[{ url: 'https://example.com/a.jpg', filename: 'a.jpg', mimeType: 'image/jpeg' }]}
          onDownload={onDownload}
        />
      )
      fireEvent.click(screen.getByText('Download'))
      expect(await screen.findByText('Attachment not found on this sale')).toBeInTheDocument()
      // View must still work after a Download failure
      expect(screen.getByText('View')).toBeInTheDocument()
      expect(screen.getByText('Download')).not.toBeDisabled()
    })

    it('renders View with target=_blank and rel=noopener noreferrer regardless of onDownload', () => {
      render(
        <DocumentGrid
          title="Documents"
          emptyMessage="None"
          documents={[{ url: 'https://example.com/a.jpg', filename: 'a.jpg', mimeType: 'image/jpeg' }]}
          onDownload={vi.fn()}
        />
      )
      const viewLink = screen.getByText('View')
      expect(viewLink).toHaveAttribute('target', '_blank')
      expect(viewLink).toHaveAttribute('rel', 'noopener noreferrer')
      expect(viewLink).toHaveAttribute('href', 'https://example.com/a.jpg')
    })
  })

  describe('malformed / legacy documents', () => {
    it('does not crash when a document is missing filename and mimeType (legacy URL-only record)', () => {
      render(
        <DocumentGrid
          title="Documents"
          emptyMessage="None"
          documents={[{ url: 'https://example.com/legacy-file' }]}
        />
      )
      expect(screen.getByText('View')).toBeInTheDocument()
    })
  })
})
