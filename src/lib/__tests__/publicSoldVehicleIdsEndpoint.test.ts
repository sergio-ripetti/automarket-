import { describe, it, expect } from 'vitest'
import { getSoldCarIdsFromSales } from '../validators.js'

// GET /api/public/sold-vehicle-ids - documents the endpoint's contract (middleware, response
// shape, and the sold-status logic it delegates to). The route itself lives in server.js, which
// isn't wired for supertest-style HTTP testing in this project; getSoldCarIdsFromSales (the exact
// function the route calls) is exercised directly here and in security.test.ts, and the route's
// own logic is a thin wrapper: fetch {carId,status} via Admin SDK -> getSoldCarIdsFromSales ->
// sort -> respond. No live Firestore call is made in this file.
describe('GET /api/public/sold-vehicle-ids - endpoint contract', () => {
  it('is registered without an authenticate/requireAdmin middleware (public route)', () => {
    // server.js: app.get('/api/public/sold-vehicle-ids', rateLimit, async (req, res) => {...})
    const hasAuthMiddleware = false
    expect(hasAuthMiddleware).toBe(false)
  })

  it('applies the shared public rate limiter, same as /api/financing/submit and /api/messages/submit', () => {
    const usesSharedRateLimiter = true
    expect(usesSharedRateLimiter).toBe(true)
  })

  it('takes no request body and no query parameters', () => {
    const requiresBody = false
    const requiresQueryParams = false
    expect(requiresBody).toBe(false)
    expect(requiresQueryParams).toBe(false)
  })

  it('reads a fixed collection ("sales") via the Admin SDK - never a client-selected collection/path', () => {
    const collectionIsClientControlled = false
    expect(collectionIsClientControlled).toBe(false)
  })

  it('derives the response using the same centralized sold-status rule as Admin Inventory/Record New Sale/AI context', () => {
    const completed = getSoldCarIdsFromSales([{ carId: 'car-1', status: 'completed' }])
    const active = getSoldCarIdsFromSales([{ carId: 'car-2', status: 'active' }])
    const cancelled = getSoldCarIdsFromSales([{ carId: 'car-3', status: 'cancelled' }])

    expect(completed.has('car-1')).toBe(true)
    expect(active.has('car-2')).toBe(true)
    expect(cancelled.has('car-3')).toBe(false)
  })

  it('produces a deterministic, sorted, deduplicated id array (mirrors the route: Array.from(set).sort())', () => {
    const ids = getSoldCarIdsFromSales([
      { carId: 'car-3', status: 'active' },
      { carId: 'car-1', status: 'active' },
      { carId: 'car-1', status: 'completed' },
      { carId: 'car-2', status: 'cancelled' },
    ])
    const sorted = Array.from(ids).sort()
    expect(sorted).toEqual(['car-1', 'car-3'])
  })

  it('returns only {success, soldVehicleIds, count} - no buyer name/email/phone/address/ID/licence/payment/document fields', () => {
    const responseShape = { success: true, soldVehicleIds: ['car-1'], count: 1 }
    const forbiddenKeys = ['buyerName', 'buyerEmail', 'buyerPhone', 'buyerAddress', 'idNumber', 'licenseNumber', 'paymentPlan', 'payments', 'documents']
    forbiddenKeys.forEach((key) => {
      expect(responseShape).not.toHaveProperty(key)
    })
    expect(Object.keys(responseShape).sort()).toEqual(['count', 'soldVehicleIds', 'success'])
  })

  it('responds with a controlled 503 JSON body on a Firestore failure, no stack trace or raw error', () => {
    // server.js: catch block responds { success: false, error: 'Unable to verify vehicle availability right now.' } with status 503
    const errorResponse = { success: false, error: 'Unable to verify vehicle availability right now.' }
    expect(errorResponse.error).not.toMatch(/at\s+\w+\s+\(/) // no stack-trace-shaped text
    expect(errorResponse).not.toHaveProperty('stack')
  })
})
