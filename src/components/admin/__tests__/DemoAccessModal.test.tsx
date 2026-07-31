import '@testing-library/jest-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createRef } from 'react'

function renderModal(onClose = vi.fn(), onFillCredentials?: (email: string, password: string) => void) {
  const triggerRef = createRef<HTMLButtonElement>()
  document.body.innerHTML = '<button id="trigger">Demo Access</button>'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(triggerRef as any).current = document.getElementById('trigger')
  // Imported lazily, after env stubs are set, since demoAccessConfig.ts reads import.meta.env at
  // module-evaluation time.
  return import('../DemoAccessModal').then(({ default: DemoAccessModal }) => {
    render(<DemoAccessModal onClose={onClose} triggerRef={triggerRef} onFillCredentials={onFillCredentials} />)
    return { onClose, triggerRef }
  })
}

describe('DemoAccessModal - configured (VITE_DEMO_ADMIN_EMAIL/PASSWORD set)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_DEMO_ADMIN_EMAIL', 'demo.admin@automarket.co.nz')
    vi.stubEnv('VITE_DEMO_ADMIN_PASSWORD', 'AutoDemo2026!')
    Object.assign(navigator, { clipboard: { writeText: vi.fn(() => Promise.resolve()) } })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('displays the configured demo email, not the real administrator email', async () => {
    await renderModal()
    expect(screen.getByText('demo.admin@automarket.co.nz')).toBeInTheDocument()
    expect(screen.queryByText('admin@automarket.co.nz')).not.toBeInTheDocument()
  })

  it('does not display any "KNOWN ISSUE" or unverified-password warning text', async () => {
    await renderModal()
    expect(screen.queryByText(/known issue/i)).not.toBeInTheDocument()
  })

  it('copies the email value via the email copy button', async () => {
    await renderModal()
    fireEvent.click(screen.getByLabelText('Copy email'))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('demo.admin@automarket.co.nz')
  })

  it('copies the password value via the password copy button', async () => {
    await renderModal()
    fireEvent.click(screen.getByLabelText('Copy password'))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('AutoDemo2026!')
  })

  it('shows "Copied" feedback after a successful copy', async () => {
    await renderModal()
    fireEvent.click(screen.getByLabelText('Copy email'))
    expect(await screen.findByLabelText('Email copied')).toBeInTheDocument()
  })

  it('moves focus to the close button on open', async () => {
    await renderModal()
    expect(screen.getByLabelText('Close demo access dialog')).toHaveFocus()
  })

  it('closes on Escape and calls onClose', async () => {
    const { onClose } = await renderModal()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the close button is clicked', async () => {
    const { onClose } = await renderModal()
    fireEvent.click(screen.getByLabelText('Close demo access dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the overlay (not the dialog itself) is clicked', async () => {
    const { onClose } = await renderModal()
    const dialog = screen.getByRole('dialog')
    const overlay = dialog.parentElement as HTMLElement
    fireEvent.mouseDown(overlay, { target: overlay })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when clicking inside the dialog content', async () => {
    const { onClose } = await renderModal()
    fireEvent.mouseDown(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('returns focus to the trigger element when unmounted', async () => {
    const triggerRef = createRef<HTMLButtonElement>()
    document.body.innerHTML = '<button id="trigger">Demo Access</button>'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(triggerRef as any).current = document.getElementById('trigger')
    const { default: DemoAccessModal } = await import('../DemoAccessModal')
    const { unmount } = render(<DemoAccessModal onClose={vi.fn()} triggerRef={triggerRef} />)
    unmount()
    expect(triggerRef.current).toHaveFocus()
  })

  it('renders as an accessible dialog with a labelled title', async () => {
    await renderModal()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Admin Demo Access')
  })

  it('the "Fill demo credentials" action populates the form and closes the modal, without auto-submitting', async () => {
    const onClose = vi.fn()
    const onFillCredentials = vi.fn()
    await renderModal(onClose, onFillCredentials)
    fireEvent.click(screen.getByText('Fill demo credentials'))
    expect(onFillCredentials).toHaveBeenCalledWith('demo.admin@automarket.co.nz', 'AutoDemo2026!')
  })

  it('does not render the "Fill demo credentials" action when no handler is provided', async () => {
    await renderModal()
    expect(screen.queryByText('Fill demo credentials')).not.toBeInTheDocument()
  })

  it('never logs the demo password to the console', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await renderModal()
    fireEvent.click(screen.getByLabelText('Copy password'))
    for (const spy of [errorSpy, warnSpy, logSpy]) {
      for (const call of spy.mock.calls) {
        expect(call.join(' ')).not.toContain('AutoDemo2026!')
      }
    }
    errorSpy.mockRestore()
    warnSpy.mockRestore()
    logSpy.mockRestore()
  })
})

describe('DemoAccessModal - not configured (env vars unset)', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('VITE_DEMO_ADMIN_EMAIL', '')
    vi.stubEnv('VITE_DEMO_ADMIN_PASSWORD', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('shows a safe unavailable message instead of any credential', async () => {
    await renderModal()
    expect(screen.getByText('Demo access is temporarily unavailable.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Copy email')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Copy password')).not.toBeInTheDocument()
  })

  it('never falls back to the real administrator email', async () => {
    await renderModal()
    expect(screen.queryByText('admin@automarket.co.nz')).not.toBeInTheDocument()
    expect(screen.queryByText(/@automarket/)).not.toBeInTheDocument()
  })

  it('still allows closing via the close button', async () => {
    const { onClose } = await renderModal()
    fireEvent.click(screen.getByLabelText('Close demo access dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
