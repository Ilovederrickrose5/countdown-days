import { sanitizeEvents } from './storage.js'

export function buildExportPayload(items) {
  return {
    app: 'countdown-days',
    version: 1,
    exportedAt: new Date().toISOString(),
    list: items
  }
}

export function parseImportText(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    return { error: '剪贴板中没有可识别的数据' }
  }

  const raw = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.list) ? parsed.list : null
  if (!raw) return { error: '剪贴板中没有可识别的数据' }

  const items = sanitizeEvents(raw)
  if (!items.length) return { error: '数据中没有有效的纪念日' }
  return { items }
}
