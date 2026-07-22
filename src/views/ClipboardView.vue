<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import SubWindowLayout from '../components/SubWindowLayout.vue'
import Toast from '../components/Toast.vue'
import type { ClipboardItem } from '../db'
import db from '../db'

const clipboardItems = ref<ClipboardItem[]>([])
const clipboardDir = ref('')
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'warning'>('success')
const loadingImages = ref<Set<string>>(new Set())

function showMessage(message: string, type: 'success' | 'error' | 'warning' = 'success') {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}

async function handleClipboardChange(_event: any, item: { type: 'text' | 'image' | 'file'; content: string; fileName?: string; filePath?: string }) {
  await db.addClipboardItem(item)
  await loadClipboardItems()
}

onMounted(async () => {
  await loadClipboardItems()
  window.ipcRenderer.send('get-clipboard-dir')
  window.ipcRenderer.on('clipboard-dir', (_event, dir) => {
    clipboardDir.value = dir
  })
  window.ipcRenderer.on('clipboard-change', handleClipboardChange)
})

onUnmounted(() => {
  window.ipcRenderer.removeAllListeners('clipboard-dir')
  window.ipcRenderer.off('clipboard-change', handleClipboardChange)
})

async function loadClipboardItems() {
  clipboardItems.value = await db.getClipboardItems()
  clipboardItems.value.forEach(item => {
    if (item.type === 'image' && item.id) {
      loadingImages.value.add(item.id)
    }
  })
}

async function deleteItem(id: string) {
  if (confirm('确定要删除这条记录吗？')) {
    await db.deleteClipboardItem(id)
    await loadClipboardItems()
  }
}

async function clearAll() {
  if (confirm('确定要清空所有剪贴板记录吗？')) {
    await db.clearClipboard()
    await loadClipboardItems()
  }
}

function openClipboardDir() {
  window.ipcRenderer.send('open-clipboard-dir')
}

async function selectClipboardDir() {
  const dir = await window.ipcRenderer.invoke('select-clipboard-dir')
  if (dir) {
    clipboardDir.value = dir
  }
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function copyContent(content: string) {
  navigator.clipboard.writeText(content).then(() => {
    showMessage('已复制到剪贴板')
  }).catch(() => {
    showMessage('复制失败', 'error')
  })
}

function onImageLoad(itemId: string) {
  loadingImages.value.delete(itemId)
}

function onImageError(itemId: string) {
  loadingImages.value.delete(itemId)
}


</script>

<template>
  <SubWindowLayout title="剪贴板记录">
    <div class="h-full flex flex-col">
      <div class="flex items-center justify-between px-5 pt-5 pb-3 bg-white border-b">
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-600">保存目录:</span>
          <span class="text-sm text-blue-600 truncate max-w-xs">{{ clipboardDir }}</span>
          <button
            @click="selectClipboardDir"
            class="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
          >
            更改
          </button>
          <button
            @click="openClipboardDir"
            class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
          >
            打开目录
          </button>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="clearAll"
            class="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
          >
            清空记录
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-5">
        <div class="flex flex-col gap-3">
          <div
            v-for="item in clipboardItems"
            :key="item.id"
            class="bg-white rounded-lg p-4 shadow-sm border"
            :class="item.type === 'image' ? 'border-blue-200' : 'border-green-200'"
          >
            <div class="flex justify-between items-start gap-3">
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ item.type === 'image' ? '🖼️' : '📝' }}</span>
                <span
                  class="text-xs px-2 py-0.5 rounded-full"
                  :class="item.type === 'image' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'"
                >
                  {{ item.type === 'image' ? '图片' : '文字' }}
                </span>
                <span class="text-xs text-gray-400">{{ formatTime(item.createdAt) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="item.type === 'text'"
                  @click="copyContent(item.content)"
                  class="px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200 transition-colors"
                >
                  复制
                </button>
                <button
                  @click="deleteItem(item.id!)"
                  class="px-2 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
            <div class="mt-3">
              <div v-if="item.type === 'image'" class="max-w-xs relative">
                <div v-if="item.id && loadingImages.has(item.id)" class="flex items-center justify-center h-32 bg-gray-100 rounded">
                  <svg class="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <img 
                  :src="'file:///' + item.content" 
                  alt="剪贴板图片" 
                  class="max-w-full rounded"
                  :class="{ hidden: item.id && loadingImages.has(item.id) }"
                  @load="item.id && onImageLoad(item.id)"
                  @error="item.id && onImageError(item.id)"
                />
              </div>
              <div v-else class="text-sm text-gray-700 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                {{ item.content }}
              </div>
            </div>
            <div class="mt-2 text-xs text-gray-400">
              文件名: {{ item.fileName }}
            </div>
          </div>
        </div>
        <div v-if="clipboardItems.length === 0" class="text-center text-gray-500 mt-8">
          <div class="text-4xl mb-3">📋</div>
          <div>还没有剪贴板记录</div>
          <div class="text-sm mt-1">复制文字或图片后按快捷键保存（默认 Ctrl+Shift+S）</div>
        </div>
      </div>
    </div>
    <Toast
      :message="toastMessage"
      :type="toastType"
      v-model="showToast"
    />
  </SubWindowLayout>
</template>
