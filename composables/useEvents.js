import { computed, ref } from 'vue'
import { loadEvents, saveEvents } from '@/utils/storage'
import { getEventView, sortRank } from '@/utils/date'

// 模块级单例：首页和编辑页共享同一份数据
const events = ref([])
const now = ref(Date.now())
let initialized = false

function persist() {
  saveEvents(events.value)
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function useEvents() {
  if (!initialized) {
    reload()
    initialized = true
  }

  const list = computed(() =>
    events.value
      .map(item => ({ ...item, view: getEventView(item, new Date(now.value)) }))
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
        const rankDiff = sortRank(a.view.status) - sortRank(b.view.status)
        if (rankDiff !== 0) return rankDiff
        return a.view.days - b.view.days
      })
  )

  function reload() {
    events.value = loadEvents()
    now.value = Date.now()
  }

  function refresh() {
    now.value = Date.now()
  }

  function getById(id) {
    return events.value.find(item => item.id === id) || null
  }

  function addEvent(data) {
    const item = { ...data, id: makeId(), pinned: false, createdAt: Date.now() }
    events.value = [item, ...events.value]
    persist()
    return item
  }

  function updateEvent(id, data) {
    events.value = events.value.map(item => (item.id === id ? { ...item, ...data } : item))
    persist()
  }

  function removeEvent(id) {
    events.value = events.value.filter(item => item.id !== id)
    persist()
  }

  function togglePin(id) {
    events.value = events.value.map(item =>
      item.id === id ? { ...item, pinned: !item.pinned } : item
    )
    persist()
  }

  function snapshot() {
    return events.value.map(item => ({ ...item }))
  }

  function clearEvents() {
    events.value = []
    persist()
  }

  // 以 id 为键合并导入数据，重复记录用导入内容覆盖
  function mergeEvents(incoming) {
    const merged = new Map(events.value.map(item => [item.id, item]))
    incoming.forEach(item => merged.set(item.id, { ...merged.get(item.id), ...item }))
    events.value = Array.from(merged.values())
    persist()
  }

  return {
    list,
    reload,
    refresh,
    getById,
    addEvent,
    updateEvent,
    removeEvent,
    togglePin,
    snapshot,
    mergeEvents,
    clearEvents
  }
}
