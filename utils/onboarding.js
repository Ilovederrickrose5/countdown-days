const GUIDE_KEY = 'countdown_guide_seen'
const GUIDE_REQUEST_KEY = 'countdown_guide_request'

export function hasSeenGuide() {
  try {
    return Boolean(uni.getStorageSync(GUIDE_KEY))
  } catch (err) {
    console.error('[onboarding] 读取引导状态失败', err)
    return true
  }
}

export function markGuideSeen() {
  try {
    uni.setStorageSync(GUIDE_KEY, '1')
  } catch (err) {
    console.error('[onboarding] 保存引导状态失败', err)
  }
}

export function resetGuide() {
  try {
    uni.removeStorageSync(GUIDE_KEY)
  } catch (err) {
    console.error('[onboarding] 重置引导状态失败', err)
  }
}

export function requestGuide() {
  try {
    uni.setStorageSync(GUIDE_REQUEST_KEY, '1')
  } catch (err) {
    console.error('[onboarding] 请求引导失败', err)
  }
}

export function consumeGuideRequest() {
  try {
    const requested = Boolean(uni.getStorageSync(GUIDE_REQUEST_KEY))
    if (requested) uni.removeStorageSync(GUIDE_REQUEST_KEY)
    return requested
  } catch (err) {
    console.error('[onboarding] 读取引导请求失败', err)
    return false
  }
}
