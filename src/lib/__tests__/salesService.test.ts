import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Sale, PaymentRecord } from '../salesService'
import * as fb from 'firebase/firestore'

// Mock Firestore at the boundary
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  getFirestore: vi.fn(),
}))

vi.mock('../firebase', () => ({
  db: { name: 'mock-db' },
}))

vi.mock('../sanitize', () => ({
  sanitizeForFirestore: (data: unknown) => data,
}))

// getSaleById now goes through authenticatedFetch('/api/sales/:id') instead of a direct Firestore
// read (see the privacy fix removing the public/client Sales read). This shim keeps every
// existing per-test `fb.getDoc` fixture below working unchanged by routing the mocked fetch
// through the same mocked getDoc/doc calls the tests already configure.
vi.mock('../authService', () => ({
  authenticatedFetch: vi.fn(async (url: string) => {
    const match = /^\/api\/sales\/([^/]+)$/.exec(url)
    if (!match) throw new Error(`Unexpected fetch url in test: ${url}`)
    const docSnap = await fb.getDoc(fb.doc({} as unknown as never, 'sales', match[1]))
    if (!docSnap.exists()) {
      return new Response(JSON.stringify({ success: false, error: 'Sale not found' }), { status: 404 })
    }
    return new Response(JSON.stringify({ success: true, sale: { id: docSnap.id, ...docSnap.data() } }))
  }),
}))

// Import after mocking
import { markPaymentPaidAndSyncSaleStatus, markPaymentUnpaidAndSyncSaleStatus, getSoldCarIds, isCarSold } from '../salesService'

// Test fixtures
const createBuyer = () => ({
  name: 'John Smith',
  idNumber: 'AB123456',
  email: 'john@example.com',
  phone: '555-1234',
  address: '123 Main St',
  licenseNumber: 'LS123456',
})

const createPaymentPlan = () => ({
  type: 'financing' as const,
  salePrice: 25000,
  downPayment: 5000,
  financedAmount: 20000,
  monthlyRate: 0.08,
  termMonths: 60,
  monthlyPayment: 400,
  totalPayment: 24000,
  totalInterest: 4000,
  firstPaymentDate: '2025-01-15',
})

const createPayment = (id: string, overrides?: Partial<PaymentRecord>): PaymentRecord => ({
  id,
  dueDate: '2025-01-15',
  amount: 400,
  status: 'pending',
  ...overrides,
})

const createSale = (overrides?: Partial<Sale>): Sale => ({
  id: 'sale-123',
  carId: 'car-001',
  carTitle: '2020 Toyota Camry',
  carBrand: 'Toyota',
  carModel: 'Camry',
  carYear: 2020,
  carColor: 'Silver',
  carImages: ['https://example.com/car.jpg'],
  buyer: createBuyer(),
  paymentPlan: createPaymentPlan(),
  payments: [createPayment('payment-1'), createPayment('payment-2'), createPayment('payment-3')],
  status: 'active',
  saleDate: '2025-01-01',
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
  createdAt: { seconds: 1000, nanoseconds: 0 } as unknown as Sale['createdAt'],
  ...overrides,
})

describe('markPaymentPaidAndSyncSaleStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('normal payment (not final)', () => {
    it('marks selected payment as paid with ISO date', async () => {
      const sale = createSale({
        payments: [
          createPayment('payment-1'),
          createPayment('payment-2'),
          createPayment('payment-3'),
        ],
      })

      // Mock getDoc to return the sale
      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      const result = await markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-1')

      expect(result.sale.payments[0].status).toBe('paid')
      expect(result.sale.payments[0].paidDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result.allPaymentsPaid).toBe(false)
      expect(result.saleCompleted).toBe(false)
    })

    it('preserves other payments unchanged', async () => {
      const sale = createSale({
        payments: [
          createPayment('payment-1'),
          createPayment('payment-2', { status: 'paid', paidDate: '2025-02-20' }),
          createPayment('payment-3'),
        ],
      })

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      const result = await markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-1')

      expect(result.sale.payments[1].status).toBe('paid')
      expect(result.sale.payments[1].paidDate).toBe('2025-02-20')
      expect(result.sale.payments[2].status).toBe('pending')
      expect(result.sale.payments[2].paidDate).toBeUndefined()
    })

    it('does not change sale status for non-final payment', async () => {
      const sale = createSale({
        status: 'active',
        payments: [createPayment('payment-1'), createPayment('payment-2')],
      })

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      const result = await markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-1')

      expect(result.sale.status).toBe('active')
      expect(result.saleCompleted).toBe(false)
    })

    it('updates with single payload containing payments and preserved status', async () => {
      const sale = createSale({
        status: 'active',
        payments: [createPayment('payment-1'), createPayment('payment-2')],
      })

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      await markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-1')

      expect(vi.mocked(fb.updateDoc)).toHaveBeenCalledTimes(1)
      const [, data] = vi.mocked(fb.updateDoc).mock.calls[0]
      expect(data).toEqual({
        payments: expect.any(Array),
        status: 'active',
      })
      expect(Object.keys(data).sort()).toEqual(['payments', 'status'])
    })
  })

  describe('final payment (all paid)', () => {
    it('transitions to completed status', async () => {
      const sale = createSale({
        status: 'active',
        payments: [
          createPayment('payment-1', { status: 'paid', paidDate: '2025-01-20' }),
          createPayment('payment-2'),
        ],
      })

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      const result = await markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-2')

      expect(result.allPaymentsPaid).toBe(true)
      expect(result.saleCompleted).toBe(true)
      expect(result.sale.status).toBe('completed')
      expect(result.sale.payments.every((p) => p.status === 'paid')).toBe(true)
    })

    it('updates with single payload containing payments and completed status', async () => {
      const sale = createSale({
        status: 'active',
        payments: [
          createPayment('payment-1', { status: 'paid', paidDate: '2025-01-20' }),
          createPayment('payment-2'),
        ],
      })

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      await markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-2')

      expect(vi.mocked(fb.updateDoc)).toHaveBeenCalledTimes(1)
      const callArgs = vi.mocked(fb.updateDoc).mock.calls[0] as unknown as [unknown, Record<string, unknown>]
      expect(callArgs[1].status).toBe('completed')
      expect((callArgs[1].payments as PaymentRecord[]).every((p: PaymentRecord) => p.status === 'paid')).toBe(true)
    })

    it('marks allPaymentsPaid and saleCompleted correctly', async () => {
      const sale = createSale({
        status: 'active',
        payments: [createPayment('payment-1')],
      })

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      const result = await markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-1')

      expect(result.allPaymentsPaid).toBe(true)
      expect(result.saleCompleted).toBe(true)
    })
  })

  describe('already completed sale', () => {
    it('preserves completed status', async () => {
      const sale = createSale({
        status: 'completed',
        payments: [
          createPayment('payment-1', { status: 'paid', paidDate: '2025-01-20' }),
          createPayment('payment-2'),
        ],
      })

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      const result = await markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-2')

      expect(result.sale.status).toBe('completed')
    })

    it('distinguishes newly-completed from already-completed', async () => {
      const sale = createSale({
        status: 'completed',
        payments: [
          createPayment('payment-1', { status: 'paid', paidDate: '2025-01-20' }),
          createPayment('payment-2'),
        ],
      })

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      const result = await markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-2')

      expect(result.allPaymentsPaid).toBe(true)
      expect(result.saleCompleted).toBe(false)
    })

    it('performs only one update for already-completed sale', async () => {
      const sale = createSale({
        status: 'completed',
        payments: [
          createPayment('payment-1', { status: 'paid', paidDate: '2025-01-20' }),
          createPayment('payment-2'),
        ],
      })

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      await markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-2')

      expect(vi.mocked(fb.updateDoc)).toHaveBeenCalledTimes(1)
    })
  })

  describe('error cases', () => {
    it('throws when sale not found', async () => {
      const docSnap = {
        exists: () => false,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)

      await expect(markPaymentPaidAndSyncSaleStatus('missing-id', 'payment-1')).rejects.toThrow(
        'Sale not found',
      )
    })

    it('throws when payment not found', async () => {
      const sale = createSale({
        payments: [createPayment('payment-1')],
      })

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)

      await expect(markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-missing')).rejects.toThrow(
        'Payment not found',
      )
    })

    it('does not call updateDoc when sale not found', async () => {
      const docSnap = {
        exists: () => false,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      await expect(markPaymentPaidAndSyncSaleStatus('missing-id', 'payment-1')).rejects.toThrow()

      expect(vi.mocked(fb.updateDoc)).not.toHaveBeenCalled()
    })

    it('does not call updateDoc when payment not found', async () => {
      const sale = createSale({
        payments: [createPayment('payment-1')],
      })

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      await expect(markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-missing')).rejects.toThrow()

      expect(vi.mocked(fb.updateDoc)).not.toHaveBeenCalled()
    })
  })

  describe('unrelated data preservation', () => {
    it('preserves all unrelated sale fields in returned sale', async () => {
      const sale = createSale({
        notes: 'Special delivery instructions',
        documents: { uploadedDocuments: ['doc1.pdf'] },
        warranty: { included: true, months: 12, provider: 'Provider' },
      })

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      const result = await markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-1')

      expect(result.sale.notes).toBe('Special delivery instructions')
      expect(result.sale.documents).toEqual({ uploadedDocuments: ['doc1.pdf'] })
      expect(result.sale.warranty).toEqual({ included: true, months: 12, provider: 'Provider' })
      expect(result.sale.buyer).toEqual(sale.buyer)
      expect(result.sale.vehicleInfo).toEqual(sale.vehicleInfo)
    })

    it('partial update does not include unrelated fields in payload', async () => {
      const sale = createSale({
        notes: 'Original notes',
        saleDate: '2025-01-01',
      })

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      await markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-1')

      const callArgs = vi.mocked(fb.updateDoc).mock.calls[0] as unknown as [unknown, Record<string, unknown>]
      expect(Object.keys(callArgs[1]).sort()).toEqual(['payments', 'status'])
      expect(callArgs[1].notes).toBeUndefined()
      expect(callArgs[1].saleDate).toBeUndefined()
    })
  })

  describe('immutability', () => {
    it('does not mutate original sale', async () => {
      const originalSale = createSale({
        payments: [
          createPayment('payment-1'),
          createPayment('payment-2'),
        ],
      })
      const saleBefore = JSON.parse(JSON.stringify(originalSale))

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => originalSale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      await markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-1')

      expect(originalSale).toEqual(saleBefore)
    })

    it('does not mutate original payments array', async () => {
      const payments = [
        createPayment('payment-1'),
        createPayment('payment-2'),
      ]
      const sale = createSale({ payments })
      const paymentsBefore = JSON.parse(JSON.stringify(payments))

      const docSnap = {
        exists: () => true,
        id: 'sale-123',
        data: () => sale,
      }
      vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
      vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

      await markPaymentPaidAndSyncSaleStatus('sale-123', 'payment-1')

      expect(payments).toEqual(paymentsBefore)
    })
  })

  describe('markPaymentUnpaidAndSyncSaleStatus', () => {
    describe('active sale reversal', () => {
      it('marks selected payment as pending', async () => {
        const sale = createSale({
          status: 'active',
          payments: [
            createPayment('payment-1', { status: 'paid', paidDate: '2025-02-20' }),
            createPayment('payment-2'),
          ],
        })

        const docSnap = {
          exists: () => true,
          id: 'sale-123',
          data: () => sale,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
        vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

        const result = await markPaymentUnpaidAndSyncSaleStatus('sale-123', 'payment-1')

        expect(result.sale.payments[0].status).toBe('pending')
        expect(result.sale.payments[0].paidDate).toBeUndefined()
        expect(result.saleReopened).toBe(false)
      })

      it('preserves other payments unchanged', async () => {
        const sale = createSale({
          status: 'active',
          payments: [
            createPayment('payment-1', { status: 'paid', paidDate: '2025-02-20' }),
            createPayment('payment-2', { status: 'paid', paidDate: '2025-03-20' }),
          ],
        })

        const docSnap = {
          exists: () => true,
          id: 'sale-123',
          data: () => sale,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
        vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

        const result = await markPaymentUnpaidAndSyncSaleStatus('sale-123', 'payment-1')

        expect(result.sale.payments[1].status).toBe('paid')
        expect(result.sale.payments[1].paidDate).toBe('2025-03-20')
      })

      it('does not change sale status when already active', async () => {
        const sale = createSale({
          status: 'active',
          payments: [createPayment('payment-1', { status: 'paid', paidDate: '2025-02-20' })],
        })

        const docSnap = {
          exists: () => true,
          id: 'sale-123',
          data: () => sale,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
        vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

        const result = await markPaymentUnpaidAndSyncSaleStatus('sale-123', 'payment-1')

        expect(result.sale.status).toBe('active')
        expect(result.saleReopened).toBe(false)
      })

      it('is idempotent for already-pending payment', async () => {
        const sale = createSale({
          status: 'active',
          payments: [
            createPayment('payment-1'), // already pending by default
            createPayment('payment-2', { status: 'paid', paidDate: '2025-02-20' }),
          ],
        })

        const docSnap = {
          exists: () => true,
          id: 'sale-123',
          data: () => sale,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
        vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

        const result = await markPaymentUnpaidAndSyncSaleStatus('sale-123', 'payment-1')

        expect(result.sale.payments[0].status).toBe('pending')
        expect(result.sale.payments[0].paidDate).toBeUndefined()
        expect(result.sale.status).toBe('active')
        expect(result.saleReopened).toBe(false)

        const callArgs = vi.mocked(fb.updateDoc).mock.calls[0] as unknown as [unknown, Record<string, unknown>]
        expect(Object.keys(callArgs[1]).sort()).toEqual(['payments', 'status'])
        expect(result.sale.payments[1].status).toBe('paid')
        expect(result.sale.payments[1].paidDate).toBe('2025-02-20')
      })
    })

    describe('completed sale reversal', () => {
      it('marks selected payment as pending and reopens sale', async () => {
        const sale = createSale({
          status: 'completed',
          payments: [
            createPayment('payment-1', { status: 'paid', paidDate: '2025-02-20' }),
            createPayment('payment-2', { status: 'paid', paidDate: '2025-03-20' }),
          ],
        })

        const docSnap = {
          exists: () => true,
          id: 'sale-123',
          data: () => sale,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
        vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

        const result = await markPaymentUnpaidAndSyncSaleStatus('sale-123', 'payment-1')

        expect(result.sale.payments[0].status).toBe('pending')
        expect(result.sale.payments[0].paidDate).toBeUndefined()
        expect(result.sale.status).toBe('active')
        expect(result.saleReopened).toBe(true)
      })

      it('correctly distinguishes reopening from active preservation', async () => {
        const completedSale = createSale({
          status: 'completed',
          payments: [createPayment('payment-1', { status: 'paid', paidDate: '2025-02-20' })],
        })

        const activeSale = createSale({
          status: 'active',
          payments: [createPayment('payment-1', { status: 'paid', paidDate: '2025-02-20' })],
        })

        // Test completed sale
        let docSnap = {
          exists: () => true,
          id: 'sale-123',
          data: () => completedSale,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
        vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

        let result = await markPaymentUnpaidAndSyncSaleStatus('sale-123', 'payment-1')
        expect(result.saleReopened).toBe(true)

        // Test active sale
        docSnap = {
          exists: () => true,
          id: 'sale-123',
          data: () => activeSale,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
        vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

        result = await markPaymentUnpaidAndSyncSaleStatus('sale-123', 'payment-1')
        expect(result.saleReopened).toBe(false)
      })

      it('writes combined payload with payments and status', async () => {
        const sale = createSale({
          status: 'completed',
          payments: [
            createPayment('payment-1', { status: 'paid', paidDate: '2025-02-20' }),
            createPayment('payment-2', { status: 'paid', paidDate: '2025-03-20' }),
          ],
        })

        const docSnap = {
          exists: () => true,
          id: 'sale-123',
          data: () => sale,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
        vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

        await markPaymentUnpaidAndSyncSaleStatus('sale-123', 'payment-1')

        const callArgs = vi.mocked(fb.updateDoc).mock.calls[0] as unknown as [unknown, Record<string, unknown>]
        expect(Object.keys(callArgs[1]).sort()).toEqual(['payments', 'status'])
        expect(callArgs[1].payments).toBeDefined()
        expect(callArgs[1].status).toBe('active')
      })
    })

    describe('error cases', () => {
      it('throws when sale not found', async () => {
        const docSnap = {
          exists: () => false,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)

        await expect(markPaymentUnpaidAndSyncSaleStatus('nonexistent', 'payment-1')).rejects.toThrow(
          'Sale not found',
        )
        expect(vi.mocked(fb.updateDoc)).not.toHaveBeenCalled()
      })

      it('throws when payment not found', async () => {
        const sale = createSale({
          payments: [createPayment('payment-1')],
        })

        const docSnap = {
          exists: () => true,
          id: 'sale-123',
          data: () => sale,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)

        await expect(markPaymentUnpaidAndSyncSaleStatus('sale-123', 'nonexistent')).rejects.toThrow(
          'Payment not found',
        )
        expect(vi.mocked(fb.updateDoc)).not.toHaveBeenCalled()
      })

      it('does not mutate original sale on error', async () => {
        const originalSale = createSale({
          payments: [createPayment('payment-1')],
        })
        const saleBefore = JSON.parse(JSON.stringify(originalSale))

        const docSnap = {
          exists: () => true,
          id: 'sale-123',
          data: () => originalSale,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)

        await expect(markPaymentUnpaidAndSyncSaleStatus('sale-123', 'nonexistent')).rejects.toThrow()

        expect(originalSale).toEqual(saleBefore)
      })
    })

    describe('data preservation', () => {
      it('preserves unrelated fields in returned sale', async () => {
        const sale = createSale({
          status: 'active',
          payments: [createPayment('payment-1', { status: 'paid', paidDate: '2025-02-20' })],
          notes: 'Important notes',
          saleDate: '2023-12-01',
        })

        const docSnap = {
          exists: () => true,
          id: 'sale-123',
          data: () => sale,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
        vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

        const result = await markPaymentUnpaidAndSyncSaleStatus('sale-123', 'payment-1')

        expect(result.sale.notes).toBe('Important notes')
        expect(result.sale.saleDate).toBe('2023-12-01')
        expect(result.sale.buyer.name).toBe('John Smith')
      })

      it('updates payload contains only payments and status', async () => {
        const sale = createSale({
          status: 'completed',
          payments: [
            createPayment('payment-1', { status: 'paid', paidDate: '2025-02-20' }),
            createPayment('payment-2'),
          ],
        })

        const docSnap = {
          exists: () => true,
          id: 'sale-123',
          data: () => sale,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
        vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

        await markPaymentUnpaidAndSyncSaleStatus('sale-123', 'payment-1')

        const callArgs = vi.mocked(fb.updateDoc).mock.calls[0] as unknown as [unknown, Record<string, unknown>]
        expect(Object.keys(callArgs[1]).sort()).toEqual(['payments', 'status'])
        expect((callArgs[1].payments as PaymentRecord[]).every((p) => p.status === 'pending' || p.status === 'paid')).toBe(
          true,
        )
      })
    })

    describe('immutability', () => {
      it('does not mutate original sale', async () => {
        const originalSale = createSale({
          status: 'completed',
          payments: [
            createPayment('payment-1', { status: 'paid', paidDate: '2025-02-20' }),
            createPayment('payment-2'),
          ],
        })
        const saleBefore = JSON.parse(JSON.stringify(originalSale))

        const docSnap = {
          exists: () => true,
          id: 'sale-123',
          data: () => originalSale,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
        vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

        await markPaymentUnpaidAndSyncSaleStatus('sale-123', 'payment-1')

        expect(originalSale).toEqual(saleBefore)
      })

      it('does not mutate original payments array', async () => {
        const paymentsBefore = [
          createPayment('payment-1', { status: 'paid', paidDate: '2025-02-20' }),
          createPayment('payment-2'),
        ]
        const sale = createSale({
          status: 'completed',
          payments: paymentsBefore,
        })

        const docSnap = {
          exists: () => true,
          id: 'sale-123',
          data: () => sale,
        }
        vi.mocked(fb.getDoc).mockResolvedValueOnce(docSnap as unknown as Awaited<ReturnType<typeof fb.getDoc>>)
        vi.mocked(fb.updateDoc).mockResolvedValue(undefined)

        const payments = paymentsBefore
        await markPaymentUnpaidAndSyncSaleStatus('sale-123', 'payment-1')

        expect(payments).toEqual(paymentsBefore)
      })
    })
  })
})

describe('getSoldCarIds / isCarSold (shared sold-status source of truth)', () => {
  function sale(overrides: Partial<Sale>): Sale {
    return { carId: 'car-1', status: 'active', ...overrides } as unknown as Sale
  }

  it('marks a car sold when it has an active sale', () => {
    const soldIds = getSoldCarIds([sale({ carId: 'car-1', status: 'active' })])
    expect(soldIds.has('car-1')).toBe(true)
    expect(isCarSold('car-1', soldIds)).toBe(true)
  })

  it('marks a car sold when it has a completed sale', () => {
    const soldIds = getSoldCarIds([sale({ carId: 'car-1', status: 'completed' })])
    expect(soldIds.has('car-1')).toBe(true)
  })

  it('does not mark a car sold when its only sale is cancelled', () => {
    const soldIds = getSoldCarIds([sale({ carId: 'car-1', status: 'cancelled' })])
    expect(soldIds.has('car-1')).toBe(false)
    expect(isCarSold('car-1', soldIds)).toBe(false)
  })

  it('ignores a sale with a missing/empty carId safely', () => {
    const soldIds = getSoldCarIds([sale({ carId: '' as unknown as string, status: 'active' })])
    expect(soldIds.size).toBe(0)
    expect(soldIds.has('')).toBe(false)
  })

  it('produces a single sold ID for duplicate sales referencing the same car', () => {
    const soldIds = getSoldCarIds([
      sale({ carId: 'car-1', status: 'active' }),
      sale({ carId: 'car-1', status: 'completed' }),
    ])
    expect(soldIds.size).toBe(1)
    expect(soldIds.has('car-1')).toBe(true)
  })

  it('returns no sold IDs for an empty Sales collection', () => {
    const soldIds = getSoldCarIds([])
    expect(soldIds.size).toBe(0)
  })

  it('treats an unrecognized/future status as sold by default (blocklist rule, not an allowlist)', () => {
    const soldIds = getSoldCarIds([sale({ carId: 'car-1', status: 'pending_review' as unknown as Sale['status'] })])
    expect(soldIds.has('car-1')).toBe(true)
  })

  it('a car with no matching sale at all is not sold', () => {
    const soldIds = getSoldCarIds([sale({ carId: 'other-car', status: 'active' })])
    expect(isCarSold('car-1', soldIds)).toBe(false)
  })
})
