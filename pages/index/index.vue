<template>
  <view class="page">
    <view class="status-bar"></view>

    <view class="header">
      <text class="title">时光倒数</text>
      <text class="subtitle">{{ summary }}</text>
    </view>

    <view class="list">
      <EventCard
        v-for="item in list"
        :key="item.id"
        :event="item"
        @tap="handleTap"
        @longpress="handleLongPress"
      />

      <view v-if="list.length === 0" class="empty">
        <view class="empty-circle"><text class="empty-plus">+</text></view>
        <text class="empty-title">还没有纪念日</text>
        <text class="empty-desc">把值得记住的日子留在这里</text>
        <view class="empty-btn" @click="navigateToCreate">添加第一个纪念日</view>
      </view>
    </view>

    <view class="fab" @click="navigateToCreate">
      <text class="fab-plus">+</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { onShow, onHide, onUnload } from '@dcloudio/uni-app'
import { useEvents } from '@/composables/useEvents'
import EventCard from '@/components/EventCard.vue'

const { list, reload, refresh, togglePin, removeEvent } = useEvents()

const summary = computed(() => {
  const count = list.value.length
  if (!count) return '记录你想留住的日子'
  const todayCount = list.value.filter(
    item => item.view.status === 'today' || item.view.status === 'start'
  ).length
  return todayCount ? `共 ${count} 个日子 · 今天有 ${todayCount} 个` : `共 ${count} 个日子`
})

let ticker = null
let lastDay = ''
let suppressTap = false

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
  startTicker()
})

onHide(stopTicker)
onUnload(stopTicker)

function navigateToCreate() {
  uni.navigateTo({ url: '/pages/edit/edit' })
}

function navigateToEdit(item) {
  uni.navigateTo({ url: `/pages/edit/edit?id=${encodeURIComponent(item.id)}` })
}

function handleTap(item) {
  if (suppressTap) return
  navigateToEdit(item)
}

function handleLongPress(item) {
  suppressTap = true
  setTimeout(() => {
    suppressTap = false
  }, 500)

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
      uni.showToast({ title: '已删除', icon: 'none' })
    }
  })
}
</script>

<style scoped lang="scss">
.page {
  box-sizing: border-box;
  min-height: 100vh;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, #eef2fb 0%, $app-bg 360rpx);
}

.status-bar {
  height: var(--status-bar-height);
}

.header {
  padding: 36rpx 32rpx 30rpx;
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

.list {
  padding: 0 32rpx;
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
