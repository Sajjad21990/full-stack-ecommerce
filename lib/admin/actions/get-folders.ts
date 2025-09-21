'use server'

import { getFolderTree } from '@/lib/admin/actions/folders'

export async function getFolderTreeAction() {
  return getFolderTree()
}
