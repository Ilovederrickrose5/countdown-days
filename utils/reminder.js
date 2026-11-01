import { lunarToSolar, solarToLunar } from './lunar.js'

export const REMINDER_OPTIONS = [
  { value: null, label: '不提醒' },
  { value: 0, label: '当天' },
  { value: 1, label: '提前 1 天' },
  { value: 3, label: '提前 3 天' },
  { value: 7, label: '提前 7 天' }
]

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function pad(value) {
  return String(value).padStart(2, '0')
}

function parseDate(dateStr) {
  const match = DATE_PATTERN.exec(String(dateStr))
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

function localDateString(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function isValidReminderTime(value) {
  return typeof value === 'string' && TIME_PATTERN.test(value)
}

// 公历每年重复时，2 月 29 日在平年收敛到 2 月 28 日
function occurrenceInSolarYear(year, month, day) {
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${pad(month)}-${pad(Math.min(day, lastDay))}`
}

function reminderMoment(dateStr, daysBefore, time) {
  const date = parseDate(dateStr)
  if (!date) return null
  const [hour, minute] = time.split(':').map(Number)
  // 用本地时间构造，提醒时间就是用户所在时区的墙上时间
  const moment = new Date(date.year, date.month - 1, date.day - daysBefore, hour, minute, 0, 0)
  return Number.isNaN(moment.getTime()) ? null : moment
}

// 返回下一次真正会触发的提醒时间戳；已过时间的一次性提醒返回 null
export function nextReminderAt(event, now = new Date()) {
  if (!event || event.type !== 'countdown') return null
  if (event.reminderDays === null || event.reminderDays === undefined) return null

  const daysBefore = Number(event.reminderDays)
  if (!Number.isInteger(daysBefore)) return null
  if (!REMINDER_OPTIONS.some(option => option.value === daysBefore)) return null
  if (!isValidReminderTime(event.reminderTime)) return null

  const nowMs = now.getTime()

  if (event.repeat === 'yearly') {
    if (event.calendar === 'lunar') {
      const month = Number(event.lunarMonth)
      const day = Number(event.lunarDay)
      if (!Number.isInteger(month) || month < 1 || month > 12) return null
      if (!Number.isInteger(day) || day < 1 || day > 30) return null

      const current = solarToLunar(localDateString(now))
      if (!current) return null

      for (let year = current.year; year <= current.year + 3; year++) {
        const solar = lunarToSolar(year, month, day, false)
        if (!solar) continue
        const moment = reminderMoment(solar, daysBefore, event.reminderTime)
        if (moment && moment.getTime() > nowMs) return moment.getTime()
      }
      return null
    }

    const target = parseDate(event.targetDate)
    if (!target) return null

    for (let year = now.getFullYear(); year <= now.getFullYear() + 2; year++) {
      const moment = reminderMoment(
        occurrenceInSolarYear(year, target.month, target.day),
        daysBefore,
        event.reminderTime
      )
      if (moment && moment.getTime() > nowMs) return moment.getTime()
    }
    return null
  }

  const moment = reminderMoment(event.targetDate, daysBefore, event.reminderTime)
  return moment && moment.getTime() > nowMs ? moment.getTime() : null
}

export function formatReminderAt(timestamp) {
  if (!Number.isFinite(timestamp)) return ''
  const date = new Date(timestamp)
  return `${localDateString(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function reminderMessage(event) {
  const title = event && event.title ? event.title : '纪念日'
  const days = Number(event && event.reminderDays)
  let content
  if (days === 0) content = `「${title}」就是今天`
  else if (days > 0) content = `「${title}」还有 ${days} 天`
  else content = `「${title}」别忘了`
  return { title: '纪念日提醒', content }
}
