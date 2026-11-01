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
      <view class="header-tools" @click="openTools">
        <text class="header-dots">···</text>
      </view>
    </view>

    <view v-if="list.length" class="filters">
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

    <view class="list">
      <EventCard
        v-for="item in visibleList"
        :key="item.id"
        :event="item"
        @select="handleTap"
        @menu="handleMore"
      />

      <view v-if="list.length === 0" class="empty">
        <view class="empty-circle"><text class="empty-plus">+</text></view>
        <text class="empty-title">还没有纪念日</text>
        <text class="empty-desc">把值得记住的日子留在这里</text>
        <view class="empty-btn" @click="navigateToCreate">添加第一个纪念日</view>
      </view>

      <view v-else-if="visibleList.length === 0" class="empty compact">
        <text class="empty-title">这个分类下还没有记录</text>
        <text class="empty-desc">切换筛选看看其他日子</text>
      </view>
    </view>

    <view class="fab" @click="navigateToCreate">
      <text class="fab-plus">+</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { useEvents } from '@/composables/useEvents'
import { useReminders } from '@/composables/useReminders'
import { reminderMessage } from '@/utils/reminder'
import { sanitizeEvents } from '@/utils/storage'
import EventCard from '@/components/EventCard.vue'

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'countdown', label: '倒数日' },
  { key: 'count-up', label: '纪念日' },
  { key: 'past', label: '已过去' }
]

const { list, reload, refresh, togglePin, removeEvent, snapshot, mergeEvents } = useEvents()
const { syncAll, stop } = useReminders()

const filter = ref('all')

const summary = computed(() => {
  const count = list.value.length
  if (!count) return '记录你想留住的日子'
  const todayCount = list.value.filter(
    item => item.view.status === 'today' || item.view.status === 'start'
  ).length
  return todayCount ? `共 ${count} 个日子 · 今天有 ${todayCount} 个` : `共 ${count} 个日子`
})

const visibleList = computed(() => {
  if (filter.value === 'all') return list.value
  if (filter.value === 'past') return list.value.filter(item => item.view.status === 'past')
  return list.value.filter(item => item.type === filter.value)
})

let ticker = null
let lastDay = ''

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
  if (!list.value.length) filter.value = 'all'
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

function openTools() {
  uni.showActionSheet({
    itemList: ['导出数据', '导入数据', '关于与隐私'],
    success: res => {
      if (res.tapIndex === 0) exportData()
      else if (res.tapIndex === 1) importData()
      else if (res.tapIndex === 2) navigateToAbout()
    }
  })
}

function navigateToAbout() {
  uni.navigateTo({ url: '/pages/about/about' })
}

function exportData() {
  const items = snapshot()
  if (!items.length) return toast('还没有可导出的记录')

  const payload = {
    app: 'countdown-days',
    version: 1,
    exportedAt: new Date().toISOString(),
    list: items
  }
  uni.setClipboardData({
    data: JSON.stringify(payload),
    success: () => toast(`已复制 ${items.length} 条记录到剪贴板`),
    fail: () => toast('复制失败，请重试')
  })
}

function importData() {
  uni.getClipboardData({
    success: res => {
      const incoming = parseImport(res.data)
      if (incoming) confirmImport(incoming)
    },
    fail: () => toast('读取剪贴板失败，请检查权限')
  })
}

function parseImport(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    toast('剪贴板中没有可识别的数据')
    return null
  }

  const raw = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.list) ? parsed.list : null
  if (!raw) {
    toast('剪贴板中没有可识别的数据')
    return null
  }

  const incoming = sanitizeEvents(raw)
  if (!incoming.length) {
    toast('数据中没有有效的纪念日')
    return null
  }
  return incoming
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

function handleTap(item) {
  navigateToDetail(item)
}

function handleMore(item) {
  uni.showActionSheet({
    itemList: [item.pinned ? '取消置顶' : '置顶', '编辑', '删除'],
    success: res => {
      if (res.tapIndex === 0) {
        togglePin(item.id)
        uni.showToast({ title: item.pinned ? '已取消置顶' : '已置顶', icon: 'none' })
      } else if (res.tapIndex === 1) {
        navigateToEdit(item)
      } else if (res.tapIndex === 2) {
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

.list {
  padding: 0 32rpx;
}

.empty.compact {
  padding: 80rpx 0 30rpx;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0 40rpx;
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
  margin-top: 40rpx;
  padding: 20rpx 48rpx;
  font-size: 28rpx;
  color: #fff;
  background: $app-primary;
  border-radius: 999rpx;
  box-shadow: 0 8rpx 20rpx rgba(91, 141, 239, 0.25);
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

.fab-plus {
  font-size: 64rpx;
  font-weight: 300;
  color: #fff;
  line-height: 1;
  margin-top: -8rpx;
}
</style>
