import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { PantryItem } from '@/app/components/meals/types'

// --- Test data factory ---
const createPantryItem = (overrides: Partial<PantryItem> = {}): PantryItem => ({
  id: `pantry-${Math.random().toString(36).substring(7)}`,
  user_id: 'test-user-123',
  name: 'Mąka pszenna',
  quantity_total: 1000,
  quantity_remaining: 800,
  unit: 'g',
  price: 4.5,
  purchased_at: '2026-04-01',
  created_at: '2026-04-01T10:00:00.000Z',
  updated_at: '2026-04-01T10:00:00.000Z',
  is_free: false,
  ...overrides,
})

// --- Mock data ---
const mockPantryItems = [
  createPantryItem({ id: 'pantry-1', name: 'Mąka pszenna', quantity_remaining: 800 }),
  createPantryItem({ id: 'pantry-2', name: 'Mleko', quantity_total: 1000, quantity_remaining: 500, unit: 'ml', price: 3.5 }),
  createPantryItem({ id: 'pantry-3', name: 'Jajka', quantity_total: 10, quantity_remaining: 6, unit: 'szt', price: 12.0 }),
]

// --- Supabase mock ---
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'pantry_items') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockPantryItems, error: null })),
            })),
          })),
          insert: mockInsert.mockReturnValue({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: createPantryItem({ id: 'pantry-new', name: 'Ryż' }),
                error: null,
              })),
            })),
          }),
          update: mockUpdate.mockReturnValue({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          }),
          delete: mockDelete.mockReturnValue({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }
    }),
  },
}))

// Mock dependencies that usePantry imports
vi.mock('@/app/components/meals/costUtils', () => ({
  estimateCostFromPantry: vi.fn(() => ({ totalCost: 0, costs: new Map() })),
}))

vi.mock('@/app/components/meals/pantryUtils', () => ({
  findMatchingPantryItems: vi.fn(() => []),
  costPerUnit: vi.fn(() => 0),
}))

const mockUserId = 'test-user-123'

describe('usePantry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function renderUsePantry(userId: string | undefined) {
    const { usePantry } = await import('@/app/components/meals/usePantry')
    return renderHook(() => usePantry(userId))
  }

  it('loads pantry items on mount', async () => {
    const { result } = await renderUsePantry(mockUserId)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.items).toHaveLength(3)
    expect(result.current.items[0]!.name).toBe('Mąka pszenna')
  })

  it('adds a new pantry item', async () => {
    const { result } = await renderUsePantry(mockUserId)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.addItem({
        name: 'Ryż',
        quantity: 1,
        inputUnit: 'kg',
        price: 6.0,
      })
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUserId,
        name: 'Ryż',
        quantity_total: 1000, // 1kg = 1000g
        quantity_remaining: 1000,
        unit: 'g',
        price: 6.0,
        is_free: false,
      })
    )
  })

  it('updates a pantry item', async () => {
    const { result } = await renderUsePantry(mockUserId)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.updateItem('pantry-1', { quantity_remaining: 500 })
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity_remaining: 500,
      })
    )
  })

  it('deletes a pantry item', async () => {
    const { result } = await renderUsePantry(mockUserId)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.deleteItem('pantry-1')
    })

    expect(mockDelete).toHaveBeenCalled()
    // Optimistic removal
    expect(result.current.items.find(i => i.id === 'pantry-1')).toBeUndefined()
  })
})
