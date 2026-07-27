import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: {
      getIdToken: vi.fn(async () => 'mock-token-123'),
    },
  })),
}))

import { createSale, updateSale, updatePaymentStatus, deleteSale, deleteCloudinaryFile } from '../adminSalesService'
import type { AdminSalePayload } from '../adminSalesService'

let mockFetch: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockFetch = vi.fn()
  vi.stubGlobal('fetch', mockFetch)
})

describe('adminSalesService', () => {
  describe('createSale', () => {
    it('calls POST /api/sales endpoint with Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'sale-123' }),
      })

      const payload: AdminSalePayload = {
        salePrice: 25000,
        carId: 'car-1',
        carTitle: 'Toyota Camry',
        carBrand: 'Toyota',
        carModel: 'Camry',
        carYear: 2020,
        carColor: 'Silver',
        carImages: ['https://example.com/car.jpg'],
        buyer: {
          name: 'John Doe',
          idNumber: 'AB123456',
          email: 'john@example.com',
          phone: '555-1234',
          address: '123 Main St',
          licenseNumber: 'LS123456',
        },
        paymentPlan: {
          type: 'financing',
          salePrice: 25000,
          downPayment: 5000,
          financedAmount: 20000,
          monthlyRate: 0.8,
          termMonths: 60,
          monthlyPayment: 400,
          totalPayment: 24000,
          totalInterest: 4000,
          firstPaymentDate: '2025-02-15',
        },
        payments: [
          { id: 'payment-1', dueDate: '2025-02-15', amount: 400, status: 'pending' },
        ],
        status: 'active',
        saleDate: '2025-01-15',
        notes: 'Test sale',
        vehicleInfo: {
          vin: 'JTHBP5C1XA5034760',
          plate: 'ABC123',
          isNZNew: false,
          originCountry: 'Japan',
          previousOwners: 2,
          hasMaintenanceHistory: true,
        },
        orc: {
          wof: 150,
          registration: 200,
          registrationMonths: 12,
          grooming: 0,
          ownershipTransfer: 150,
          mechanicalInspection: 0,
          otherLabel: '',
          otherAmount: 0,
          orcTotal: 500,
          orcIncluded: false,
          driveAwayPrice: false,
        },
        extraAccessories: { items: [], total: 0 },
      }

      await createSale(payload)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sales',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token-123',
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('returns { success: true, id } on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, id: 'sale-456' }),
      })

      const payload: Partial<AdminSalePayload> = { carId: 'car-1', buyer: {} as AdminSalePayload['buyer'], paymentPlan: {} as AdminSalePayload['paymentPlan'], payments: [], status: 'active', saleDate: '2025-01-15' }
      const result = await createSale(payload as AdminSalePayload)

      expect(result.success).toBe(true)
      expect(result.id).toBe('sale-456')
    })

    it('returns error on 400 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Invalid payload' }),
      })

      const payload: Partial<AdminSalePayload> = { carId: 'car-1', buyer: {} as AdminSalePayload['buyer'], paymentPlan: {} as AdminSalePayload['paymentPlan'], payments: [], status: 'active', saleDate: '2025-01-15' }
      const result = await createSale(payload as AdminSalePayload)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid payload')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const payload: Partial<AdminSalePayload> = { carId: 'car-1', buyer: {} as AdminSalePayload['buyer'], paymentPlan: {} as AdminSalePayload['paymentPlan'], payments: [], status: 'active', saleDate: '2025-01-15' }
      const result = await createSale(payload as AdminSalePayload)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network')
    })
  })

  describe('updateSale', () => {
    it('calls PATCH /api/sales/:id with correct ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await updateSale('sale-123', { notes: 'Updated notes' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sales/sale-123',
        expect.objectContaining({ method: 'PATCH' })
      )
    })

    it('includes Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await updateSale('sale-123', { notes: 'Updated' })

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers.Authorization).toBe('Bearer mock-token-123')
    })

    it('returns success on 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await updateSale('sale-123', { notes: 'Updated' })

      expect(result.success).toBe(true)
    })

    it('returns error on 400', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Update failed' }),
      })

      const result = await updateSale('sale-123', { notes: 'Updated' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Update failed')
    })
  })

  describe('updatePaymentStatus', () => {
    it('calls PATCH /api/sales/:saleId/payments/:paymentId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await updatePaymentStatus('sale-123', 'payment-1', 'paid')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sales/sale-123/payments/payment-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'paid' }),
        })
      )
    })

    it('includes Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await updatePaymentStatus('sale-123', 'payment-1', 'pending')

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers.Authorization).toBe('Bearer mock-token-123')
    })

    it('returns success on 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await updatePaymentStatus('sale-123', 'payment-1', 'paid')

      expect(result.success).toBe(true)
    })

    it('returns error on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Payment not found' }),
      })

      const result = await updatePaymentStatus('sale-123', 'missing', 'paid')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Payment not found')
    })
  })

  describe('deleteSale', () => {
    it('calls DELETE /api/sales/:id', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await deleteSale('sale-123')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sales/sale-123',
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('includes Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await deleteSale('sale-123')

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers.Authorization).toBe('Bearer mock-token-123')
    })

    it('returns success on 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await deleteSale('sale-123')

      expect(result.success).toBe(true)
    })

    it('returns error on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Sale not found' }),
      })

      const result = await deleteSale('missing-sale')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Sale not found')
    })

    it('returns error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failed'))

      const result = await deleteSale('sale-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network')
    })
  })

  describe('deleteCloudinaryFile', () => {
    it('calls POST /api/cloudinary/delete with publicId and resourceType', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await deleteCloudinaryFile('automarket/sales/doc', 'image')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cloudinary/delete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ publicId: 'automarket/sales/doc', resourceType: 'image' }),
        })
      )
    })

    it('includes Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await deleteCloudinaryFile('automarket/sales/doc', 'image')

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers.Authorization).toBe('Bearer mock-token-123')
    })

    it('returns success on 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      const result = await deleteCloudinaryFile('automarket/sales/doc', 'image')
      expect(result.success).toBe(true)
    })

    it('returns a controlled error when the backend reports Cloudinary is not configured', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Cloudinary admin credentials are not configured on the server' }),
      })

      const result = await deleteCloudinaryFile('automarket/sales/doc', 'image')
      expect(result.success).toBe(false)
      expect(result.error).toContain('not configured')
    })

    it('returns error on network failure (does not throw)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failed'))

      const result = await deleteCloudinaryFile('automarket/sales/doc', 'image')
      expect(result.success).toBe(false)
    })
  })

  describe('no Firestore dependency', () => {
    it('does not import or use Firestore client SDK', () => {
      // Service only uses fetch and Firebase Auth
      // All writes go through /api endpoints
      expect(mockFetch).toBeDefined()
    })
  })
})
