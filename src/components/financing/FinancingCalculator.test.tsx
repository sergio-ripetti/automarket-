import '@testing-library/jest-dom'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FinancingCalculator from './FinancingCalculator'
import type { Car } from '../../types'
import type { FinancingCalculationResult } from '../../lib/financingCalculations'

const mockCar: Car = {
  id: '1',
  title: 'Toyota Corolla',
  brand: 'Toyota',
  model: 'Corolla',
  year: 2020,
  price: 25000,
  isOnSale: false,
  km: 50000,
  description: 'Great car',
  ownerDescription: 'Well maintained',
  images: ['https://example.com/car.jpg'],
  transmission: 'automatico',
  fuel: 'gasolina',
  color: 'White',
  featured: false,
}

const mockCalculation: FinancingCalculationResult = {
  basePrice: 25000,
  downPaymentAmount: 5000,
  financedAmount: 20000,
  monthlyPayment: 670.48,
  totalRepayment: 29118.28,
  totalInterest: 4118.28,
  sliderPercentage: 25,
}

describe('FinancingCalculator', () => {
  describe('Vehicle Price Display', () => {
    it('displays car card when car is selected', () => {
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      expect(screen.getByText('Toyota Corolla')).toBeInTheDocument()
      expect(screen.getByText('$25,000')).toBeInTheDocument()
    })

    it('displays manual price input when no car selected', () => {
      render(
        <FinancingCalculator
          car={undefined}
          manualPrice="30000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      expect(screen.getByDisplayValue('30000')).toBeInTheDocument()
      expect(screen.getByText(/CAR PRICE/)).toBeInTheDocument()
    })
  })

  describe('Manual Price Input', () => {
    it('calls onManualPriceChange when price input changes', () => {
      const onManualPriceChange = vi.fn()
      render(
        <FinancingCalculator
          car={undefined}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={onManualPriceChange}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      const input = screen.getByDisplayValue('25000') as HTMLInputElement
      fireEvent.change(input, { target: { value: '35000' } })
      expect(onManualPriceChange).toHaveBeenCalledWith('35000')
    })
  })

  describe('Down Payment Slider', () => {
    it('displays down payment amount formatted as currency', () => {
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      expect(screen.getByText('$5,000')).toBeInTheDocument()
    })

    it('displays down payment percentage', () => {
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      expect(screen.getByText('20%')).toBeInTheDocument()
    })

    it('calls onDownPaymentChange when slider value changes', () => {
      const onDownPaymentChange = vi.fn()
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={onDownPaymentChange}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      const slider = screen.getByRole('slider')
      fireEvent.change(slider, { target: { value: '30' } })
      expect(onDownPaymentChange).toHaveBeenCalled()
    })

    it('has correct slider min, max, step attributes', () => {
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('min', '10')
      expect(slider).toHaveAttribute('max', '50')
      expect(slider).toHaveAttribute('step', '5')
    })
  })

  describe('Loan Term Options', () => {
    it('displays all loan term buttons', () => {
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      expect(screen.getByText('12 mo')).toBeInTheDocument()
      expect(screen.getByText('24 mo')).toBeInTheDocument()
      expect(screen.getByText('36 mo')).toBeInTheDocument()
      expect(screen.getByText('48 mo')).toBeInTheDocument()
      expect(screen.getByText('60 mo')).toBeInTheDocument()
    })

    it('highlights selected loan term button', () => {
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      const buttons = screen.getAllByRole('button')
      const selected36 = buttons.find(b => b.textContent === '36 mo')
      expect(selected36).toHaveStyle({ background: '#1A1A1A' })
    })

    it('calls onLoanTermChange when term button is clicked', () => {
      const onLoanTermChange = vi.fn()
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={onLoanTermChange}
          onContinue={vi.fn()}
        />
      )
      const button60 = screen.getByText('60 mo')
      fireEvent.click(button60)
      expect(onLoanTermChange).toHaveBeenCalledWith(60)
    })
  })

  describe('Summary Display', () => {
    it('displays monthly payment formatted as currency', () => {
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      expect(screen.getByText('$670')).toBeInTheDocument()
    })

    it('displays amount financed', () => {
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      expect(screen.getByText('$20,000')).toBeInTheDocument()
    })

    it('displays total repayment', () => {
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      expect(screen.getByText('$29,118')).toBeInTheDocument()
    })

    it('displays total interest', () => {
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      expect(screen.getByText('$4,118')).toBeInTheDocument()
    })

    it('displays summary labels', () => {
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      expect(screen.getByText('ESTIMATED MONTHLY PAYMENT')).toBeInTheDocument()
      expect(screen.getByText('Amount Financed')).toBeInTheDocument()
      expect(screen.getByText('Total Repayment')).toBeInTheDocument()
      expect(screen.getByText('Total Interest')).toBeInTheDocument()
    })
  })

  describe('Continue Button', () => {
    it('renders Continue button with correct text', () => {
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={vi.fn()}
        />
      )
      expect(screen.getByText('Apply for Financing →')).toBeInTheDocument()
    })

    it('calls onContinue when Continue button is clicked', () => {
      const onContinue = vi.fn()
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={vi.fn()}
          onDownPaymentChange={vi.fn()}
          onLoanTermChange={vi.fn()}
          onContinue={onContinue}
        />
      )
      const button = screen.getByText('Apply for Financing →')
      fireEvent.click(button)
      expect(onContinue).toHaveBeenCalledTimes(1)
    })
  })

  describe('Callback Props', () => {
    it('does not call any callbacks on initial render', () => {
      const onManualPriceChange = vi.fn()
      const onDownPaymentChange = vi.fn()
      const onLoanTermChange = vi.fn()
      const onContinue = vi.fn()
      render(
        <FinancingCalculator
          car={mockCar}
          manualPrice="25000"
          downPaymentPercent={20}
          loanTermMonths={36}
          calculation={mockCalculation}
          onManualPriceChange={onManualPriceChange}
          onDownPaymentChange={onDownPaymentChange}
          onLoanTermChange={onLoanTermChange}
          onContinue={onContinue}
        />
      )
      expect(onManualPriceChange).not.toHaveBeenCalled()
      expect(onDownPaymentChange).not.toHaveBeenCalled()
      expect(onLoanTermChange).not.toHaveBeenCalled()
      expect(onContinue).not.toHaveBeenCalled()
    })
  })
})
