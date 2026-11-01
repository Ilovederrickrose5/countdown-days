import { nextReminderAt, reminderMessage } from '@/utils/reminder'

const SCHEDULE_KEY = 'countdown_reminder_schedule'
const H5_MAX_DELAY = 6 * 60 * 60 * 1000

let h5Timer = null

// #ifdef APP-PLUS
function scheduleApp(events, now = new Date()) {
  if (typeof plus === 'undefined' || !plus.push) return
  if (typeof plus.push.createMessage !== 'function') return

  const entries = events
    .map(event => {
      const at = nextReminderAt(event, now)
      return at ? { id: event.id, at, title: event.title } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.at - b.at || String(a.id).localeCompare(String(b.id)))

  // 提醒集合没变就不重复调度，避免每次回首页都清空通知
  const signature = JSON.stringify(entries)
  if (uni.getStorageSync(SCHEDULE_KEY) === signature) return

  try {
    if (typeof plus.push.clear === 'function') plus.push.clear()
  } catch (err) {
    console.error('[reminder] 清理旧通知失败', err)
  }

  try {
    entries.forEach(entry => {
      const event = events.find(item => item.id === entry.id)
      if (!event) return
      const delay = Math.max(1, Math.round((entry.at - now.getTime()) / 1000))
      const message = reminderMessage(event)
      plus.push.createMessage(
        message.content,
        JSON.stringify({ type: 'reminder', eventId: event.id }),
        {
          title: message.title,
          delay
        }
      )
    })
    uni.setStorageSync(SCHEDULE_KEY, signature)
  } catch (err) {
    console.error('[reminder] 调度本地通知失败', err)
  }
}
// #endif

// #ifdef H5
function clearH5Timer() {
  if (h5Timer) {
    clearTimeout(h5Timer)
    h5Timer = null
  }
}

// H5 没有后台调度，只在页面打开期间用定时器提醒
function scheduleH5(events, onDue) {
  clearH5Timer()

  const now = Date.now()
  let earliest = null
  events.forEach(event => {
    const at = nextReminderAt(event, new Date(now))
    if (at && (!earliest || at < earliest.at)) earliest = { event, at }
  })
  if (!earliest) return

  const delay = Math.max(1000, Math.min(earliest.at - now, H5_MAX_DELAY))
  h5Timer = setTimeout(() => {
    h5Timer = null
    if (Date.now() >= earliest.at && typeof onDue === 'function') onDue(earliest.event)
    scheduleH5(events, onDue)
  }, delay)
}
// #endif

export function useReminders() {
  return {
    syncAll(events, onDue) {
      // #ifdef APP-PLUS
      scheduleApp(events)
      // #endif
      // #ifdef H5
      scheduleH5(events, onDue)
      // #endif
    },
    syncApp(events) {
      // #ifdef APP-PLUS
      scheduleApp(events)
      // #endif
    },
    stop() {
      // #ifdef H5
      clearH5Timer()
      // #endif
    }
  }
}
