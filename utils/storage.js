import { nextLunarSolarDate } from './lunar.js'
import { todayString } from './date.js'

const KEY = 'countdown_events'
const LEGACY_KEY = 'countdown_list'
const VERSION = 1
const DEFAULT_COLOR = '#5b8def'
const DEFAULT_REMINDER_TIME = '09:00'
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const REMINDER_DAYS = [0, 1, 3, 7]

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

function normalizeLunar(item, type, repeat) {
  if (type !== 'countdown' || repeat !== 'yearly' || item.calendar !== 'lunar') return null
  const month = Number(item.lunarMonth)
  const day = Number(item.lunarDay)
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  if (!Number.isInteger(day) || day < 1 || day > 30) return null
  return { month, day }
}

function normalizeReminder(item, type) {
  const reminderTime =
    typeof item.reminderTime === 'string' && TIME_PATTERN.test(item.reminderTime)
      ? item.reminderTime
      : DEFAULT_REMINDER_TIME

  if (type !== 'countdown') return { days: null, time: reminderTime }

  let days = item.reminderDays
  if (typeof days === 'string' && days.trim() !== '') days = Number(days)
  return { days: REMINDER_DAYS.includes(days) ? days : null, time: reminderTime }
}

function normalizeTags(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(/[\s,，]+/)
  return Array.from(
    new Set(
      raw
        .map(tag => String(tag).trim())
        .filter(Boolean)
    )
  ).slice(0, 5)
}

function isRealDateString(value) {
  const match = DATE_PATTERN.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1900 || year > 2100) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function normalizeEvent(item) {
  const legacyCreatedAt = Number(item.createdAt ?? item.id)
  const type = item.type === 'count-up' ? 'count-up' : 'countdown'
  const repeat = item.repeat === 'yearly' ? 'yearly' : 'none'
  const lunar = normalizeLunar(item, type, repeat)
  const reminder = normalizeReminder(item, type)
  const rawTargetDate = String(item.targetDate ?? item.date ?? '')

  // 农历事件以 lunarMonth/lunarDay 为准，targetDate 只作极端情况兜底
  let targetDate = rawTargetDate
  if (lunar && !isRealDateString(targetDate)) {
    targetDate = nextLunarSolarDate(lunar.month, lunar.day) || todayString()
  }

  return {
    id: String(item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    title: String(item.title ?? item.name ?? '').trim() || '未命名',
    targetDate,
    type,
    repeat,
    calendar: lunar ? 'lunar' : 'solar',
    lunarMonth: lunar ? lunar.month : null,
    lunarDay: lunar ? lunar.day : null,
    reminderDays: reminder.days,
    reminderTime: reminder.time,
    color: typeof item.color === 'string' && item.color ? item.color : DEFAULT_COLOR,
    tags: normalizeTags(item.tags ?? item.tag),
    note: String(item.note ?? ''),
    pinned: Boolean(item.pinned),
    createdAt: Number.isFinite(legacyCreatedAt) ? legacyCreatedAt : Date.now()
  }
}

function isUsableEvent(item) {
  if (item.calendar === 'lunar') {
    return (
      Number.isInteger(item.lunarMonth) &&
      item.lunarMonth >= 1 &&
      item.lunarMonth <= 12 &&
      Number.isInteger(item.lunarDay) &&
      item.lunarDay >= 1 &&
      item.lunarDay <= 30
    )
  }
  return isRealDateString(item.targetDate)
}

function isListEnvelope(raw) {
  if (Array.isArray(raw)) return true
  if (typeof raw === 'string') {
    if (!raw) return false
    try {
      raw = JSON.parse(raw)
    } catch (err) {
      return false
    }
  }
  return Array.isArray(raw) || Boolean(raw && Array.isArray(raw.list))
}

function readStorage(key) {
  try {
    return uni.getStorageSync(key)
  } catch (err) {
    console.error('[storage] 读取缓存失败', err)
    return ''
  }
}

// 导入数据来自外部剪贴板，必须逐条校验，避免脏数据进入列表
export function sanitizeEvents(raw) {
  return normalizeList(raw)
    .filter(item => item && typeof item === 'object')
    .map(normalizeEvent)
    .filter(isUsableEvent)
}

export function loadEvents() {
  const rawCurrent = readStorage(KEY)
  const currentList = normalizeList(rawCurrent)
  const current = currentList
    .filter(item => item && typeof item === 'object')
    .map(normalizeEvent)
    .filter(isUsableEvent)
  if (current.length) return current

  // 当前数据是合法空列表时，说明用户主动清空，不能再回退旧 key
  if (!currentList.length && isListEnvelope(rawCurrent)) return []

  const legacy = normalizeList(readStorage(LEGACY_KEY))
    .filter(item => item && typeof item === 'object')
    .map(normalizeEvent)
    .filter(isUsableEvent)
  if (!legacy.length) return []

  // 只有新数据写入成功后才删除旧 key，避免存储失败导致数据丢失
  if (saveEvents(legacy)) {
    try {
      uni.removeStorageSync(LEGACY_KEY)
    } catch (err) {
      console.error('[storage] 清理旧缓存失败', err)
    }
  }
  return legacy
}

export function saveEvents(list) {
  try {
    uni.setStorageSync(KEY, { version: VERSION, list })
    return true
  } catch (err) {
    console.error('[storage] 保存失败', err)
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
    return false
  }
}
