const DAY_MS = 86400000
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function parseDateString(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
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
  const { y, m, d } = parseDateString(dateStr)
  return weekdayOfUTC(utcOf(y, m, d))
}

export function todayString() {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

// 每年重复的事件解析到“下一次发生”的日期
export function resolveTargetUTC(event, now = new Date()) {
  const { y, m, d } = parseDateString(event.targetDate)
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
  const diff = Math.round((target - today) / DAY_MS)
  const date = formatUTC(target)
  const weekday = weekdayOfUTC(target)

  if (event.type === 'count-up') {
    if (diff > 0) {
      return { date, weekday, status: 'future', tag: '还有', unit: '天', days: diff }
    }
    // 起始日算第 1 天
    return {
      date,
      weekday,
      status: diff === 0 ? 'start' : 'elapsed',
      tag: '第',
      unit: '天',
      days: 1 - diff
    }
  }

  if (diff > 0) {
    return { date, weekday, status: 'future', tag: '还有', unit: '天', days: diff }
  }
  if (diff === 0) {
    return { date, weekday, status: 'today', tag: '就是今天', unit: '', days: 0 }
  }
  return { date, weekday, status: 'past', tag: '已过', unit: '天', days: -diff }
}

export function sortRank(status) {
  if (status === 'today' || status === 'start') return 0
  if (status === 'future') return 1
  if (status === 'past') return 2
  return 3
}
