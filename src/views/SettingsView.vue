<script setup lang="ts">
import { reactive, onMounted, onUnmounted, watch, ref } from 'vue'
import SubWindowLayout from '../components/SubWindowLayout.vue'
import Toast from '../components/Toast.vue'
import type { Config } from '../db'
import db from '../db'

const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'warning'>('success')

function showMessage(message: string, type: 'success' | 'error' | 'warning' = 'success') {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}

const config = reactive<Config>({
  clipboardPath: '',
  stickyNotePath: '',
  clipboardMode: 'append',
  clipboardAppendTime: 'day',
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

function handleClipboardDir(_event: any, dir: string) {
  if (!config.clipboardPath) {
    config.clipboardPath = dir
  }
}

function handleStickyNotePath(_event: any, dir: string) {
  if (!config.stickyNotePath) {
    config.stickyNotePath = dir
  }
}

onMounted(async () => {
  const savedConfig = await db.getConfig()
  Object.assign(config, savedConfig)
  window.ipcRenderer.send('get-clipboard-dir')
  window.ipcRenderer.on('clipboard-dir', handleClipboardDir)
  window.ipcRenderer.send('get-sticky-note-path')
  window.ipcRenderer.on('sticky-note-path', handleStickyNotePath)
})

onUnmounted(() => {
  window.ipcRenderer.off('clipboard-dir', handleClipboardDir)
  window.ipcRenderer.off('sticky-note-path', handleStickyNotePath)
})

watch(
  () => config.clipboardMode,
  (mode) => {
    window.ipcRenderer.send('set-clipboard-mode', mode)
  }
)

watch(
  () => config.clipboardAppendTime,
  (time) => {
    window.ipcRenderer.send('set-clipboard-append-time', time)
  }
)

watch(
  () => config.stickyNotePath,
  (path) => {
    if (path) {
      window.ipcRenderer.send('set-sticky-note-path', path)
    }
  }
)

async function updateConfig() {
  await db.updateConfig({
    clipboardPath: config.clipboardPath,
    stickyNotePath: config.stickyNotePath,
    clipboardMode: config.clipboardMode,
    clipboardAppendTime: config.clipboardAppendTime,
  })
  showMessage('设置已保存')
}

async function selectClipboardDir() {
  const dir = await window.ipcRenderer.invoke('select-clipboard-dir')
  if (dir) {
    config.clipboardPath = dir
  }
}

function openClipboardDir() {
  window.ipcRenderer.send('open-clipboard-dir')
}

async function selectStickyNoteDir() {
  const dir = await window.ipcRenderer.invoke('select-sticky-note-path')
  if (dir) {
    config.stickyNotePath = dir
  }
}

function openStickyNoteDir() {
  window.ipcRenderer.send('open-sticky-note-path')
}
</script>

<template>
  <SubWindowLayout title="设置">
    <div class="h-full overflow-y-auto p-6">
      <div class="max-w-2xl mx-auto space-y-6">
        <div class="bg-white rounded-lg p-5 shadow-sm">
          <h3 class="font-medium text-gray-800 mb-4">剪贴板设置</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">保存路径</label>
              <div class="flex items-center gap-3">
                <input
                  v-model="config.clipboardPath"
                  type="text"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="选择保存路径..."
                />
                <button
                  @click="selectClipboardDir"
                  class="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                >
                  浏览
                </button>
                <button
                  @click="openClipboardDir"
                  class="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                >
                  打开目录
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-2">复制的内容会自动保存到该目录下</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">保存模式</label>
              <div class="flex gap-3">
                <button
                  @click="config.clipboardMode = 'append'"
                  :class="[
                    'flex-1 py-2 rounded text-sm transition-colors',
                    config.clipboardMode === 'append'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  ]"
                >
                  追加模式
                </button>
                <button
                  @click="config.clipboardMode = 'new'"
                  :class="[
                    'flex-1 py-2 rounded text-sm transition-colors',
                    config.clipboardMode === 'new'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  ]"
                >
                  新建文件
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-2">
                {{ config.clipboardMode === 'append' ? '相同时间周期的内容合并到一个文件' : '每次复制创建新文件' }}
              </p>
            </div>

            <div v-if="config.clipboardMode === 'append'">
              <label class="block text-sm font-medium text-gray-700 mb-2">合并周期</label>
              <div class="flex gap-3">
                <button
                  @click="config.clipboardAppendTime = 'day'"
                  :class="[
                    'flex-1 py-2 rounded text-sm transition-colors',
                    config.clipboardAppendTime === 'day'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  ]"
                >
                  按天
                </button>
                <button
                  @click="config.clipboardAppendTime = 'hour'"
                  :class="[
                    'flex-1 py-2 rounded text-sm transition-colors',
                    config.clipboardAppendTime === 'hour'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  ]"
                >
                  按小时
                </button>
                <button
                  @click="config.clipboardAppendTime = 'minute'"
                  :class="[
                    'flex-1 py-2 rounded text-sm transition-colors',
                    config.clipboardAppendTime === 'minute'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  ]"
                >
                  按分钟
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-2">同一周期内复制的内容会追加到同一个文件</p>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg p-5 shadow-sm">
          <h3 class="font-medium text-gray-800 mb-4">便签设置</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">便签保存路径</label>
              <div class="flex items-center gap-3">
                <input
                  v-model="config.stickyNotePath"
                  type="text"
                  class="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="选择保存路径..."
                />
                <button
                  @click="selectStickyNoteDir"
                  class="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                >
                  浏览
                </button>
                <button
                  @click="openStickyNoteDir"
                  class="px-4 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                >
                  打开目录
                </button>
              </div>
              <p class="text-xs text-gray-500 mt-2">便签内容会保存为txt文件存放在此目录下</p>
            </div>
          </div>
        </div>

        

        <button
          @click="updateConfig"
          class="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          保存设置
        </button>
      </div>
    </div>
    <Toast
      :message="toastMessage"
      :type="toastType"
      v-model="showToast"
    />
  </SubWindowLayout>
</template>