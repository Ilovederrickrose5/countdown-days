<template>
  <view
    class="card"
    hover-class="card-hover"
    hover-stay-time="80"
    :style="{ borderLeftColor: event.color }"
    @click="$emit('tap', event)"
    @longpress="$emit('longpress', event)"
  >
    <view class="card-main">
      <view class="title-row">
        <text class="title">{{ event.title }}</text>
        <text v-if="event.pinned" class="badge pin">置顶</text>
        <text v-if="event.repeat === 'yearly'" class="badge">每年</text>
      </view>
      <text class="date">{{ event.view.date }} {{ event.view.weekday }}</text>
      <text v-if="event.note" class="note">{{ event.note }}</text>
    </view>

    <view class="days">
      <text class="days-tag">{{ event.view.tag }}</text>
      <view class="days-row">
        <text
          class="days-value"
          :class="`is-${event.view.status}`"
          :style="event.view.status === 'past' ? {} : { color: event.color }"
        >
          {{ event.view.status === 'today' ? '今天' : event.view.days }}
        </text>
        <text v-if="event.view.unit" class="days-unit">{{ event.view.unit }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
defineProps({
  event: {
    type: Object,
    required: true
  }
})

defineEmits(['tap', 'longpress'])
</script>

<style scoped lang="scss">
.card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 30rpx;
  margin-bottom: 20rpx;
  background: $app-card;
  border-left: 8rpx solid $app-primary;
  border-radius: $app-radius;
  box-shadow: 0 6rpx 20rpx rgba(31, 36, 48, 0.04);
}

.card-hover {
  background: #f9fafc;
}

.card-main {
  flex: 1;
  min-width: 0;
  padding-right: 20rpx;
}

.title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.title {
  font-size: 34rpx;
  font-weight: 600;
  color: $app-text;
  margin-right: 12rpx;
}

.badge {
  padding: 2rpx 12rpx;
  margin-right: 8rpx;
  font-size: 20rpx;
  color: $app-text-secondary;
  background: #f0f2f6;
  border-radius: 8rpx;
}

.badge.pin {
  color: $app-primary;
  background: rgba(91, 141, 239, 0.12);
}

.date {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: $app-text-secondary;
}

.note {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $app-text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.days {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.days-tag {
  font-size: 22rpx;
  color: $app-text-secondary;
}

.days-row {
  display: flex;
  align-items: baseline;
}

.days-value {
  font-size: 64rpx;
  font-weight: 700;
  line-height: 1.1;
}

.days-value.is-today {
  font-size: 44rpx;
  color: $app-success;
}

.days-value.is-past {
  color: #9aa0ad;
}

.days-unit {
  margin-left: 6rpx;
  font-size: 24rpx;
  color: $app-text-secondary;
}
</style>
