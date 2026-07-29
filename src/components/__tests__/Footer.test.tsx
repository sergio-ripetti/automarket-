import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from '../Footer'

function renderFooter() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  )
}

describe('Footer', () => {
  it('renders the AutoMarket brand name', () => {
    renderFooter()
    expect(screen.getByText('AutoMarket')).toBeInTheDocument()
  })

  it('renders all business contact details', () => {
    renderFooter()
    expect(screen.getByText(/123 Queen Street/)).toBeInTheDocument()
    expect(screen.getByText(/Auckland CBD, NZ 1010/)).toBeInTheDocument()
    expect(screen.getByText('+64 9 123 4567')).toBeInTheDocument()
    expect(screen.getByText('contact@automarket.co.nz')).toBeInTheDocument()
  })

  it('uses a correctly formatted tel: link with no stray characters', () => {
    renderFooter()
    const phoneLink = screen.getByText('+64 9 123 4567').closest('a')
    expect(phoneLink).toHaveAttribute('href', 'tel:+6491234567')
  })

  it('uses a correct mailto: link', () => {
    renderFooter()
    const emailLink = screen.getByText('contact@automarket.co.nz').closest('a')
    expect(emailLink).toHaveAttribute('href', 'mailto:contact@automarket.co.nz')
  })

  it('renders all four quick links with valid, real destinations', () => {
    renderFooter()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Browse Cars' })).toHaveAttribute('href', '/cars')
    expect(screen.getByRole('link', { name: 'Financing' })).toHaveAttribute('href', '/financing')
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/contact')
  })

  it('does not render any dead/placeholder link (no href="#")', () => {
    renderFooter()
    const links = screen.getAllByRole('link')
    links.forEach((link) => {
      expect(link.getAttribute('href')).not.toBe('#')
    })
  })

  it('renders opening hours', () => {
    renderFooter()
    expect(screen.getByText('Opening Hours')).toBeInTheDocument()
    expect(screen.getByText('Sunday')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })

  it('renders the copyright line', () => {
    renderFooter()
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument()
  })

  it('renders a natural, non-generic brand description with no em dash', () => {
    renderFooter()
    expect(screen.getByText(/Helping New Zealand drivers find, compare and finance quality vehicles/)).toBeInTheDocument()
  })

  it('contains no em dash anywhere in the rendered footer copy', () => {
    const { container } = renderFooter()
    expect(container.textContent).not.toMatch(/—/)
  })

  it('renders the Explore column heading with clear hierarchy', () => {
    renderFooter()
    expect(screen.getByText('Explore')).toBeInTheDocument()
  })

  it('renders no dead/icon-only interactive elements (every link/button has accessible text)', () => {
    renderFooter()
    const links = screen.getAllByRole('link')
    links.forEach((link) => {
      expect(link.textContent?.trim().length).toBeGreaterThan(0)
    })
  })

  it('keeps all sections present regardless of viewport (stacked/grid CSS only, content unchanged)', () => {
    renderFooter()
    expect(screen.getByText('AutoMarket')).toBeInTheDocument()
    expect(screen.getByText('Explore')).toBeInTheDocument()
    expect(screen.getAllByText('Contact').length).toBeGreaterThan(0)
    expect(screen.getByText('Opening Hours')).toBeInTheDocument()
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument()
  })

  it('links remain keyboard accessible (focusable, not tabindex=-1)', () => {
    renderFooter()
    screen.getAllByRole('link').forEach((link) => {
      expect(link).not.toHaveAttribute('tabindex', '-1')
    })
  })

  it('preserves the semantic footer landmark', () => {
    renderFooter()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('uses a real heading element for each section (logical HTML levels, not a styled div)', () => {
    renderFooter()
    const headings = screen.getAllByRole('heading', { level: 3 })
    const headingText = headings.map((h) => h.textContent)
    expect(headingText).toEqual(expect.arrayContaining(['Explore', 'Contact', 'Opening Hours']))
  })

  it('Explore link decorative arrows are hidden from assistive tech, not a separate focusable control', () => {
    renderFooter()
    const homeLink = screen.getByRole('link', { name: 'Home' })
    const arrow = homeLink.querySelector('span[aria-hidden="true"]')
    expect(arrow).toBeInTheDocument()
    expect(arrow?.textContent).toBe('→')
  })
})
