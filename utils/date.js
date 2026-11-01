import { formatLunar, nextLunarSolarDate, solarToLunar } from './lunar.js'

const DAY_MS = 86400000
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function parseDateString(dateStr) {
  const parts = String(dateStr).split('-').map(Number)
  if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) return null
  const [y, m, d] = parts
  // 2101 只用于农历 2100 年末对应的公历兜底日期
  if (y < 1900 || y > 2101 || m < 1 || m > 12 || d < 1 || d > 31) return null
  return { y, m, d }
}

function todayUTC(now) {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
}

// 按 UTC 日期分量构造时间戳，避免本地时区/夏令时误差；2 月 29 日等非法日期收敛到当月最后一天
function utcOf(year, month, day) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return Date.UTC(year, month - 1, Math.min(day, lastDay))
}

export function formatUTC(ms) {
  const date = new Date(ms)
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function weekdayOfUTC(ms) {
  return WEEKDAYS[new Date(ms).getUTCDay()]
}

export function weekdayOfDateString(dateStr) {
  const parsed = parseDateString(dateStr)
  return parsed ? weekdayOfUTC(utcOf(parsed.y, parsed.m, parsed.d)) : ''
}

export function todayString() {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

// 每年重复的事件解析到“下一次发生”的日期
export function resolveTargetUTC(event, now = new Date()) {
  if (event.repeat === 'yearly' && event.type !== 'count-up' && event.calendar === 'lunar') {
    const solar = nextLunarSolarDate(event.lunarMonth, event.lunarDay, now)
    const parsedSolar = solar ? parseDateString(solar) : null
    if (parsedSolar) {
      return utcOf(parsedSolar.y, parsedSolar.m, parsedSolar.d)
    }
  }

  const parsed = parseDateString(event.targetDate)
  if (!parsed) return NaN
  const { y, m, d } = parsed
  if (event.repeat === 'yearly' && event.type !== 'count-up') {
    const today = todayUTC(now)
    const thisYear = utcOf(now.getFullYear(), m, d)
    return thisYear >= today ? thisYear : utcOf(now.getFullYear() + 1, m, d)
  }
  return utcOf(y, m, d)
}

// 返回卡片需要的展示数据，days 永远是“当前时刻”算出来的，不落库
export function getEventView(event, now = new Date()) {
  const today = todayUTC(now)
  const target = resolveTargetUTC(event, now)
  // 存储层已经过滤非法日期，这里只做兜底，避免脏数据把整页渲染成 NaN
  if (!Number.isFinite(target)) {
    return {
      date: '',
      weekday: '',
      lunarText: '',
      status: 'invalid',
      tag: '数据异常',
      unit: '',
      days: 0
    }
  }
  const diff = Math.round((target - today) / DAY_MS)
  const date = formatUTC(target)
  const weekday = weekdayOfUTC(target)
  // 农历事件展示用户选择的月/日；极少数“三十”落到 29 天的月份时，
  // 实际日期会收敛，但事件本身仍按选定的农历日期描述
  const lunarText =
    event.calendar === 'lunar' && event.lunarMonth && event.lunarDay
      ? formatLunar({ month: event.lunarMonth, day: event.lunarDay, isLeap: false })
      : formatLunar(solarToLunar(date))

  if (event.type === 'count-up') {
    if (diff > 0) {
      return { date, weekday, lunarText, status: 'future', tag: '还有', unit: '天', days: diff }
    }
    // 起始日算第 1 天
    return {
      date,
      weekday,
      lunarText,
      status: diff === 0 ? 'start' : 'elapsed',
      tag: '第',
      unit: '天',
      days: 1 - diff
    }
  }

  if (diff > 0) {
    return { date, weekday, lunarText, status: 'future', tag: '还有', unit: '天', days: diff }
  }
  if (diff === 0) {
    return { date, weekday, lunarText, status: 'today', tag: '就是今天', unit: '', days: 0 }
  }
  return { date, weekday, lunarText, status: 'past', tag: '已过', unit: '天', days: -diff }
}

export function sortRank(status) {
  if (status === 'today' || status === 'start') return 0
  if (status === 'future') return 1
  if (status === 'past') return 2
  return 3
}
