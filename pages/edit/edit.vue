<template>
  <view class="page">
    <view class="section">
      <text class="label">名称</text>
      <input
        v-model="form.title"
        class="input"
        placeholder="例如：在一起、妈妈生日、高考"
        placeholder-class="placeholder"
        maxlength="30"
      />
    </view>

    <view class="section">
      <text class="label">类型</text>
      <view class="segment">
        <view
          class="segment-item"
          :class="{ active: form.type === 'countdown' }"
          @click="form.type = 'countdown'"
        >
          倒数日
        </view>
        <view
          class="segment-item"
          :class="{ active: form.type === 'count-up' }"
          @click="form.type = 'count-up'"
        >
          纪念日
        </view>
      </view>
      <text class="hint">
        {{ form.type === 'countdown' ? '从今天数到目标日期，比如“还有 100 天”' : '从目标日期数到今天，比如“第 520 天”' }}
      </text>
    </view>

    <view class="section">
      <text class="label">{{ form.type === 'countdown' ? '目标日期' : '起始日期' }}</text>
      <picker
        mode="date"
        :value="form.targetDate"
        start="1900-01-01"
        end="2100-12-31"
        @change="onDateChange"
      >
        <view class="picker">
          <text class="picker-value">{{ dateText }}</text>
          <text class="picker-arrow">›</text>
        </view>
      </picker>
      <text v-if="preview" class="preview">{{ preview }}</text>

      <view v-if="form.type === 'countdown'" class="switch-row">
        <view class="switch-text">
          <text class="switch-title">每年重复</text>
          <text class="hint">生日、周年等每年循环的日子</text>
        </view>
        <switch
          :checked="form.repeat === 'yearly'"
          color="#5b8def"
          @change="onRepeatChange"
        />
      </view>
    </view>

    <view class="section">
      <text class="label">颜色</text>
      <view class="colors">
        <view
          v-for="color in COLORS"
          :key="color"
          class="swatch"
          :class="{ active: form.color === color }"
          :style="{ backgroundColor: color }"
          @click="form.color = color"
        >
          <text v-if="form.color === color" class="swatch-check">✓</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="label">备注（可选）</text>
      <textarea
        v-model="form.note"
        class="textarea"
        placeholder="写点什么记住这一天"
        placeholder-class="placeholder"
        maxlength="200"
        auto-height
      />
    </view>

    <view v-if="isEdit" class="delete-link" @click="confirmDelete">删除这个日子</view>

    <view class="footer">
      <view class="save-btn" @click="save">{{ isEdit ? '保存修改' : '添加纪念日' }}</view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useEvents } from '@/composables/useEvents'
import { getEventView, todayString, weekdayOfDateString } from '@/utils/date'

const COLORS = ['#5b8def', '#f2668b', '#f5a524', '#38bdf8', '#34c77b']

const { getById, addEvent, updateEvent, removeEvent } = useEvents()

const isEdit = ref(false)
const editingId = ref('')
const form = reactive({
  title: '',
  type: 'countdown',
  targetDate: todayString(),
  repeat: 'none',
  color: COLORS[0],
  note: ''
})

onLoad(options => {
  const id = options && options.id
  if (!id) return

  const item = getById(decodeURIComponent(id))
  if (!item) {
    uni.showToast({ title: '记录不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 600)
    return
  }

  Object.assign(form, {
    title: item.title,
    type: item.type,
    targetDate: item.targetDate,
    repeat: item.repeat,
    color: item.color,
    note: item.note
  })
  editingId.value = item.id
  isEdit.value = true
  uni.setNavigationBarTitle({ title: '编辑纪念日' })
})

const dateText = computed(() => {
  if (!form.targetDate) return '请选择日期'
  return `${form.targetDate} ${weekdayOfDateString(form.targetDate)}`
})

const preview = computed(() => {
  if (!form.targetDate || !form.title.trim()) return ''
  const view = getEventView({
    ...form,
    repeat: form.type === 'count-up' ? 'none' : form.repeat
  })
  if (view.status === 'today') return '就是今天'
  if (view.status === 'future') return `还有 ${view.days} 天`
  if (view.status === 'start') return '今天是第 1 天'
  if (view.status === 'elapsed') return `已经第 ${view.days} 天`
  return `已过去 ${view.days} 天`
})

function onDateChange(e) {
  form.targetDate = e.detail.value
}

function onRepeatChange(e) {
  form.repeat = e.detail.value ? 'yearly' : 'none'
}

function toast(title) {
  uni.showToast({ title, icon: 'none' })
}

function save() {
  const title = form.title.trim()
  if (!title) return toast('请输入名称')
  if (!form.targetDate) return toast('请选择日期')

  const payload = {
    title,
    type: form.type,
    targetDate: form.targetDate,
    repeat: form.type === 'count-up' ? 'none' : form.repeat,
    color: form.color,
    note: form.note.trim()
  }

  if (isEdit.value) {
    updateEvent(editingId.value, payload)
    toast('已保存')
  } else {
    addEvent(payload)
    toast('已添加')
  }

  setTimeout(() => uni.navigateBack(), 400)
}

function confirmDelete() {
  uni.showModal({
    title: '删除纪念日',
    content: `确定删除「${form.title || '这个日子'}」吗？`,
    confirmText: '删除',
    confirmColor: '#e5484d',
    success: res => {
      if (!res.confirm) return
      removeEvent(editingId.value)
      uni.showToast({ title: '已删除', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 400)
    }
  })
}
</script>

<style scoped lang="scss">
.page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 28rpx 32rpx calc(200rpx + env(safe-area-inset-bottom));
  background: $app-bg;
}

.section {
  padding: 28rpx 30rpx;
  margin-bottom: 20rpx;
  background: $app-card;
  border-radius: $app-radius;
}

.label {
  display: block;
  margin-bottom: 18rpx;
  font-size: 26rpx;
  color: $app-text-secondary;
}

.input,
.picker {
  height: 92rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
  color: $app-text;
  background: #f5f6fa;
  border-radius: 16rpx;
}

.picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-value {
  color: $app-text;
}

.picker-arrow {
  font-size: 40rpx;
  color: #b0b6c3;
  line-height: 1;
}

.hint {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: $app-text-secondary;
}

.preview {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: $app-primary;
}

.segment {
  display: flex;
  padding: 6rpx;
  background: #f5f6fa;
  border-radius: 16rpx;
}

.segment-item {
  flex: 1;
  padding: 18rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: $app-text-secondary;
  border-radius: 12rpx;
}

.segment-item.active {
  color: #fff;
  background: $app-primary;
  box-shadow: 0 4rpx 12rpx rgba(91, 141, 239, 0.25);
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
}

.switch-text {
  flex: 1;
  padding-right: 20rpx;
}

.switch-title {
  display: block;
  font-size: 28rpx;
  color: $app-text;
}

.switch-text .hint {
  margin-top: 6rpx;
}

.colors {
  display: flex;
}

.swatch {
  width: 64rpx;
  height: 64rpx;
  margin-right: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-sizing: border-box;
}

.swatch.active {
  transform: scale(1.08);
  box-shadow: 0 0 0 4rpx #fff, 0 0 0 8rpx rgba(31, 36, 48, 0.12);
}

.swatch-check {
  font-size: 30rpx;
  color: #fff;
  font-weight: 700;
}

.textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 140rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: $app-text;
  background: #f5f6fa;
  border-radius: 16rpx;
}

.placeholder {
  color: #a6acb9;
}

.delete-link {
  padding: 24rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: $app-danger;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: rgba(244, 245, 249, 0.96);
}

.save-btn {
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
  background: $app-primary;
  border-radius: 16rpx;
  box-shadow: 0 10rpx 24rpx rgba(91, 141, 239, 0.28);
}
</style>
