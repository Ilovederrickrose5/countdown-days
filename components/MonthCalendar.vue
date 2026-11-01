<template>
  <view class="calendar">
    <view class="cal-head">
      <view class="cal-arrow" @click="shift(-1)">‹</view>
      <view class="cal-title-wrap" @click="goToday">
        <text class="cal-title">{{ cursorLabel }}</text>
        <text class="cal-sub">点击回到今天</text>
      </view>
      <view class="cal-arrow" @click="shift(1)">›</view>
    </view>

    <view class="cal-week">
      <text v-for="label in WEEK_LABELS" :key="label" class="cal-weekday">{{ label }}</text>
    </view>

    <view class="cal-grid">
      <view
        v-for="cell in cells"
        :key="cell.key"
        class="cal-cell"
        :class="{
          'is-empty': !cell.day,
          'is-today': cell.date === today,
          'is-selected': cell.date === selectedDate
        }"
        @click="pick(cell)"
      >
        <text v-if="cell.day" class="cal-day">{{ cell.day }}</text>
        <view v-if="cell.day" class="cal-dots">
          <view
            v-for="(dot, index) in cell.dots"
            :key="index"
            class="cal-dot"
            :style="{ backgroundColor: dot }"
          />
        </view>
      </view>
    </view>

    <view class="cal-meta">
      <text class="cal-count">{{ monthEventCount }} 个日子</text>
      <text class="cal-today" @click="goToday">回到今天</text>
    </view>

    <view class="cal-events">
      <text class="cal-events-title">{{ selectedLabel }}</text>
      <EventCard
        v-for="item in selectedEvents"
        :key="item.id"
        :event="item"
        @select="$emit('select', item)"
        @menu="$emit('menu', item)"
      />
      <view v-if="!selectedEvents.length" class="cal-empty">
        <text class="cal-empty-title">这天还没有安排</text>
        <text class="cal-empty-desc">点另一天看看，或回列表添加</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import EventCard from './EventCard.vue'
import { todayString } from '@/utils/date'

const props = defineProps({
  events: {
    type: Array,
    default: () => []
  },
  selectedDate: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['select', 'menu', 'pick'])

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const today = ref(todayString())

function pad(value) {
  return String(value).padStart(2, '0')
}

function monthOf(dateStr) {
  const parts = String(dateStr).split('-').map(Number)
  if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  }
  return new Date(parts[0], parts[1] - 1, 1)
}

const cursor = ref(monthOf(props.selectedDate || today.value))

watch(
  () => props.selectedDate,
  value => {
    const next = monthOf(value)
    if (next.getTime() !== cursor.value.getTime()) cursor.value = next
  }
)

// 首页跨天刷新时同步“今天”，避免日历高亮停在昨天
watch(
  () => props.events,
  () => {
    today.value = todayString()
  }
)

const cursorLabel = computed(
  () => `${cursor.value.getFullYear()}年${cursor.value.getMonth() + 1}月`
)

const monthKey = computed(
  () => `${cursor.value.getFullYear()}-${pad(cursor.value.getMonth() + 1)}`
)

const eventsByDate = computed(() => {
  const map = {}
  props.events.forEach(event => {
    const date = event.view && event.view.date
    if (!date) return
    if (!map[date]) map[date] = []
    map[date].push(event)
  })
  return map
})

const cells = computed(() => {
  const year = cursor.value.getFullYear()
  const month = cursor.value.getMonth()
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const result = []

  for (let index = 0; index < offset; index += 1) {
    result.push({ key: `pad-${index}`, day: null })
  }

  for (let day = 1; day <= days; day += 1) {
    const date = `${year}-${pad(month + 1)}-${pad(day)}`
    const items = eventsByDate.value[date] || []
    result.push({
      key: date,
      day,
      date,
      dots: items.slice(0, 3).map(item => item.color || '#5b8def')
    })
  }

  while (result.length < 42) {
    result.push({ key: `tail-${result.length}`, day: null })
  }
  return result
})

const monthEventCount = computed(
  () =>
    props.events.filter(
      item => item.view && item.view.date && item.view.date.startsWith(monthKey.value)
    ).length
)

const selectedEvents = computed(() => eventsByDate.value[props.selectedDate] || [])

const selectedLabel = computed(() => {
  if (!props.selectedDate) return '选择一天'
  const parts = props.selectedDate.split('-')
  if (parts.length !== 3) return '选择一天'
  const label = `${Number(parts[1])}月${Number(parts[2])}日`
  return props.selectedDate === today.value ? `今天 · ${label}` : label
})

function pick(cell) {
  if (!cell.date) return
  emit('pick', cell.date)
}

function shift(delta) {
  const next = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + delta, 1)
  cursor.value = next
  emit('pick', `${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`)
}

function goToday() {
  cursor.value = monthOf(today.value)
  emit('pick', today.value)
}
</script>

<style scoped lang="scss">
.calendar {
  padding: 24rpx 20rpx 8rpx;
  margin-bottom: 20rpx;
  background: $app-card;
  border-radius: $app-radius;
  box-shadow: 0 6rpx 20rpx rgba(31, 36, 48, 0.04);
}

.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8rpx 20rpx;
}

.cal-arrow {
  width: 64rpx;
  height: 64rpx;
  line-height: 60rpx;
  text-align: center;
  font-size: 42rpx;
  color: $app-text-secondary;
  background: #f5f6fa;
  border-radius: 50%;
}

.cal-title-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $app-text;
}

.cal-sub {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: $app-text-secondary;
}

.cal-week {
  display: flex;
  padding: 0 2rpx;
}

.cal-weekday {
  width: 14.2857%;
  text-align: center;
  font-size: 22rpx;
  color: $app-text-secondary;
}

.cal-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 10rpx 2rpx 0;
}

.cal-cell {
  box-sizing: border-box;
  width: 14.2857%;
  height: 88rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 12rpx;
  border-radius: 14rpx;
}

.cal-cell.is-empty {
  pointer-events: none;
}

.cal-cell.is-today .cal-day {
  color: $app-primary;
  font-weight: 700;
}

.cal-cell.is-selected {
  background: rgba(91, 141, 239, 0.1);
  box-shadow: inset 0 0 0 2rpx rgba(91, 141, 239, 0.35);
}

.cal-day {
  font-size: 26rpx;
  line-height: 1;
  color: $app-text;
}

.cal-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 14rpx;
  margin-top: 10rpx;
}

.cal-dot {
  width: 8rpx;
  height: 8rpx;
  margin: 0 2rpx;
  border-radius: 50%;
}

.cal-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 8rpx 22rpx;
  border-bottom: 1rpx solid #f0f1f5;
}

.cal-count {
  font-size: 22rpx;
  color: $app-text-secondary;
}

.cal-today {
  font-size: 22rpx;
  color: $app-primary;
}

.cal-events {
  padding-top: 24rpx;
}

.cal-events-title {
  display: block;
  margin-bottom: 18rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: $app-text;
}

.cal-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50rpx 0 40rpx;
}

.cal-empty-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $app-text;
}

.cal-empty-desc {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: $app-text-secondary;
}
</style>
