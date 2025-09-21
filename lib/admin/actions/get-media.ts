'use server'

import { getMediaAssets } from '@/lib/admin/queries/media'

export async function getMediaAssetsAction(filters: any) {
  return getMediaAssets(filters)
}
