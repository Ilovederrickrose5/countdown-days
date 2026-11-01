<template>
  <view class="page">
    <view
      v-if="item"
      class="hero"
      :style="{ borderTopColor: item.color }"
    >
      <text v-if="view.status !== 'today'" class="hero-tag">{{ view.tag }}</text>
      <view class="hero-days">
        <text
          class="hero-value"
          :class="{ 'is-today': view.status === 'today', 'is-past': view.status === 'past' }"
          :style="accentStyle"
        >
          {{ view.status === 'today' ? '今天' : view.days }}
        </text>
        <text v-if="view.unit" class="hero-unit">{{ view.unit }}</text>
      </view>
      <text class="hero-title">{{ item.title }}</text>
      <text class="hero-date">{{ view.date }} {{ view.weekday }}</text>
      <view class="hero-badges">
        <text class="badge">{{ typeText }}</text>
        <text v-if="item.calendar === 'lunar'" class="badge">农历</text>
        <text v-if="item.repeat === 'yearly'" class="badge">每年重复</text>
        <text v-if="item.pinned" class="badge pin">已置顶</text>
      </view>
    </view>

    <view v-if="item" class="section">
      <view class="info-row">
        <text class="info-label">{{ primaryDateLabel }}</text>
        <text v-if="item.calendar === 'lunar'" class="info-value">农历{{ view.lunarText }}</text>
        <text v-else class="info-value">{{ item.targetDate }} {{ weekdayOfDateString(item.targetDate) }}</text>
      </view>
      <view v-if="item.repeat === 'yearly'" class="info-row">
        <text class="info-label">下次日期</text>
        <text class="info-value">{{ view.date }} {{ view.weekday }}</text>
      </view>
      <view v-if="item.calendar !== 'lunar' && view.lunarText" class="info-row">
        <text class="info-label">农历</text>
        <text class="info-value">农历{{ view.lunarText }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">类型</text>
        <text class="info-value">{{ typeText }}</text>
      </view>
      <!-- 小程序暂不支持提醒投递，隐藏提醒信息，避免误导 -->
      <!-- #ifndef MP -->
      <view v-if="item.reminderDays != null" class="info-row">
        <text class="info-label">提醒</text>
        <text class="info-value">{{ reminderText }}</text>
      </view>
      <!-- #endif -->
      <view v-if="item.note" class="info-row">
        <text class="info-label">备注</text>
        <text class="info-value note-text">{{ item.note }}</text>
      </view>
    </view>

    <view v-if="item" class="footer">
      <view class="btn ghost" @click="onPin">{{ item.pinned ? '取消置顶' : '置顶' }}</view>
      <view class="btn primary" @click="edit">编辑</view>
      <view class="btn ghost danger" @click="confirmDelete">删除</view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useEvents } from '@/composables/useEvents'
import { useReminders } from '@/composables/useReminders'
import { weekdayOfDateString } from '@/utils/date'
import { formatReminderAt, nextReminderAt } from '@/utils/reminder'

const { list, reload, togglePin, removeEvent, snapshot } = useEvents()
const { syncApp } = useReminders()

const id = ref('')
const leaving = ref(false)
const ready = ref(false)

const item = computed(() => list.value.find(it => it.id === id.value) || null)
const view = computed(() => (item.value ? item.value.view : null))
const typeText = computed(() => (item.value && item.value.type === 'count-up' ? '纪念日' : '倒数日'))
const primaryDateLabel = computed(() => {
  if (!item.value) return '日期'
  if (item.value.calendar === 'lunar') return '农历日期'
  return item.value.repeat === 'yearly' ? '原始日期' : '日期'
})
const reminderText = computed(() => {
  if (!item.value || item.value.reminderDays == null) return ''
  const days = Number(item.value.reminderDays)
  const when = days === 0 ? '当天' : `提前 ${days} 天`
  const at = nextReminderAt(item.value)
  const next = at ? ` · 下次 ${formatReminderAt(at)}` : ''
  return `${when} ${item.value.reminderTime || '09:00'}${next}`
})
const accentStyle = computed(() => {
  if (!item.value) return {}
  const status = item.value.view.status
  return status === 'today' || status === 'past' ? {} : { color: item.value.color }
})

onLoad(options => {
  id.value = options && options.id ? decodeURIComponent(options.id) : ''
})

onShow(() => {
  if (leaving.value) return
  if (!id.value) return goBack()

  reload()
  if (!item.value) {
    // 从编辑页删除后返回时静默退出，仅首次进入无效 id 才提示
    if (!ready.value) {
      uni.showToast({ title: '记录不存在', icon: 'none' })
      setTimeout(goBack, 500)
    } else {
      goBack()
    }
    return
  }
  ready.value = true
  uni.setNavigationBarTitle({ title: item.value.title })
})

function edit() {
  if (!item.value) return
  uni.navigateTo({ url: `/pages/edit/edit?id=${encodeURIComponent(item.value.id)}` })
}

function onPin() {
  if (!item.value) return
  const pinned = !item.value.pinned
  togglePin(item.value.id)
  uni.showToast({ title: pinned ? '已置顶' : '已取消置顶', icon: 'none' })
}

function confirmDelete() {
  if (!item.value) return
  const current = item.value
  uni.showModal({
    title: '删除纪念日',
    content: `确定删除「${current.title}」吗？`,
    confirmText: '删除',
    confirmColor: '#e5484d',
    success: res => {
      if (!res.confirm) return
      removeEvent(current.id)
      syncApp(snapshot())
      uni.showToast({ title: '已删除', icon: 'none' })
      setTimeout(goBack, 300)
    }
  })
}

function goBack() {
  leaving.value = true
  uni.navigateBack({
    fail: () => uni.reLaunch({ url: '/pages/index/index' })
  })
}
</script>

<style scoped lang="scss">
.page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 28rpx 32rpx 200rpx;
  padding-bottom: calc(200rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(200rpx + env(safe-area-inset-bottom));
  background: $app-bg;
}

.hero {
  padding: 44rpx 36rpx 40rpx;
  background: $app-card;
  border-top: 8rpx solid $app-primary;
  border-radius: $app-radius;
  box-shadow: 0 6rpx 20rpx rgba(31, 36, 48, 0.04);
}

.hero-tag {
  display: block;
  font-size: 26rpx;
  color: $app-text-secondary;
}

.hero-days {
  display: flex;
  align-items: baseline;
  margin-top: 8rpx;
}

.hero-value {
  font-size: 120rpx;
  font-weight: 800;
  line-height: 1.05;
  color: $app-text;
}

.hero-value.is-today {
  font-size: 96rpx;
  color: $app-success;
}

.hero-value.is-past {
  color: #9aa0ad;
}

.hero-unit {
  margin-left: 10rpx;
  font-size: 30rpx;
  color: $app-text-secondary;
}

.hero-title {
  display: block;
  margin-top: 20rpx;
  font-size: 36rpx;
  font-weight: 600;
  color: $app-text;
}

.hero-date {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  color: $app-text-secondary;
}

.hero-badges {
  display: flex;
  flex-wrap: wrap;
  margin-top: 22rpx;
}

.badge {
  padding: 4rpx 14rpx;
  margin-right: 10rpx;
  font-size: 22rpx;
  color: $app-text-secondary;
  background: #f0f2f6;
  border-radius: 8rpx;
}

.badge.pin {
  color: $app-primary;
  background: rgba(91, 141, 239, 0.12);
}

.section {
  padding: 8rpx 30rpx;
  margin-top: 20rpx;
  background: $app-card;
  border-radius: $app-radius;
}

.info-row {
  display: flex;
  align-items: flex-start;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f1f5;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  flex-shrink: 0;
  width: 150rpx;
  font-size: 26rpx;
  color: $app-text-secondary;
}

.info-value {
  flex: 1;
  font-size: 28rpx;
  line-height: 1.5;
  color: $app-text;
}

.note-text {
  white-space: pre-wrap;
  word-break: break-all;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(244, 245, 249, 0.96);
}

.btn {
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  font-size: 28rpx;
  border-radius: 16rpx;
}

.btn.ghost {
  width: 168rpx;
  color: $app-text-secondary;
  background: $app-card;
}

.btn.ghost.danger {
  color: $app-danger;
}

.btn.primary {
  flex: 1;
  margin: 0 20rpx;
  font-weight: 600;
  color: #fff;
  background: $app-primary;
  box-shadow: 0 10rpx 24rpx rgba(91, 141, 239, 0.28);
}
</style>
