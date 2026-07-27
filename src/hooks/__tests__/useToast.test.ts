import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast } from '../useToast'

describe('useToast - stable references', () => {
  it('returns the same showToast function reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useToast())
    const firstShowToast = result.current.showToast

    rerender()
    const secondShowToast = result.current.showToast

    expect(secondShowToast).toBe(firstShowToast)
  })

  it('returns the same dismissToast function reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useToast())
    const firstDismiss = result.current.dismissToast

    rerender()
    const secondDismiss = result.current.dismissToast

    expect(secondDismiss).toBe(firstDismiss)
  })

  it('showToast reference stays stable even after it is called and triggers a state update', () => {
    const { result } = renderHook(() => useToast())
    const firstShowToast = result.current.showToast

    act(() => {
      result.current.showToast('Test message', 'error')
    })

    // The hook re-rendered (toast state changed) - showToast must still be the same function.
    // This is the exact property that prevents a `useEffect(..., [showToast])` consumer
    // from re-running its effect every time showToast is invoked.
    expect(result.current.showToast).toBe(firstShowToast)
    expect(result.current.toast).toEqual({ message: 'Test message', type: 'error' })
  })
})
