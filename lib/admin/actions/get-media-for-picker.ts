'use server'

import {
  getMediaAssets,
  getMediaFoldersWithCounts,
} from '@/lib/admin/queries/media'

export async function getMediaForPicker() {
  try {
    const [mediaResult, folders] = await Promise.all([
      getMediaAssets({ limit: 1000 }), // Get all media for picker
      getMediaFoldersWithCounts(),
    ])

    return {
      success: true,
      media: mediaResult.media,
      folders: folders,
    }
  } catch (error) {
    console.error('Error fetching media for picker:', error)
    return {
      success: false,
      media: [],
      folders: [],
      error: 'Failed to fetch media',
    }
  }
}
