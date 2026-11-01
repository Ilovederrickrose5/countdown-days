<template>
  <view class="page">
    <template v-if="item">
      <view class="preview-wrap">
        <view class="canvas-box">
          <canvas
            canvas-id="shareCanvas"
            id="shareCanvas"
            class="share-canvas"
            :style="{ width: CANVAS_W + 'px', height: CANVAS_H + 'px' }"
          />
        </view>
      </view>
      <text class="tip">保存后可以发到聊天或朋友圈</text>
    </template>

    <view v-else class="empty">
      <text class="empty-title">记录不存在</text>
      <text class="empty-desc">可能已被删除</text>
    </view>

    <view v-if="item" class="footer">
      <view class="btn ghost" hover-class="btn-hover" @click="goBack">返回</view>
      <!-- #ifdef MP-WEIXIN -->
      <view class="btn ghost" hover-class="btn-hover" @click="shareToChat">分享图片</view>
      <!-- #endif -->
      <view
        class="btn primary"
        :class="{ disabled: saving }"
        hover-class="btn-hover"
        @click="saveImage"
      >
        {{ saving ? '生成中...' : '保存到相册' }}
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, getCurrentInstance, ref } from 'vue'
import { onLoad, onReady, onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'
import { useEvents } from '@/composables/useEvents'
import { todayString } from '@/utils/date'

const CANVAS_W = 600
const CANVAS_H = 800

const instance = getCurrentInstance()
const { list } = useEvents()

const id = ref('')
const saving = ref(false)
const previewPath = ref('')

const item = computed(() => list.value.find(event => event.id === id.value) || null)

const shareTitle = computed(() => {
  if (!item.value) return '时光倒数'
  const view = item.value.view
  if (view.status === 'invalid') return `${item.value.title} · 时光倒数`
  const summary = view.status === 'today' ? '就是今天' : `${view.tag}${view.days}${view.unit}`
  return `${item.value.title} · ${summary}`
})

onLoad(options => {
  id.value = options && options.id ? decodeURIComponent(options.id) : ''
})

onReady(() => {
  setTimeout(render, 100)
})

onShareAppMessage(() => ({
  title: shareTitle.value,
  path: '/pages/index/index',
  imageUrl: previewPath.value || undefined
}))

onShareTimeline(() => ({
  title: shareTitle.value
}))

function toast(title) {
  uni.showToast({ title, icon: 'none' })
}

function measure(ctx, text) {
  try {
    return ctx.measureText(text).width || String(text).length * 24
  } catch (err) {
    return String(text).length * 24
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const chars = Array.from(String(text || ''))
  const lines = []
  let line = ''
  let truncated = false

  for (let index = 0; index < chars.length; index += 1) {
    const next = line + chars[index]
    if (measure(ctx, next) > maxWidth && line) {
      lines.push(line)
      line = chars[index]
      if (lines.length === maxLines) {
        truncated = true
        break
      }
    } else {
      line = next
    }
  }
  if (lines.length < maxLines && line) lines.push(line)
  if (truncated && lines.length) lines[lines.length - 1] += '…'

  lines.forEach((content, index) => {
    ctx.fillText(content, x, y + index * lineHeight)
  })
}

function render(callback) {
  if (!item.value) return
  const event = item.value
  const view = event.view
  const accent = event.color || '#5b8def'
  const ctx = uni.createCanvasContext('shareCanvas', instance.proxy)

  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  bg.addColorStop(0, '#1c2230')
  bg.addColorStop(1, '#0e1117')
  ctx.setFillStyle(bg)
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  ctx.setGlobalAlpha(0.16)
  ctx.setFillStyle(accent)
  ctx.beginPath()
  ctx.arc(540, 96, 140, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(40, 740, 170, 0, Math.PI * 2)
  ctx.fill()
  ctx.setGlobalAlpha(1)

  ctx.setFillStyle('rgba(255,255,255,0.62)')
  ctx.setFontSize(22)
  ctx.fillText('时光倒数', 48, 64)

  ctx.setFillStyle(accent)
  ctx.fillRect(48, 88, 42, 4)

  ctx.setFillStyle('rgba(255,255,255,0.58)')
  ctx.setFontSize(22)
  ctx.fillText(event.type === 'count-up' ? '纪念日' : '倒数日', 102, 100)

  ctx.setFillStyle('#ffffff')
  ctx.setFontSize(40)
  wrapText(ctx, event.title, 48, 180, 504, 54, 2)

  ctx.setFillStyle('rgba(255,255,255,0.62)')
  ctx.setFontSize(24)
  ctx.fillText(view.tag, 48, 300)

  const daysText = view.status === 'today' ? '今天' : String(view.days)
  let dayFont = 128
  if (view.status === 'today') dayFont = 92
  if (daysText.length >= 5) dayFont = 100
  if (daysText.length >= 6) dayFont = 84
  if (daysText.length >= 7) dayFont = 72
  ctx.setFillStyle(accent)
  ctx.setFontSize(dayFont)
  ctx.fillText(daysText, 48, 432)

  if (view.unit) {
    const daysWidth = measure(ctx, daysText)
    ctx.setFillStyle('rgba(255,255,255,0.62)')
    ctx.setFontSize(28)
    ctx.fillText(view.unit, 48 + daysWidth + 12, 432)
  }

  ctx.setFillStyle('rgba(255,255,255,0.78)')
  ctx.setFontSize(26)
  ctx.fillText(`${view.date} ${view.weekday}`, 48, 492)

  if (view.lunarText) {
    ctx.setFillStyle('rgba(255,255,255,0.5)')
    ctx.setFontSize(24)
    ctx.fillText(`农历${view.lunarText}`, 48, 534)
  }

  if (event.note) {
    ctx.setFillStyle('rgba(255,255,255,0.62)')
    ctx.setFontSize(22)
    wrapText(ctx, event.note, 48, 590, 504, 34, 3)
  }

  ctx.setFillStyle('rgba(255,255,255,0.12)')
  ctx.fillRect(48, 704, 504, 1)

  ctx.setFillStyle('rgba(255,255,255,0.42)')
  ctx.setFontSize(20)
  ctx.fillText('记录值得记住的日子', 48, 748)
  ctx.setTextAlign('right')
  ctx.fillText(todayString(), 552, 748)
  ctx.setTextAlign('left')

  ctx.draw(false, callback)
}

function ensureTemp() {
  if (previewPath.value) return Promise.resolve(previewPath.value)

  return new Promise((resolve, reject) => {
    render(() => {
      setTimeout(() => {
        uni.canvasToTempFilePath(
          {
            canvasId: 'shareCanvas',
            fileType: 'png',
            width: CANVAS_W,
            height: CANVAS_H,
            destWidth: CANVAS_W * 2,
            destHeight: CANVAS_H * 2,
            success: res => {
              previewPath.value = res.tempFilePath
              resolve(res.tempFilePath)
            },
            fail: reject
          },
          instance.proxy
        )
      }, 60)
    })
  })
}

function ensureAlbumAuth() {
  return new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    uni.getSetting({
      success: res => {
        if (res.authSetting['scope.writePhotosAlbum']) return resolve()
        uni.authorize({
          scope: 'scope.writePhotosAlbum',
          success: resolve,
          fail: err => reject({ authDenied: true, err })
        })
      },
      fail: err => reject(err)
    })
    // #endif
    // #ifndef MP-WEIXIN
    resolve()
    // #endif
  })
}

function saveToAlbum(path) {
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath: path,
      success: resolve,
      fail: reject
    })
  })
}

// #ifdef H5
function downloadH5(path) {
  const safeTitle = String(item.value.title || '时光倒数').replace(/[\\/:*?"<>|]/g, '_')
  const link = document.createElement('a')
  link.href = path
  link.download = `${safeTitle}-分享卡片.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  toast('图片已生成')
}
// #endif

function handleSaveError(err) {
  console.error('[share] 保存失败', err)
  // #ifdef MP-WEIXIN
  if (err && err.authDenied) {
    uni.showModal({
      title: '需要相册权限',
      content: '保存分享卡片需要相册权限，请在设置中开启。',
      confirmText: '去设置',
      success: res => {
        if (res.confirm) uni.openSetting()
      }
    })
    return
  }
  // #endif
  toast('保存失败，请重试')
}

async function saveImage() {
  if (saving.value || !item.value) return
  saving.value = true
  try {
    const path = await ensureTemp()
    // #ifdef H5
    downloadH5(path)
    // #endif
    // #ifdef APP-PLUS
    await ensureAlbumAuth()
    await saveToAlbum(path)
    toast('已保存到相册')
    // #endif
    // #ifdef MP-WEIXIN
    await ensureAlbumAuth()
    await saveToAlbum(path)
    toast('已保存到相册')
    // #endif
  } catch (err) {
    handleSaveError(err)
  } finally {
    saving.value = false
  }
}

async function shareToChat() {
  if (!item.value) return
  try {
    const path = await ensureTemp()
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && typeof wx.showShareImageMenu === 'function') {
      wx.showShareImageMenu({
        path,
        fail: () => toast('分享失败，请重试')
      })
    } else {
      toast('当前微信版本不支持')
    }
    // #endif
    // #ifndef MP-WEIXIN
    toast('请使用保存到相册')
    // #endif
  } catch (err) {
    toast('生成图片失败，请重试')
  }
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.reLaunch({ url: '/pages/index/index' })
  })
}
</script>

<style scoped lang="scss">
.page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 28rpx 32rpx;
  padding-bottom: calc(200rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(200rpx + env(safe-area-inset-bottom));
  background: $app-bg;
}

.preview-wrap {
  display: flex;
  justify-content: center;
  height: 440px;
  overflow: hidden;
}

.canvas-box {
  flex-shrink: 0;
  width: 600px;
  height: 800px;
  transform: scale(0.52);
  transform-origin: top center;
}

.share-canvas {
  display: block;
}

.tip {
  display: block;
  margin-top: 10rpx;
  text-align: center;
  font-size: 24rpx;
  color: $app-text-secondary;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 180rpx 0 60rpx;
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
  width: 150rpx;
  margin-right: 16rpx;
  color: $app-text-secondary;
  background: $app-card;
}

.btn.primary {
  flex: 1;
  font-weight: 600;
  color: #fff;
  background: $app-primary;
  box-shadow: 0 10rpx 24rpx rgba(91, 141, 239, 0.28);
}

.btn.primary.disabled {
  opacity: 0.6;
}

.btn-hover {
  opacity: 0.85;
}
</style>
