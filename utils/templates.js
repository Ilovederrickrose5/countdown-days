import { nextLunarSolarDate } from './lunar.js'
import { todayString } from './date.js'

function addDays(dateStr, days) {
  const parts = String(dateStr).split('-').map(Number)
  if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) return dateStr
  const date = new Date(parts[0], parts[1] - 1, parts[2] + days)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export const TEMPLATES = [
  {
    key: 'birthday',
    title: '生日',
    desc: '每年提醒的重要日子',
    accent: '#f2668b',
    form: {
      title: '我的生日',
      type: 'countdown',
      repeat: 'yearly',
      calendar: 'solar',
      color: '#f2668b',
      tags: ['生日']
    }
  },
  {
    key: 'anniversary',
    title: '纪念日',
    desc: '在一起的第几天',
    accent: '#e5484d',
    form: {
      title: '在一起',
      type: 'count-up',
      repeat: 'none',
      calendar: 'solar',
      color: '#e5484d',
      tags: ['纪念']
    }
  },
  {
    key: 'exam',
    title: '考试',
    desc: '重要考试倒计时',
    accent: '#5b8def',
    form: {
      title: '考试',
      type: 'countdown',
      repeat: 'none',
      calendar: 'solar',
      color: '#5b8def',
      offsetDays: 30,
      tags: ['考试']
    }
  },
  {
    key: 'travel',
    title: '旅行',
    desc: '出发倒计时',
    accent: '#38bdf8',
    form: {
      title: '旅行出发',
      type: 'countdown',
      repeat: 'none',
      calendar: 'solar',
      color: '#38bdf8',
      offsetDays: 30,
      tags: ['旅行']
    }
  },
  {
    key: 'spring',
    title: '春节',
    desc: '农历传统节日',
    accent: '#f5a524',
    form: {
      title: '春节',
      type: 'countdown',
      repeat: 'yearly',
      calendar: 'lunar',
      lunarMonth: 1,
      lunarDay: 1,
      color: '#f5a524',
      tags: ['节日']
    }
  }
]

export function getTemplate(key) {
  return TEMPLATES.find(item => item.key === key) || null
}

export function templateForm(key) {
  const template = getTemplate(key)
  if (!template) return null

  const form = { ...template.form }
  if (form.offsetDays) {
    form.targetDate = addDays(todayString(), form.offsetDays)
    delete form.offsetDays
  }
  if (form.calendar === 'lunar' && form.lunarMonth && form.lunarDay) {
    form.targetDate = nextLunarSolarDate(form.lunarMonth, form.lunarDay) || todayString()
  }
  return form
}
