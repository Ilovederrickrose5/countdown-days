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
          @click="setType('countdown')"
        >
          倒数日
        </view>
        <view
          class="segment-item"
          :class="{ active: form.type === 'count-up' }"
          @click="setType('count-up')"
        >
          纪念日
        </view>
      </view>
      <text class="hint">
        {{ form.type === 'countdown' ? '从今天数到目标日期，比如“还有 100 天”' : '从目标日期数到今天，比如“第 520 天”' }}
      </text>
    </view>

    <view class="section">
      <text class="label">{{ dateLabel }}</text>
      <!-- 农历数据从 1900-01-31 开始，避免选到无法转换的日期 -->
      <picker
        v-if="!useLunar"
        mode="date"
        :value="form.targetDate"
        start="1900-01-31"
        end="2100-12-31"
        @change="onDateChange"
      >
        <view class="picker">
          <text class="picker-value">{{ dateText }}</text>
          <text class="picker-arrow">›</text>
        </view>
      </picker>
      <picker
        v-else
        mode="multiSelector"
        :range="LUNAR_RANGE"
        :value="lunarIndexes"
        @change="onLunarChange"
      >
        <view class="picker">
          <text class="picker-value">{{ dateText }}</text>
          <text class="picker-arrow">›</text>
        </view>
      </picker>

      <text v-if="useLunar" class="hint">每年按农历重复，适合农历生日和传统节日</text>
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

      <view v-if="form.type === 'countdown' && form.repeat === 'yearly'" class="calendar-row">
        <text class="switch-title">历法</text>
        <view class="segment mini">
          <view
            class="segment-item"
            :class="{ active: form.calendar === 'solar' }"
            @click="setCalendar('solar')"
          >
            公历
          </view>
          <view
            class="segment-item"
            :class="{ active: form.calendar === 'lunar' }"
            @click="setCalendar('lunar')"
          >
            农历
          </view>
        </view>
      </view>
    </view>

    <!-- 小程序暂未接入订阅消息，隐藏提醒设置，避免出现无法生效的功能 -->
    <!-- #ifndef MP -->
    <view v-if="form.type === 'countdown'" class="section">
      <text class="label">提醒</text>
      <view class="chips">
        <view
          v-for="option in REMINDER_OPTIONS"
          :key="String(option.value)"
          class="chip"
          :class="{ active: form.reminderDays === option.value }"
          @click="form.reminderDays = option.value"
        >
          {{ option.label }}
        </view>
      </view>

      <view v-if="form.reminderDays !== null" class="reminder-time">
        <text class="switch-title">提醒时间</text>
        <picker mode="time" :value="form.reminderTime" @change="onReminderTimeChange">
          <view class="time-picker">
            <text class="time-value">{{ form.reminderTime }}</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>

      <text v-if="form.reminderDays === null" class="hint">开启后，到点提醒你</text>
      <!-- #ifdef APP-PLUS -->
      <text v-if="form.reminderDays !== null" class="hint">App 会在设定时间发送本地通知</text>
      <!-- #endif -->
      <!-- #ifdef H5 -->
      <text v-if="form.reminderDays !== null" class="hint">H5 仅在首页打开时提醒，无法后台通知</text>
      <!-- #endif -->

      <text v-if="reminderPreview" class="preview">{{ reminderPreview }}</text>
    </view>
    <!-- #endif -->

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
      <text class="label">标签（可选）</text>
      <input
        v-model="form.tagsText"
        class="input"
        placeholder="用空格分隔，例如 家人 生日"
        placeholder-class="placeholder"
        maxlength="40"
      />
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
import { useReminders } from '@/composables/useReminders'
import { getEventView, todayString, weekdayOfDateString } from '@/utils/date'
import {
  formatLunar,
  LUNAR_DAY_NAMES,
  LUNAR_MONTH_NAMES,
  nextLunarSolarDate,
  solarToLunar
} from '@/utils/lunar'
import { formatReminderAt, nextReminderAt, REMINDER_OPTIONS } from '@/utils/reminder'
import { templateForm } from '@/utils/templates'

const COLORS = ['#5b8def', '#f2668b', '#f5a524', '#38bdf8', '#34c77b']
const LUNAR_RANGE = [LUNAR_MONTH_NAMES, LUNAR_DAY_NAMES]

const { getById, addEvent, updateEvent, removeEvent, snapshot } = useEvents()
const { syncApp } = useReminders()

const isEdit = ref(false)
const editingId = ref('')
const form = reactive({
  title: '',
  type: 'countdown',
  targetDate: todayString(),
  repeat: 'none',
  calendar: 'solar',
  lunarMonth: 1,
  lunarDay: 1,
  reminderDays: null,
  reminderTime: '09:00',
  color: COLORS[0],
  tagsText: '',
  note: ''
})

onLoad(options => {
  const id = options && options.id
  if (!id) {
    const template = templateForm(options && options.template)
    if (template) applyTemplate(template)
    return
  }

  const item = getById(decodeURIComponent(id))
  if (!item) {
    uni.showToast({ title: '记录不存在', icon: 'none' })
    setTimeout(goBack, 600)
    return
  }

  const derived = solarToLunar(item.targetDate)
  Object.assign(form, {
    title: item.title,
    type: item.type,
    targetDate: item.targetDate,
    repeat: item.repeat,
    calendar: item.calendar === 'lunar' ? 'lunar' : 'solar',
    lunarMonth: item.lunarMonth || (derived ? derived.month : 1),
    lunarDay: item.lunarDay || (derived ? derived.day : 1),
    reminderDays: item.reminderDays ?? null,
    reminderTime: item.reminderTime || '09:00',
    color: item.color,
    tagsText: Array.isArray(item.tags) ? item.tags.join(' ') : '',
    note: item.note
  })
  editingId.value = item.id
  isEdit.value = true
  uni.setNavigationBarTitle({ title: '编辑纪念日' })
})

function applyTemplate(template) {
  Object.assign(form, {
    title: template.title || '',
    type: template.type || 'countdown',
    targetDate: template.targetDate || todayString(),
    repeat: template.repeat || 'none',
    calendar: template.calendar || 'solar',
    lunarMonth: template.lunarMonth || 1,
    lunarDay: template.lunarDay || 1,
    reminderDays: null,
    reminderTime: '09:00',
    color: template.color || COLORS[0],
    tagsText: Array.isArray(template.tags) ? template.tags.join(' ') : '',
    note: template.note || ''
  })
}

function parseTags(value) {
  return Array.from(
    new Set(
      String(value || '')
        .split(/[\s,，]+/)
        .map(tag => tag.trim())
        .filter(Boolean)
    )
  ).slice(0, 5)
}

const useLunar = computed(
  () => form.type === 'countdown' && form.repeat === 'yearly' && form.calendar === 'lunar'
)

const lunarIndexes = computed(() => [form.lunarMonth - 1, form.lunarDay - 1])

const lunarText = computed(() =>
  formatLunar({ month: form.lunarMonth, day: form.lunarDay, isLeap: false })
)

const dateLabel = computed(() => {
  if (useLunar.value) return '农历日期'
  return form.type === 'countdown' ? '目标日期' : '起始日期'
})

const dateText = computed(() => {
  if (useLunar.value) return `农历${lunarText.value}`
  if (!form.targetDate) return '请选择日期'
  return `${form.targetDate} ${weekdayOfDateString(form.targetDate)}`
})

const preview = computed(() => {
  if (!form.title.trim()) return ''
  if (!useLunar.value && !form.targetDate) return ''

  const view = getEventView({
    ...form,
    repeat: form.type === 'count-up' ? 'none' : form.repeat,
    calendar: useLunar.value ? 'lunar' : 'solar'
  })

  let text
  if (view.status === 'today') text = '就是今天'
  else if (view.status === 'future') text = `还有 ${view.days} 天`
  else if (view.status === 'start') text = '今天是第 1 天'
  else if (view.status === 'elapsed') text = `已经第 ${view.days} 天`
  else text = `已过去 ${view.days} 天`

  return useLunar.value ? `${text} · ${view.date}` : text
})

const reminderPreview = computed(() => {
  if (form.reminderDays === null) return ''
  const at = nextReminderAt({
    ...form,
    repeat: form.type === 'count-up' ? 'none' : form.repeat,
    calendar: useLunar.value ? 'lunar' : 'solar'
  })
  return at ? `下次提醒：${formatReminderAt(at)}` : '这个提醒时间已经过了'
})

function setType(type) {
  if (form.type === type) return
  if (type === 'count-up' && useLunar.value) {
    const solar = nextLunarSolarDate(form.lunarMonth, form.lunarDay)
    if (solar) form.targetDate = solar
  }
  form.type = type
  if (type === 'count-up') {
    form.repeat = 'none'
    form.calendar = 'solar'
  }
}

function onDateChange(e) {
  form.targetDate = e.detail.value
}

function onReminderTimeChange(e) {
  const value = String(e.detail.value || '')
  if (/^\d{2}:\d{2}/.test(value)) form.reminderTime = value.slice(0, 5)
}

function onLunarChange(e) {
  const [monthIndex, dayIndex] = e.detail.value.map(Number)
  form.lunarMonth = monthIndex + 1
  form.lunarDay = dayIndex + 1
}

function setCalendar(calendar) {
  if (form.calendar === calendar) return
  if (calendar === 'lunar') {
    const lunar = solarToLunar(form.targetDate)
    if (lunar) {
      form.lunarMonth = lunar.month
      form.lunarDay = lunar.day
    }
  } else {
    const solar = nextLunarSolarDate(form.lunarMonth, form.lunarDay)
    if (solar) form.targetDate = solar
  }
  form.calendar = calendar
}

function onRepeatChange(e) {
  const yearly = Boolean(e.detail.value)
  if (!yearly && useLunar.value) {
    const solar = nextLunarSolarDate(form.lunarMonth, form.lunarDay)
    if (solar) form.targetDate = solar
  }
  form.repeat = yearly ? 'yearly' : 'none'
  if (!yearly) form.calendar = 'solar'
}

function toast(title) {
  uni.showToast({ title, icon: 'none' })
}

function save() {
  const title = form.title.trim()
  if (!title) return toast('请输入名称')
  if (!useLunar.value && !form.targetDate) return toast('请选择日期')

  const lunar = useLunar.value
  const payload = {
    title,
    type: form.type,
    targetDate: form.targetDate,
    repeat: form.type === 'count-up' ? 'none' : form.repeat,
    calendar: lunar ? 'lunar' : 'solar',
    lunarMonth: lunar ? form.lunarMonth : null,
    lunarDay: lunar ? form.lunarDay : null,
    reminderDays: form.type === 'count-up' ? null : form.reminderDays,
    reminderTime: form.reminderTime,
    color: form.color,
    tags: parseTags(form.tagsText),
    note: form.note.trim()
  }

  // 农历事件不依赖具体年份，存下最近一次的公历日期作为兜底
  if (lunar) {
    const solar = nextLunarSolarDate(form.lunarMonth, form.lunarDay)
    if (solar) payload.targetDate = solar
  }

  if (isEdit.value) {
    updateEvent(editingId.value, payload)
    toast('已保存')
  } else {
    addEvent(payload)
    toast('已添加')
  }
  syncApp(snapshot())

  setTimeout(goBack, 400)
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.reLaunch({ url: '/pages/index/index' })
  })
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
      syncApp(snapshot())
      uni.showToast({ title: '已删除', icon: 'none' })
      setTimeout(goBack, 400)
    }
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

.calendar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24rpx;
}

.segment.mini {
  width: 260rpx;
  padding: 4rpx;
}

.segment.mini .segment-item {
  padding: 12rpx 0;
  font-size: 26rpx;
}

.chips {
  display: flex;
  flex-wrap: wrap;
}

.chip {
  padding: 14rpx 26rpx;
  margin: 0 14rpx 14rpx 0;
  font-size: 26rpx;
  color: $app-text-secondary;
  background: #f5f6fa;
  border-radius: 999rpx;
}

.chip.active {
  color: #fff;
  background: $app-primary;
}

.reminder-time {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8rpx;
}

.time-picker {
  display: flex;
  align-items: center;
  padding: 12rpx 20rpx;
  background: #f5f6fa;
  border-radius: 12rpx;
}

.time-value {
  font-size: 28rpx;
  color: $app-text;
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
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
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
