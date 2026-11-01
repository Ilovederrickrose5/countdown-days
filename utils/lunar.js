// 1900-2100 农历数据。低 4 位是闰月月份（0 表示无闰月），
// 0x10000 位表示闰月是大月，0x8000..0x10 依次表示 1..12 月是否为大月。
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520
]

const MIN_YEAR = 1900
const MAX_YEAR = 2100
const DAY_MS = 86400000
// 农历 1900 年正月初一对应公历 1900-01-31
const BASE_UTC = Date.UTC(1900, 0, 31)

export const LUNAR_MONTH_NAMES = [
  '正月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月'
]

export const LUNAR_DAY_NAMES = [
  '初一',
  '初二',
  '初三',
  '初四',
  '初五',
  '初六',
  '初七',
  '初八',
  '初九',
  '初十',
  '十一',
  '十二',
  '十三',
  '十四',
  '十五',
  '十六',
  '十七',
  '十八',
  '十九',
  '二十',
  '廿一',
  '廿二',
  '廿三',
  '廿四',
  '廿五',
  '廿六',
  '廿七',
  '廿八',
  '廿九',
  '三十'
]

function infoOf(year) {
  return LUNAR_INFO[year - MIN_YEAR]
}

export function leapMonthOf(year) {
  if (year < MIN_YEAR || year > MAX_YEAR) return 0
  return infoOf(year) & 0xf
}

function leapDaysOf(year) {
  const month = leapMonthOf(year)
  if (!month) return 0
  return infoOf(year) & 0x10000 ? 30 : 29
}

function monthDaysOf(year, month) {
  return infoOf(year) & (0x10000 >> month) ? 30 : 29
}

function yearDaysOf(year) {
  let days = 348
  for (let mask = 0x8000; mask > 0x8; mask >>= 1) {
    days += infoOf(year) & mask ? 1 : 0
  }
  return days + leapDaysOf(year)
}

function monthsOfYear(year) {
  const leap = leapMonthOf(year)
  const months = []
  for (let month = 1; month <= 12; month++) {
    months.push({ month, isLeap: false, days: monthDaysOf(year, month) })
    if (leap === month) {
      months.push({ month, isLeap: true, days: leapDaysOf(year) })
    }
  }
  return months
}

function formatUTC(ms) {
  const date = new Date(ms)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateString(dateStr) {
  const parts = String(dateStr).split('-').map(Number)
  if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) return null
  const [year, month, day] = parts
  const utc = Date.UTC(year, month - 1, day)
  const date = new Date(utc)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return { year, month, day, utc }
}

export function solarToLunar(dateStr) {
  const parsed = parseDateString(dateStr)
  if (!parsed || parsed.year < MIN_YEAR) return null

  let offset = Math.round((parsed.utc - BASE_UTC) / DAY_MS)
  if (offset < 0) return null

  let year = MIN_YEAR
  while (year <= MAX_YEAR) {
    const days = yearDaysOf(year)
    if (offset < days) break
    offset -= days
    year++
  }
  if (year > MAX_YEAR) return null

  let month = 1
  let isLeap = false
  for (const entry of monthsOfYear(year)) {
    if (offset < entry.days) {
      month = entry.month
      isLeap = entry.isLeap
      break
    }
    offset -= entry.days
  }

  return { year, month, day: offset + 1, isLeap }
}

export function lunarToSolar(year, month, day, isLeap = false) {
  if (year < MIN_YEAR || year > MAX_YEAR) return null
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  if (!Number.isInteger(day) || day < 1 || day > 30) return null
  if (isLeap && leapMonthOf(year) !== month) return null

  let offset = 0
  for (let y = MIN_YEAR; y < year; y++) offset += yearDaysOf(y)

  const leap = leapMonthOf(year)
  for (let m = 1; m < month; m++) {
    offset += monthDaysOf(year, m)
    if (leap === m) offset += leapDaysOf(year)
  }
  // 闰月排在对应普通月之后
  if (isLeap) offset += monthDaysOf(year, month)

  const days = isLeap ? leapDaysOf(year) : monthDaysOf(year, month)
  offset += Math.min(day, days) - 1
  return formatUTC(BASE_UTC + offset * DAY_MS)
}

export function formatLunar(lunar) {
  if (!lunar || lunar.month < 1 || lunar.month > 12 || lunar.day < 1 || lunar.day > 30) {
    return ''
  }
  const leap = lunar.isLeap ? '闰' : ''
  return `${leap}${LUNAR_MONTH_NAMES[lunar.month - 1]}${LUNAR_DAY_NAMES[lunar.day - 1]}`
}

export function formatLunarDate(dateStr) {
  return formatLunar(solarToLunar(dateStr))
}

// 找到从今天起、下一次出现的农历月/日对应公历日期（农历月按非闰月处理）
export function nextLunarSolarDate(month, day, now = new Date()) {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  if (!Number.isInteger(day) || day < 1 || day > 30) return null

  const today = formatUTC(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const current = solarToLunar(today)
  if (!current) return null

  for (let year = current.year; year <= current.year + 1; year++) {
    const solar = lunarToSolar(year, month, day, false)
    if (solar && solar >= today) return solar
  }
  return null
}
