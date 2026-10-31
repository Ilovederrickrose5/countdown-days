const KEY = 'countdown_events'
const LEGACY_KEY = 'countdown_list'
const VERSION = 1
const DEFAULT_COLOR = '#5b8def'

function normalizeList(raw) {
  if (!raw) return []
  let data = raw
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch (err) {
      console.error('[storage] 数据解析失败', err)
      return []
    }
  }
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.list)) return data.list
  return []
}

function normalizeEvent(item) {
  const legacyCreatedAt = Number(item.createdAt ?? item.id)
  return {
    id: String(item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title: String(item.title ?? item.name ?? '').trim() || '未命名',
    targetDate: String(item.targetDate ?? item.date ?? ''),
    type: item.type === 'count-up' ? 'count-up' : 'countdown',
    repeat: item.repeat === 'yearly' ? 'yearly' : 'none',
    color: item.color || DEFAULT_COLOR,
    note: item.note ?? '',
    pinned: Boolean(item.pinned),
    createdAt: Number.isFinite(legacyCreatedAt) ? legacyCreatedAt : Date.now()
  }
}

export function loadEvents() {
  const current = normalizeList(uni.getStorageSync(KEY))
  if (current.length) return current.map(normalizeEvent)

  // 兼容旧版本 countdown_list（含已保存的 days 字段，这里丢弃，改为实时计算）
  const legacy = normalizeList(uni.getStorageSync(LEGACY_KEY))
  if (!legacy.length) return []
  const migrated = legacy.map(normalizeEvent)
  saveEvents(migrated)
  uni.removeStorageSync(LEGACY_KEY)
  return migrated
}

export function saveEvents(list) {
  try {
    uni.setStorageSync(KEY, { version: VERSION, list })
  } catch (err) {
    console.error('[storage] 保存失败', err)
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}
