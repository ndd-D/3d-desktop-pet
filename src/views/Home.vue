<script setup lang="ts">
import { OrbitControls } from '@tresjs/cientos'
import { TresCanvas } from '@tresjs/core'
import { BasicShadowMap, NoToneMapping, SRGBColorSpace } from 'three'
import { onMounted, onUnmounted, ref, computed } from 'vue'
import ButtonIcon from '../components/ButtonIcon.vue'
import ContextMenu from '../components/ContextMenu.vue'
import Pet from '../components/Pet3D.vue'
import { useModel } from '../composable/useModel'
import { useReminder } from '../composable/useReminder'
import db from '../db'
import type { Task } from '../db'

const { checkReminders } = useReminder()
const { clickActionPlayMessage } = useModel()

const showContextMenu = ref(false)
const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault()
  showContextMenu.value = !showContextMenu.value
}

const closeContextMenu = () => {
  showContextMenu.value = false
}

const gl = {
  shadows: false,
  alpha: true,
  premultipliedAlpha: false,
  antialias: true,
  shadowMapType: BasicShadowMap,
  outputColorSpace: SRGBColorSpace,
  toneMapping: NoToneMapping,
  windowSize: true,
}

const handleClick = () => {
  if (showContextMenu.value) {
    showContextMenu.value = false
  } else {
    clickActionPlayMessage()
    updateBubblePosition()
    showSpeechBubble.value = true
    currentGreeting.value = greetings[Math.floor(Math.random() * greetings.length)]
    setTimeout(() => {
      showSpeechBubble.value = false
    }, 2000)
  }
}

const openTaskList = () => {
  window.ipcRenderer.send('open-sub-window', {
    windowId: 'task',
    title: '任务管理',
  })
}

const light = ref({
  color: '#fff',
  position: [0, 4, 3] as [number, number, number],
  intensity: 1.8,
})

let timer: number | null = null

const tasks = ref<Task[]>([])
const showSpeechBubble = ref(false)
const currentGreeting = ref('')
const bubblePosition = ref<'top' | 'bottom'>('top')

const greetings = [
  "视频扫盲，复现换深度，重复达质变——学习没有捷径，但有先后。",
  "看视频是消费，复现是生产；没有产出的学习，只是在消费'我在努力'的感觉。",
  "复现时讲不通的地方，才是你真正没懂的地方。",
  "滚瓜烂熟不是目的，'不用查资料能独立输出'才是停止点。",
  "学无止境不是悲催，是体验本身；关键在于此刻这条路，值不值得走到底。",
  "重复是买路钱，不是惩罚——前提是你选对了这条路。",
  "视频看再多，没有产出等于没有学习。",
  "停在半深不浅的地方，不叫坚持，叫耗着。",
  "质变不是重复出来的，是重复到临界点后自然发生的——但你得先设好停止点。",
  "真正值得重复的事，从来不是因为'应该'，而是因为'还不够'。"
]


const pendingTaskCount = computed(() => {
  return tasks.value.filter(t => t.status !== 'completed').length
})

const upcomingTask = computed(() => {
  return tasks.value
    .filter(t => t.status !== 'completed' && t.dueDate)
    .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0))[0]
})

async function loadTasks() {
  tasks.value = await db.tasks.toArray()
  tasks.value.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'completed' ? 1 : -1
    }
    if (a.dueDate && b.dueDate) {
      return a.dueDate - b.dueDate
    }
    return b.createdAt - a.createdAt
  })
}

function formatDueDate(dueDate: number) {
  const now = Date.now()
  const diff = dueDate - now
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours < 0) return '已逾期'
  if (hours === 0) return `${minutes}分钟后截止`
  if (hours < 24) return `${hours}小时后截止`
  return `${Math.floor(hours / 24)}天后截止`
}

function updateBubblePosition() {
  const screenHeight = window.screen.height
  const windowY = window.screenY
  
  if (windowY < screenHeight / 2) {
    bubblePosition.value = 'bottom'
  } else {
    bubblePosition.value = 'top'
  }
}

const showClipboardNotification = ref(false)
const clipboardNotificationText = ref('')

const handleClipboardChange = (_event: any, item: { type: string; fileName: string }) => {
  const typeText = item.type === 'image' ? '图片' : '文字'
  clipboardNotificationText.value = `已保存${typeText}: ${item.fileName}`
  showClipboardNotification.value = true
  setTimeout(() => {
    showClipboardNotification.value = false
  }, 3000)
}

function minimizeWindow() {
  window.ipcRenderer.send('minimize-main-window')
}

onMounted(async () => {
  checkReminders()
  loadTasks()
  timer = window.setInterval(checkReminders, 10000)
  window.ipcRenderer.on('clipboard-change', handleClipboardChange)
  window.ipcRenderer.on('task-changed', handleTaskChange)
  
  const config = await db.getConfig()
  if (config.clipboardMode) {
    window.ipcRenderer.send('set-clipboard-mode', config.clipboardMode)
  }
  if (config.clipboardAppendTime) {
    window.ipcRenderer.send('set-clipboard-append-time', config.clipboardAppendTime)
  }
  if (config.clipboardPath) {
    window.ipcRenderer.send('set-clipboard-dir', config.clipboardPath)
  }
  if (config.stickyNotePath) {
    window.ipcRenderer.send('set-sticky-note-path', config.stickyNotePath)
  }
})

function handleTaskChange() {
  loadTasks()
}

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  window.ipcRenderer.off('clipboard-change', handleClipboardChange)
  window.ipcRenderer.off('task-changed', handleTaskChange)
})
</script>

<template>
  <div @contextmenu="handleContextMenu" @dblclick="minimizeWindow" class="relative">
    <div v-show="showContextMenu" class="drag-button">
      <ButtonIcon />
    </div>
    
    <div v-if="pendingTaskCount > 0" class="task-indicator" @click="openTaskList">
      <span class="task-count">{{ pendingTaskCount }}</span>
      <span class="task-label">待办</span>
    </div>

    <Transition name="bubble">
      <div v-if="showSpeechBubble" class="speech-bubble" :class="bubblePosition">
        {{ currentGreeting }}
      </div>
    </Transition>

    <Transition name="task-hint">
      <div v-if="upcomingTask && !showSpeechBubble" class="task-hint">
        <span class="hint-icon">📝</span>
        <span class="hint-text">{{ upcomingTask.title }}</span>
        <span class="hint-time">{{ formatDueDate(upcomingTask.dueDate || Date.now()) }}</span>
      </div>
    </Transition>

    <Transition name="notification">
      <div v-if="showClipboardNotification" class="clipboard-notification">
        📋 {{ clipboardNotificationText }}
      </div>
    </Transition>

    <TresCanvas v-bind="gl">
      <TresPerspectiveCamera :position="[0, 0, 4]" />
      <OrbitControls :enable-zoom="false" :enable-pan="false" />
      <Suspense>
        <TresMesh @click="handleClick">
          <Pet />
        </TresMesh>
      </Suspense>
      <TresDirectionalLight v-bind="light" />
      <TresAmbientLight :intensity="2" />
    </TresCanvas>

    <ContextMenu v-if="showContextMenu" @close="closeContextMenu" />
  </div>
</template>

<style scoped>
:deep(canvas) {
  border: none !important;
  outline: none !important;
}

.drag-button {
  position: absolute;
  top: 10px;
  right: 2px;
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  -webkit-app-region: drag;
  transition: all 0.3s ease;
}

.task-indicator {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.85);
  padding: 4px 8px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
  animation: pulse 2s infinite;
  user-select: none;
  -webkit-user-select: none;
}

.task-count {
  background: #ef4444;
  color: white;
  font-size: 12px;
  font-weight: bold;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-label {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
}

.speech-bubble {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 8px 16px;
  border-radius: 16px;
  font-size: 14px;
  color: #374151;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
  z-index: 200;
}

.speech-bubble.top {
  top: -60px;
}

.speech-bubble.top::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
}

.speech-bubble.bottom {
  bottom: -60px;
}

.speech-bubble.bottom::after {
  content: '';
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid white;
}

.task-hint {
  position: absolute;
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 8px 12px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 150;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  max-width: 160px;
}

.hint-icon {
  font-size: 16px;
}

.hint-text {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hint-time {
  font-size: 10px;
  color: #ef4444;
}

.bubble-enter-active,
.bubble-leave-active {
  transition: all 0.3s ease;
}

.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.task-hint-enter-active,
.task-hint-leave-active {
  transition: all 0.4s ease;
}

.task-hint-enter-from,
.task-hint-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-15px);
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  50% {
    box-shadow: 0 2px 12px rgba(239, 68, 68, 0.3);
  }
}

.clipboard-notification {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.95);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  white-space: nowrap;
  z-index: 100;
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from,
.notification-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
