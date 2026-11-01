<template>
  <view class="page">
    <view class="card hero">
      <text class="app-name">时光倒数</text>
      <text class="version">版本 {{ version }}</text>
      <text class="desc">记录倒数日与纪念日，数据保存在本机。</text>
    </view>

    <view class="card">
      <text class="section-title">隐私说明</text>
      <text class="paragraph">
        本应用不收集、不上传你的个人信息和纪念日数据。所有记录仅保存在当前设备的本地缓存中。
      </text>
      <text class="paragraph">
        卸载应用、清除小程序缓存或更换设备后，数据可能丢失。建议定期使用首页右上角菜单中的“导出数据”备份。
      </text>
    </view>

    <view class="card">
      <text class="section-title">权限与用途</text>
      <text class="item">剪贴板：仅在你主动导入或导出数据时读写。</text>
      <text class="item">通知（仅 App）：用于本地提醒，拒绝后不影响记录功能。</text>
      <text class="item">本应用不接入广告、统计或第三方 SDK。</text>
    </view>

    <view class="card">
      <text class="section-title">提醒差异</text>
      <text class="item">App：在设定时间发送本地通知。</text>
      <text class="item">H5：仅在页面打开时提醒，无法后台通知。</text>
      <text class="item">微信小程序：暂不支持提醒，提醒设置已在当前端隐藏。</text>
    </view>

    <view class="card">
      <text class="section-title">联系我们</text>
      <text class="paragraph">
        如对本隐私说明有疑问，可通过微信公众平台「时光倒数」的开发者信息联系。
      </text>
    </view>

    <text class="footer">更新日期：2026-11-01</text>
  </view>
</template>

<script setup>
const version = '1.0.0'
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
  padding: 30rpx;
  margin-bottom: 20rpx;
  background: $app-card;
  border-radius: $app-radius;
  box-shadow: 0 6rpx 20rpx rgba(31, 36, 48, 0.04);
}

.hero {
  padding: 40rpx 36rpx;
}

.app-name {
  display: block;
  font-size: 42rpx;
  font-weight: 700;
  color: $app-text;
}

.version {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: $app-text-secondary;
}

.desc {
  display: block;
  margin-top: 24rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: $app-text-secondary;
}

.section-title {
  display: block;
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: $app-text;
}

.paragraph {
  display: block;
  margin-bottom: 14rpx;
  font-size: 27rpx;
  line-height: 1.7;
  color: $app-text-secondary;
}

.paragraph:last-child {
  margin-bottom: 0;
}

.item {
  display: block;
  margin-bottom: 12rpx;
  font-size: 27rpx;
  line-height: 1.7;
  color: $app-text-secondary;
}

.item:last-child {
  margin-bottom: 0;
}

.footer {
  display: block;
  padding: 20rpx 0 10rpx;
  text-align: center;
  font-size: 22rpx;
  color: $app-text-secondary;
}
</style>
