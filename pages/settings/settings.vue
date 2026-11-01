<template>
  <view class="page">
    <view class="card">
      <text class="section-title">数据</text>
      <view class="row" hover-class="row-hover" @click="exportData">
        <view class="row-main">
          <text class="row-title">导出数据</text>
          <text class="row-desc">复制全部记录到剪贴板</text>
        </view>
        <text class="row-arrow">›</text>
      </view>
      <view class="row" hover-class="row-hover" @click="importData">
        <view class="row-main">
          <text class="row-title">导入数据</text>
          <text class="row-desc">从剪贴板合并记录</text>
        </view>
        <text class="row-arrow">›</text>
      </view>
      <view class="row" hover-class="row-hover" @click="clearData">
        <view class="row-main">
          <text class="row-title danger">清空所有数据</text>
          <text class="row-desc">仅删除本机缓存，操作不可撤销</text>
        </view>
        <text class="row-arrow">›</text>
      </view>
      <view class="row">
        <view class="row-main">
          <text class="row-title">当前记录</text>
          <text class="row-desc">共 {{ list.length }} 条，保存在本机</text>
        </view>
      </view>
    </view>

    <view class="card">
      <text class="section-title">提醒</text>
      <text class="paragraph">{{ reminderDesc }}</text>
      <!-- #ifdef MP-WEIXIN -->
      <text class="paragraph">微信小程序暂未接入订阅消息，提醒设置不会出现在小程序端。后续版本会单独说明。</text>
      <!-- #endif -->
    </view>

    <view class="card">
      <text class="section-title">关于</text>
      <view class="row" hover-class="row-hover" @click="openAbout">
        <view class="row-main">
          <text class="row-title">关于与隐私</text>
          <text class="row-desc">数据存储方式与权限说明</text>
        </view>
        <text class="row-arrow">›</text>
      </view>
      <view class="row" hover-class="row-hover" @click="replayGuide">
        <view class="row-main">
          <text class="row-title">重新查看新手引导</text>
          <text class="row-desc">下次打开首页时显示</text>
        </view>
        <text class="row-arrow">›</text>
      </view>
      <view class="row">
        <view class="row-main">
          <text class="row-title">版本</text>
          <text class="row-desc">{{ version }}</text>
        </view>
      </view>
    </view>

    <text class="footer">换设备或卸载前，请先导出数据备份。</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useEvents } from '@/composables/useEvents'
import { useReminders } from '@/composables/useReminders'
import { buildExportPayload, parseImportText } from '@/utils/importExport'
import { requestGuide, resetGuide } from '@/utils/onboarding'

const version = '1.0.0'

let platformLabel = 'H5'
// #ifdef APP-PLUS
platformLabel = 'App'
// #endif
// #ifdef MP-WEIXIN
platformLabel = '微信小程序'
// #endif

const reminderDesc = computed(
  () =>
    `当前端：${platformLabel}。App 支持本地通知；H5 仅在页面打开时提醒；微信小程序暂不支持提醒。`
)

const { list, reload, snapshot, mergeEvents, clearEvents } = useEvents()
const { syncApp } = useReminders()

onShow(() => {
  reload()
})

function toast(title) {
  uni.showToast({ title, icon: 'none' })
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

      uni.showModal({
        title: '导入数据',
        content: `将导入 ${result.items.length} 条记录，与现有 ${list.value.length} 条合并，相同记录会被更新。`,
        confirmText: '导入',
        success: modal => {
          if (!modal.confirm) return
          mergeEvents(result.items)
          reload()
          syncApp(snapshot())
          toast(`已导入 ${result.items.length} 条记录`)
        }
      })
    },
    fail: () => toast('读取剪贴板失败，请检查权限')
  })
}

function clearData() {
  uni.showModal({
    title: '清空所有数据',
    content: '将删除本机保存的全部记录，且无法恢复。建议先导出备份。',
    confirmText: '清空',
    confirmColor: '#e5484d',
    success: res => {
      if (!res.confirm) return
      clearEvents()
      syncApp([])
      toast('已清空')
    }
  })
}

function openAbout() {
  uni.navigateTo({ url: '/pages/about/about' })
}

function replayGuide() {
  resetGuide()
  requestGuide()
  toast('回到首页后显示新手引导')
}
</script>

<style scoped lang="scss">
.page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 28rpx 32rpx;
  padding-bottom: calc(40rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
  background: $app-bg;
}

.card {
  padding: 8rpx 30rpx;
  margin-bottom: 20rpx;
  background: $app-card;
  border-radius: $app-radius;
  box-shadow: 0 6rpx 20rpx rgba(31, 36, 48, 0.04);
}

.section-title {
  display: block;
  padding: 24rpx 0 12rpx;
  font-size: 26rpx;
  color: $app-text-secondary;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f1f5;
}

.row:last-child {
  border-bottom: none;
}

.row-hover {
  opacity: 0.7;
}

.row-main {
  flex: 1;
  min-width: 0;
}

.row-title {
  display: block;
  font-size: 28rpx;
  color: $app-text;
}

.row-title.danger {
  color: $app-danger;
}

.row-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 23rpx;
  color: $app-text-secondary;
}

.row-arrow {
  margin-left: 16rpx;
  font-size: 38rpx;
  color: #b0b6c3;
  line-height: 1;
}

.paragraph {
  display: block;
  padding-bottom: 14rpx;
  font-size: 25rpx;
  line-height: 1.65;
  color: $app-text-secondary;
}

.paragraph:last-child {
  padding-bottom: 24rpx;
}

.footer {
  display: block;
  padding: 18rpx 0 10rpx;
  text-align: center;
  font-size: 22rpx;
  color: $app-text-secondary;
}
</style>
