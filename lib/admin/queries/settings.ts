import { db } from '@/db'
import { settings } from '@/db/schema'
import { eq, like } from 'drizzle-orm'

export async function getSettings(prefix?: string) {
  try {
    const whereCondition = prefix ? like(settings.key, `${prefix}_%`) : undefined
    
    const settingsData = await db.query.settings.findMany({
      where: whereCondition,
      orderBy: (settings, { asc }) => [asc(settings.key)]
    })

    const settingsMap: Record<string, any> = {}
    
    settingsData.forEach(setting => {
      const key = prefix ? setting.key.replace(`${prefix}_`, '') : setting.key
      let value = setting.value

      if (setting.type === 'boolean') {
        value = value === 'true'
      } else if (setting.type === 'number') {
        value = parseFloat(value)
      } else if (setting.type === 'array') {
        try {
          value = JSON.parse(value)
        } catch (e) {
          value = []
        }
      } else if (setting.type === 'object') {
        try {
          value = JSON.parse(value)
        } catch (e) {
          value = {}
        }
      }

      settingsMap[key] = value
    })

    return settingsMap
  } catch (error) {
    console.error('Error fetching settings:', error)
    // If table doesn't exist yet, return empty settings
    if (error instanceof Error && error.message.includes('does not exist')) {
      return {}
    }
    return {}
  }
}

export async function getStoreSettings() {
  return getSettings('store')
}

export async function getShippingSettings() {
  return getSettings('shipping')
}

export async function getEmailSettings() {
  return getSettings('email')
}

export async function getSEOSettings() {
  return getSettings('seo')
}

export async function getTaxSettings() {
  return getSettings('tax')
}

export async function getTaxZones() {
  return [
    {
      id: '1',
      name: 'India',
      country: 'IN',
      state: 'All',
      taxRate: 18,
      taxName: 'GST',
      isActive: true
    },
    {
      id: '2', 
      name: 'United States',
      country: 'US',
      state: 'CA',
      taxRate: 8.5,
      taxName: 'Sales Tax',
      isActive: true
    },
    {
      id: '3',
      name: 'European Union',
      country: 'EU',
      state: 'All',
      taxRate: 20,
      taxName: 'VAT',
      isActive: true
    }
  ]
}

// Get all settings organized by category
export async function getAllSettings() {
  try {
    const allSettings = await getSettings()
    
    const categorized = {
      store: {} as Record<string, any>,
      shipping: {} as Record<string, any>,
      email: {} as Record<string, any>,
      seo: {} as Record<string, any>,
      tax: {} as Record<string, any>,
      payment: {} as Record<string, any>,
      other: {} as Record<string, any>
    }

    Object.entries(allSettings).forEach(([key, value]) => {
      if (key.startsWith('store_')) {
        categorized.store[key.replace('store_', '')] = value
      } else if (key.startsWith('shipping_')) {
        categorized.shipping[key.replace('shipping_', '')] = value
      } else if (key.startsWith('email_')) {
        categorized.email[key.replace('email_', '')] = value
      } else if (key.startsWith('seo_')) {
        categorized.seo[key.replace('seo_', '')] = value
      } else if (key.startsWith('tax_')) {
        categorized.tax[key.replace('tax_', '')] = value
      } else if (key.startsWith('payment_')) {
        categorized.payment[key.replace('payment_', '')] = value
      } else {
        categorized.other[key] = value
      }
    })

    return categorized
  } catch (error) {
    console.error('Error fetching all settings:', error)
    throw error
  }
}