<template>
  <view class="page">
    <view class="status-bar"></view>
    <!-- #ifdef MP-WEIXIN -->
    <view class="weixin-nav"></view>
    <!-- #endif -->

    <view class="header">
      <view class="header-main">
        <text class="title">时光倒数</text>
        <text class="subtitle">{{ summary }}</text>
      </view>
      <view class="header-tools" hover-class="tool-hover" @click="openTools">
        <text class="header-dots">···</text>
      </view>
    </view>

    <template v-if="list.length">
      <view class="search-row">
        <view class="search-box">
          <view class="search-icon"></view>
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索名称、备注或标签"
            placeholder-class="placeholder"
            confirm-type="search"
          />
          <text v-if="keyword" class="search-clear" @click="keyword = ''">×</text>
        </view>
        <view class="view-toggle">
          <view
            v-for="mode in VIEW_MODES"
            :key="mode.key"
            class="view-item"
            :class="{ active: viewMode === mode.key }"
            @click="viewMode = mode.key"
          >
            {{ mode.label }}
          </view>
        </view>
      </view>

      <view class="filters">
        <view
          v-for="item in FILTERS"
          :key="item.key"
          class="filter"
          :class="{ active: filter === item.key }"
          @click="filter = item.key"
        >
          {{ item.label }}
        </view>
      </view>

      <view v-if="allTags.length" class="tag-row">
        <view
          class="tag-chip"
          :class="{ active: !activeTag }"
          @click="activeTag = ''"
        >
          全部标签
        </view>
        <view
          v-for="tag in allTags"
          :key="tag"
          class="tag-chip"
          :class="{ active: activeTag === tag }"
          @click="activeTag = activeTag === tag ? '' : tag"
        >
          {{ tag }}
        </view>
      </view>

      <view v-if="viewMode === 'list'" class="list">
        <EventCard
          v-for="item in visibleList"
          :key="item.id"
          :event="item"
          @select="handleTap"
          @menu="handleMore"
        />
        <view v-if="!visibleList.length" class="empty compact">
          <text class="empty-title">没有匹配的记录</text>
          <text class="empty-desc">换个关键词或筛选条件试试</text>
        </view>
      </view>

      <MonthCalendar
        v-else-if="viewMode === 'calendar'"
        :events="visibleList"
        :selected-date="selectedDate"
        @pick="selectedDate = $event"
        @select="handleTap"
        @menu="handleMore"
      />

      <view v-else class="list">
        <view v-for="group in timelineGroups" :key="group.key" class="timeline-group">
          <view class="timeline-head">
            <text class="timeline-month">{{ group.label }}</text>
            <text class="timeline-count">{{ group.items.length }} 个</text>
          </view>
          <EventCard
            v-for="item in group.items"
            :key="item.id"
            :event="item"
            @select="handleTap"
            @menu="handleMore"
          />
        </view>
        <view v-if="!timelineGroups.length" class="empty compact">
          <text class="empty-title">没有匹配的记录</text>
          <text class="empty-desc">换个关键词或筛选条件试试</text>
        </view>
      </view>
    </template>

    <view v-else class="empty">
      <view class="empty-circle"><text class="empty-plus">+</text></view>
      <text class="empty-title">还没有纪念日</text>
      <text class="empty-desc">把值得记住的日子留在这里</text>
      <TemplateGrid @select="useTemplate" />
      <view class="empty-btn" hover-class="btn-hover" @click="navigateToCreate">
        自定义添加
      </view>
    </view>

    <view class="fab" hover-class="fab-hover" @click="navigateToCreate">
      <text class="fab-plus">+</text>
    </view>

    <GuideOverlay :visible="showGuide" @skip="finishGuide" @finish="finishGuide" />
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onShow, onHide, onUnload, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useEvents } from '@/composables/useEvents'
import { useReminders } from '@/composables/useReminders'
import { reminderMessage } from '@/utils/reminder'
import { buildExportPayload, parseImportText } from '@/utils/importExport'
import { consumeGuideRequest, hasSeenGuide, markGuideSeen } from '@/utils/onboarding'
import { todayString } from '@/utils/date'
import EventCard from '@/components/EventCard.vue'
import MonthCalendar from '@/components/MonthCalendar.vue'
import TemplateGrid from '@/components/TemplateGrid.vue'
import GuideOverlay from '@/components/GuideOverlay.vue'

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'countdown', label: '倒数日' },
  { key: 'count-up', label: '纪念日' },
  { key: 'past', label: '已过去' }
]

const VIEW_MODES = [
  { key: 'list', label: '列表' },
  { key: 'calendar', label: '日历' },
  { key: 'timeline', label: '时间轴' }
]

const { list, reload, refresh, togglePin, removeEvent, snapshot, mergeEvents } = useEvents()
const { syncAll, stop } = useReminders()

const filter = ref('all')
const activeTag = ref('')
const keyword = ref('')
const viewMode = ref('list')
const selectedDate = ref(todayString())
const showGuide = ref(false)

const summary = computed(() => {
  const count = list.value.length
  if (!count) return '记录你想留住的日子'
  const todayCount = list.value.filter(
    item => item.view.status === 'today' || item.view.status === 'start'
  ).length
  return todayCount ? `共 ${count} 个日子 · 今天有 ${todayCount} 个` : `共 ${count} 个日子`
})

const allTags = computed(() => {
  const tags = new Set()
  list.value.forEach(item => {
    const itemTags = item.tags || []
    itemTags.forEach(tag => tags.add(tag))
  })
  return Array.from(tags).slice(0, 12)
})

watch(allTags, tags => {
  if (activeTag.value && !tags.includes(activeTag.value)) activeTag.value = ''
})

const visibleList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return list.value.filter(item => {
    if (filter.value === 'past') {
      if (item.view.status !== 'past') return false
    } else if (filter.value !== 'all' && item.type !== filter.value) {
      return false
    }
    if (activeTag.value && !(item.tags || []).includes(activeTag.value)) return false
    if (!kw) return true
    const tags = Array.isArray(item.tags) ? item.tags.join(' ') : ''
    return `${item.title} ${item.note || ''} ${tags}`.toLowerCase().includes(kw)
  })
})

const timelineGroups = computed(() => {
  const sorted = [...visibleList.value].sort((a, b) => {
    if (a.view.date === b.view.date) return a.title.localeCompare(b.title, 'zh')
    return a.view.date.localeCompare(b.view.date)
  })
  const groups = []
  sorted.forEach(item => {
    const key = item.view.date ? item.view.date.slice(0, 7) : 'invalid'
    let group = groups.find(entry => entry.key === key)
    if (!group) {
      group = { key, label: formatMonthLabel(key), items: [] }
      groups.push(group)
    }
    group.items.push(item)
  })
  return groups
})

let ticker = null
let lastDay = ''

function formatMonthLabel(key) {
  if (key === 'invalid') return '日期异常'
  const [year, month] = key.split('-')
  return `${year}年${Number(month)}月`
}

function startTicker() {
  stopTicker()
  lastDay = new Date().toDateString()
  // 跨天时自动刷新天数，避免 App 挂在后台过夜后显示旧数据
  ticker = setInterval(() => {
    const day = new Date().toDateString()
    if (day !== lastDay) {
      lastDay = day
      refresh()
    }
  }, 30 * 1000)
}

function stopTicker() {
  if (ticker) {
    clearInterval(ticker)
    ticker = null
  }
}

onShow(() => {
  reload()
  if (!list.value.length) {
    filter.value = 'all'
    keyword.value = ''
    activeTag.value = ''
  }
  const guideRequested = consumeGuideRequest()
  if (guideRequested || (!list.value.length && !hasSeenGuide())) showGuide.value = true
  startTicker()
  syncAll(list.value, notifyDue)
})

onHide(() => {
  stopTicker()
  stop()
})

onUnload(() => {
  stopTicker()
  stop()
})

onShareAppMessage(() => ({
  title: '时光倒数 · 记录值得记住的日子',
  path: '/pages/index/index'
}))

onShareTimeline(() => ({
  title: '时光倒数 · 记录值得记住的日子'
}))

function notifyDue(event) {
  const message = reminderMessage(event)
  uni.showModal({
    title: message.title,
    content: message.content,
    showCancel: false,
    confirmText: '知道了'
  })
  refresh()
}

function toast(title) {
  uni.showToast({ title, icon: 'none' })
}

function navigateToCreate() {
  uni.navigateTo({ url: '/pages/edit/edit' })
}

function useTemplate(key) {
  markGuideSeen()
  showGuide.value = false
  uni.navigateTo({ url: `/pages/edit/edit?template=${encodeURIComponent(key)}` })
}

function finishGuide() {
  showGuide.value = false
  markGuideSeen()
}

function openTools() {
  uni.showActionSheet({
    itemList: ['导出数据', '导入数据', '设置', '关于与隐私'],
    success: res => {
      if (res.tapIndex === 0) exportData()
      else if (res.tapIndex === 1) importData()
      else if (res.tapIndex === 2) navigateToSettings()
      else if (res.tapIndex === 3) navigateToAbout()
    }
  })
}

function navigateToSettings() {
  uni.navigateTo({ url: '/pages/settings/settings' })
}

function navigateToAbout() {
  uni.navigateTo({ url: '/pages/about/about' })
}

function exportData() {
  const items = snapshot()
  if (!items.length) return toast('还没有可导出的记录')

  uni.setClipboardData({
    data: JSON.stringify(buildExportPayload(items)),
    success: () => toast(`已复制 ${items.length} 条记录到剪贴板`),
    fail: () => toast('复制失败，请重试')
  })
}

function importData() {
  uni.getClipboardData({
    success: res => {
      const result = parseImportText(res.data)
      if (result.error) return toast(result.error)
      confirmImport(result.items)
    },
    fail: () => toast('读取剪贴板失败，请检查权限')
  })
}

function confirmImport(incoming) {
  uni.showModal({
    title: '导入数据',
    content: `将导入 ${incoming.length} 条记录，与现有 ${list.value.length} 条合并，相同记录会被更新。`,
    confirmText: '导入',
    success: res => {
      if (!res.confirm) return
      mergeEvents(incoming)
      refresh()
      syncAll(list.value, notifyDue)
      toast(`已导入 ${incoming.length} 条记录`)
    }
  })
}

function navigateToEdit(item) {
  uni.navigateTo({ url: `/pages/edit/edit?id=${encodeURIComponent(item.id)}` })
}

function navigateToDetail(item) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${encodeURIComponent(item.id)}` })
}

function navigateToShare(item) {
  uni.navigateTo({ url: `/pages/share/share?id=${encodeURIComponent(item.id)}` })
}

function handleTap(item) {
  navigateToDetail(item)
}

function handleMore(item) {
  uni.showActionSheet({
    itemList: [item.pinned ? '取消置顶' : '置顶', '编辑', '分享卡片', '删除'],
    success: res => {
      if (res.tapIndex === 0) {
        togglePin(item.id)
        uni.showToast({ title: item.pinned ? '已取消置顶' : '已置顶', icon: 'none' })
      } else if (res.tapIndex === 1) {
        navigateToEdit(item)
      } else if (res.tapIndex === 2) {
        navigateToShare(item)
      } else if (res.tapIndex === 3) {
        confirmDelete(item)
      }
    }
  })
}

function confirmDelete(item) {
  uni.showModal({
    title: '删除纪念日',
    content: `确定删除「${item.title}」吗？`,
    confirmText: '删除',
    confirmColor: '#e5484d',
    success: res => {
      if (!res.confirm) return
      removeEvent(item.id)
      if (!list.value.length) {
        filter.value = 'all'
        keyword.value = ''
        activeTag.value = ''
      } else if (
        activeTag.value &&
        !list.value.some(entry => (entry.tags || []).includes(activeTag.value))
      ) {
        activeTag.value = ''
      }
      syncAll(list.value, notifyDue)
      uni.showToast({ title: '已删除', icon: 'none' })
    }
  })
}
</script>

<style scoped lang="scss">
.page {
  box-sizing: border-box;
  min-height: 100vh;
  padding-bottom: calc(180rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #eef2fb 0%, $app-bg 360rpx);
}

.status-bar {
  height: var(--status-bar-height);
}

/* #ifdef H5 */
.status-bar {
  height: env(safe-area-inset-top);
}
/* #endif */

.weixin-nav {
  height: 44px;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 36rpx 32rpx 30rpx;
}

.header-main {
  flex: 1;
  min-width: 0;
}

.header-tools {
  width: 72rpx;
  height: 72rpx;
  margin-top: 4rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-hover {
  opacity: 0.55;
}

.header-dots {
  font-size: 40rpx;
  line-height: 1;
  letter-spacing: 2rpx;
  color: $app-text-secondary;
}

.title {
  display: block;
  font-size: 52rpx;
  font-weight: 700;
  color: $app-text;
}

.subtitle {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: $app-text-secondary;
}

.search-row {
  display: flex;
  align-items: center;
  padding: 0 32rpx 18rpx;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  height: 72rpx;
  padding: 0 22rpx;
  background: $app-card;
  border-radius: 999rpx;
  box-shadow: 0 4rpx 14rpx rgba(31, 36, 48, 0.04);
}

.search-icon {
  position: relative;
  flex-shrink: 0;
  width: 22rpx;
  height: 22rpx;
  margin-right: 14rpx;
  border: 3rpx solid #a6acb9;
  border-radius: 50%;
}

.search-icon::after {
  content: '';
  position: absolute;
  right: -8rpx;
  bottom: -2rpx;
  width: 10rpx;
  height: 3rpx;
  background: #a6acb9;
  border-radius: 2rpx;
  transform: rotate(45deg);
}

.search-input {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: $app-text;
}

.placeholder {
  color: #a6acb9;
}

.search-clear {
  padding: 0 4rpx 0 12rpx;
  font-size: 34rpx;
  line-height: 1;
  color: #b0b6c3;
}

.view-toggle {
  display: flex;
  flex-shrink: 0;
  margin-left: 14rpx;
  padding: 4rpx;
  background: #e9edf6;
  border-radius: 999rpx;
}

.view-item {
  padding: 10rpx 14rpx;
  font-size: 22rpx;
  color: $app-text-secondary;
  border-radius: 999rpx;
}

.view-item.active {
  color: #fff;
  background: $app-primary;
}

.filters {
  display: flex;
  padding: 0 32rpx 24rpx;
}

.filter {
  padding: 12rpx 26rpx;
  margin-right: 16rpx;
  font-size: 26rpx;
  color: $app-text-secondary;
  background: $app-card;
  border-radius: 999rpx;
  box-shadow: 0 4rpx 12rpx rgba(31, 36, 48, 0.04);
}

.filter.active {
  color: #fff;
  background: $app-primary;
  box-shadow: 0 6rpx 16rpx rgba(91, 141, 239, 0.28);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  padding: 0 32rpx 18rpx;
}

.tag-chip {
  padding: 8rpx 20rpx;
  margin: 0 12rpx 10rpx 0;
  font-size: 22rpx;
  color: $app-text-secondary;
  background: $app-card;
  border-radius: 999rpx;
}

.tag-chip.active {
  color: $app-primary;
  background: rgba(91, 141, 239, 0.12);
}

.list {
  padding: 0 32rpx;
}

.timeline-group {
  margin-bottom: 6rpx;
}

.timeline-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 8rpx 4rpx 16rpx;
}

.timeline-month {
  font-size: 28rpx;
  font-weight: 600;
  color: $app-text;
}

.timeline-count {
  font-size: 22rpx;
  color: $app-text-secondary;
}

.empty.compact {
  padding: 80rpx 0 30rpx;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 90rpx 32rpx 40rpx;
}

.empty-circle {
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #c3c9d6;
  border-radius: 50%;
  margin-bottom: 32rpx;
}

.empty-plus {
  font-size: 56rpx;
  font-weight: 300;
  color: #b0b6c3;
  line-height: 1;
  margin-top: -6rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $app-text;
}

.empty-desc {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: $app-text-secondary;
}

.empty-btn {
  margin-top: 28rpx;
  padding: 20rpx 48rpx;
  font-size: 28rpx;
  color: #fff;
  background: $app-primary;
  border-radius: 999rpx;
  box-shadow: 0 8rpx 20rpx rgba(91, 141, 239, 0.25);
}

.btn-hover {
  opacity: 0.86;
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: calc(48rpx + constant(safe-area-inset-bottom));
  bottom: calc(48rpx + env(safe-area-inset-bottom));
  width: 108rpx;
  height: 108rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $app-primary;
  border-radius: 50%;
  box-shadow: 0 12rpx 28rpx rgba(91, 141, 239, 0.35);
  z-index: 10;
}

.fab-hover {
  opacity: 0.9;
  transform: scale(0.96);
}

.fab-plus {
  font-size: 64rpx;
  font-weight: 300;
  color: #fff;
  line-height: 1;
  margin-top: -8rpx;
}
</style>
