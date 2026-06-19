'use client'

import { useState } from 'react'

interface StockItem {
  id: string
  itemCode: string
  description: string
  detailedDescription: string | null
  make: string | null
  ratePerPcs: number | null
  location: string | null
  incomingQty: number
  soldQty: number
  finalQty: number
  totalValue: number | null
  reorderLevel: number | null
  notes: string | null
}

interface StockFormProps {
  initialData?: (StockItem & { monthlyBooked?: number; totalSold?: number; inStoreQty?: number }) | null
  onSubmit: (data: any) => void
  onCancel: () => void
}

export default function StockForm({ initialData, onSubmit, onCancel }: StockFormProps) {
  // Calculate the correct Stock Quantity: Original + Incoming - Monthly Booked
  const monthlyBooked = initialData?.monthlyBooked || 0
  const totalSold = initialData?.totalSold || 0
  const inStoreQty = initialData?.inStoreQty || 0
  const calculatedTotalQty = (initialData?.finalQty || 0) + (initialData?.incomingQty || 0) - monthlyBooked

  const [formData, setFormData] = useState({
    itemCode: initialData?.itemCode || '',
    description: initialData?.description || '',
    detailedDescription: initialData?.detailedDescription || '',
    make: initialData?.make || '',
    ratePerPcs: initialData?.ratePerPcs?.toString() || '',
    finalQty: calculatedTotalQty.toString(),
    incomingQty: initialData?.incomingQty?.toString() || '0',
    soldQty: totalSold.toString(),
    inStoreQty: inStoreQty.toString(),
  })

  // Calculate Total Value automatically
  const totalValue = (parseFloat(formData.finalQty || '0') * parseFloat(formData.ratePerPcs || '0')).toFixed(2)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value,
      }

      // Recalculate Stock Quantity when Incoming Qty changes
      if (name === 'incomingQty') {
        const original = initialData?.finalQty || 0
        const incoming = parseInt(value) || 0
        newData.finalQty = (original + incoming - monthlyBooked).toString()
      }

      return newData
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Include calculated Total Value in submission
    onSubmit({
      ...formData,
      totalValue: parseFloat(totalValue),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Item Code */}
        <div>
          <label htmlFor="itemCode" className="block text-sm font-medium text-gray-700">
            Item Code *
          </label>
          <input
            type="text"
            id="itemCode"
            name="itemCode"
            value={formData.itemCode}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Make */}
        <div>
          <label htmlFor="make" className="block text-sm font-medium text-gray-700">
            Make
          </label>
          <input
            type="text"
            id="make"
            name="make"
            value={formData.make}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description *
        </label>
        <input
          type="text"
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      {/* Part No */}
      <div>
        <label htmlFor="detailedDescription" className="block text-sm font-medium text-gray-700">
          Part No
        </label>
        <input
          type="text"
          id="detailedDescription"
          name="detailedDescription"
          value={formData.detailedDescription}
          onChange={handleChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      {/* Rate per PCS */}
      <div>
        <label htmlFor="ratePerPcs" className="block text-sm font-medium text-gray-700">
          Price/qty (AED)
        </label>
        <input
          type="number"
          id="ratePerPcs"
          name="ratePerPcs"
          value={formData.ratePerPcs}
          onChange={handleChange}
          step="0.01"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stock Quantity */}
        <div>
          <label htmlFor="finalQty" className="block text-sm font-medium text-gray-700">
            Stock Quantity
          </label>
          <input
            type="number"
            id="finalQty"
            name="finalQty"
            value={formData.finalQty}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Stock Value (Auto-calculated) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Stock Value (AED)
          </label>
          <div className="mt-1 block w-full border border-gray-200 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-sm text-gray-600">
            AED {parseFloat(totalValue).toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Incoming Quantity */}
        <div>
          <label htmlFor="incomingQty" className="block text-sm font-medium text-gray-700">
            Incoming Qty
          </label>
          <input
            type="number"
            id="incomingQty"
            name="incomingQty"
            value={formData.incomingQty}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Sold Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Sold Total (All Bookings)
          </label>
          <div className="mt-1 block w-full border border-gray-200 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-sm text-gray-600">
            {formData.soldQty}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* In Store */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            In Store (All Bookings with Status "In Store")
          </label>
          <div className="mt-1 block w-full border border-gray-200 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-sm text-gray-600">
            {formData.inStoreQty}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {initialData ? 'Update Item' : 'Add Item'}
        </button>
      </div>
    </form>
  )
}
