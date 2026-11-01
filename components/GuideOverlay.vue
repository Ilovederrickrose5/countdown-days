<template>
  <view v-if="visible" class="guide-mask" @touchmove.stop.prevent>
    <view class="guide-card">
      <view class="guide-dots">
        <view
          v-for="(item, index) in steps"
          :key="item.title"
          class="guide-dot"
          :class="{ active: step === index }"
        />
      </view>

      <view class="guide-visual" :class="`visual-${step}`">
        <view class="visual-circle big" />
        <view class="visual-circle small" />
        <view class="visual-card">
          <text class="visual-card-title">{{ visualTitle }}</text>
          <text class="visual-card-days">{{ visualDays }}</text>
          <text class="visual-card-unit">{{ visualUnit }}</text>
        </view>
      </view>

      <text class="guide-title">{{ steps[step].title }}</text>
      <text class="guide-desc">{{ steps[step].desc }}</text>

      <view class="guide-actions">
        <text class="guide-skip" @click="$emit('skip')">跳过</text>
        <view class="guide-next" hover-class="guide-next-hover" @click="next">
          {{ step === steps.length - 1 ? '开始使用' : '下一步' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['finish', 'skip'])

const steps = [
  {
    title: '把重要的日子留在这里',
    desc: '生日、纪念日、考试和旅行，都可以记录在一个地方。'
  },
  {
    title: '一眼看到还有多久',
    desc: '支持公历、农历和每年重复，打开就知道还有几天。'
  },
  {
    title: '从模板快速开始',
    desc: '选一个常用模板，填好名称和日期就能保存。'
  }
]

const step = ref(0)

const visualTitle = computed(() => {
  if (step.value === 0) return '妈妈生日'
  if (step.value === 1) return '在一起'
  return '旅行出发'
})

const visualDays = computed(() => {
  if (step.value === 0) return '12'
  if (step.value === 1) return '520'
  return '30'
})

const visualUnit = computed(() => (step.value === 1 ? '天' : '天后'))

watch(
  () => props.visible,
  visible => {
    if (visible) step.value = 0
  }
)

function next() {
  if (step.value < steps.length - 1) {
    step.value += 1
    return
  }
  emit('finish')
}
</script>

<style scoped lang="scss">
.guide-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  background: rgba(17, 20, 28, 0.62);
}

.guide-card {
  box-sizing: border-box;
  width: 100%;
  padding: 40rpx 40rpx 34rpx;
  background: $app-card;
  border-radius: 32rpx;
  box-shadow: 0 24rpx 80rpx rgba(0, 0, 0, 0.22);
}

.guide-dots {
  display: flex;
  justify-content: center;
  margin-bottom: 26rpx;
}

.guide-dot {
  width: 12rpx;
  height: 12rpx;
  margin: 0 6rpx;
  background: #dfe3eb;
  border-radius: 999rpx;
}

.guide-dot.active {
  width: 36rpx;
  background: $app-primary;
}

.guide-visual {
  position: relative;
  height: 280rpx;
  margin-bottom: 30rpx;
  overflow: hidden;
  background: linear-gradient(160deg, #eef2fb 0%, #f8f9fc 100%);
  border-radius: 24rpx;
}

.visual-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.5;
}

.visual-circle.big {
  top: -70rpx;
  right: -30rpx;
  width: 220rpx;
  height: 220rpx;
  background: rgba(91, 141, 239, 0.22);
}

.visual-circle.small {
  bottom: -50rpx;
  left: -30rpx;
  width: 160rpx;
  height: 160rpx;
  background: rgba(242, 102, 139, 0.18);
}

.visual-card {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 300rpx;
  padding: 24rpx 26rpx;
  background: $app-card;
  border-left: 8rpx solid $app-primary;
  border-radius: 18rpx;
  box-shadow: 0 12rpx 36rpx rgba(31, 36, 48, 0.12);
  transform: translate(-50%, -50%);
}

.visual-1 .visual-card {
  border-left-color: $app-success;
}

.visual-2 .visual-card {
  border-left-color: #38bdf8;
}

.visual-card-title {
  display: block;
  font-size: 26rpx;
  color: $app-text-secondary;
}

.visual-card-days {
  display: inline-block;
  margin-top: 4rpx;
  font-size: 72rpx;
  font-weight: 800;
  line-height: 1;
  color: $app-primary;
}

.visual-1 .visual-card-days {
  color: $app-success;
}

.visual-2 .visual-card-days {
  color: #38bdf8;
}

.visual-card-unit {
  margin-left: 8rpx;
  font-size: 22rpx;
  color: $app-text-secondary;
}

.guide-title {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
  color: $app-text;
}

.guide-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  line-height: 1.65;
  color: $app-text-secondary;
}

.guide-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 34rpx;
}

.guide-skip {
  padding: 18rpx 10rpx;
  font-size: 26rpx;
  color: $app-text-secondary;
}

.guide-next {
  min-width: 200rpx;
  padding: 20rpx 36rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
  background: $app-primary;
  border-radius: 999rpx;
  box-shadow: 0 8rpx 20rpx rgba(91, 141, 239, 0.28);
}

.guide-next-hover {
  opacity: 0.86;
}
</style>
