<template>
  <view class="templates">
    <view class="templates-head">
      <text class="templates-title">从模板开始</text>
      <text class="templates-desc">选一个，几秒就能添加</text>
    </view>
    <view class="template-grid">
      <view
        v-for="template in TEMPLATES"
        :key="template.key"
        class="template-card"
        hover-class="template-hover"
        :style="{ borderTopColor: template.accent }"
        @click="$emit('select', template.key)"
      >
        <text class="template-name">{{ template.title }}</text>
        <text class="template-desc">{{ template.desc }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { TEMPLATES } from '@/utils/templates'

defineEmits(['select'])
</script>

<style scoped lang="scss">
.templates {
  width: 100%;
  margin-top: 36rpx;
}

.templates-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.templates-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $app-text;
}

.templates-desc {
  font-size: 22rpx;
  color: $app-text-secondary;
}

.template-grid {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -8rpx;
}

.template-card {
  box-sizing: border-box;
  width: calc(50% - 16rpx);
  padding: 24rpx 24rpx 22rpx;
  margin: 0 8rpx 16rpx;
  background: $app-card;
  border-top: 6rpx solid $app-primary;
  border-radius: 18rpx;
  box-shadow: 0 6rpx 20rpx rgba(31, 36, 48, 0.04);
}

.template-hover {
  background: #f9fafc;
}

.template-name {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: $app-text;
}

.template-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $app-text-secondary;
}
</style>
