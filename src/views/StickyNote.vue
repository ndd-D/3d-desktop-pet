<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { StickyNote } from '../db'
import db from '../db'

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const note = ref<StickyNote>({
  id: '',
  content: '',
  x: 100,
  y: 100,
  width: 240,
  height: 200,
  color: '#fff3cd',
  isPinned: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

const isResizing = ref(false)
const showSaveNotification = ref(false)
const saveNotificationText = ref('')
const saveNotificationType = ref<'success' | 'error'>('success')
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })

const colors = [
  '#fff3cd',
  '#d4edda',
  '#d1ecf1',
  '#f8d7da',
  '#e2e3e5',
  '#fff5f5',
  '#f0fff4',
  '#ebf5ff',
]

onMounted(async () => {
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1])
  const noteId = urlParams.get('id')
  
  if (noteId) {
    const savedNote = await db.stickyNotes.get(noteId)
    if (savedNote) {
      note.value = savedNote
    }
  }

  window.ipcRenderer.on('sticky-note-data', (_event, data) => {
    note.value = { ...note.value, ...data }
  })

  function scheduleSaveNote() {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(() => {
      saveNote()
    }, 300)
  }

  window.ipcRenderer.on('sticky-note-moved', (_event, { x, y }) => {
    note.value.x = x
    note.value.y = y
    scheduleSaveNote()
  })

  window.ipcRenderer.on('sticky-note-resized', (_event, { width, height }) => {
    note.value.width = width
    note.value.height = height
    scheduleSaveNote()
  })
})

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  window.ipcRenderer.removeAllListeners('sticky-note-data')
  window.ipcRenderer.removeAllListeners('sticky-note-moved')
  window.ipcRenderer.removeAllListeners('sticky-note-resized')
})

async function saveNote() {
  if (note.value.id) {
    await db.updateStickyNote(note.value.id, {
      content: note.value.content,
      x: note.value.x,
      y: note.value.y,
      width: note.value.width,
      height: note.value.height,
      color: note.value.color,
    })
    await window.ipcRenderer.invoke('save-sticky-note-to-file', {
      noteId: note.value.id,
      content: note.value.content,
    })
  }
}

async function saveNoteToFile() {
  const noteId = note.value.id || `temp_${Date.now()}`
  return await window.ipcRenderer.invoke('save-sticky-note-to-file', {
    noteId,
    content: note.value.content,
  })
}

function showNotification(text: string, type: 'success' | 'error') {
  saveNotificationText.value = text
  saveNotificationType.value = type
  showSaveNotification.value = true
  setTimeout(() => {
    showSaveNotification.value = false
  }, 2000)
}

function handleContentChange() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    saveNote()
  }, 500)
}

async function closeNote() {
  try {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    if (note.value.id) {
      await db.updateStickyNote(note.value.id, {
        content: note.value.content,
        isPinned: note.value.isPinned,
      })
    }

    const result = await saveNoteToFile()
    
    if (result.success) {
      if (result.skipped) {
        showNotification('内容为空，跳过保存', 'success')
      } else {
        showNotification('便签已保存', 'success')
      }
    } else {
      showNotification('保存失败', 'error')
    }
    
    if (note.value.id) {
      await db.deleteStickyNote(note.value.id)
    }

    window.ipcRenderer.send('close-sticky-note', note.value.id || 'unknown')
    setTimeout(() => {
      window.close()
    }, 100)
  } catch (e) {
    console.error('Close note error:', e)
    window.close()
  }
}

function changeColor(color: string) {
  note.value.color = color
  saveNote()
}

async function togglePin() {
  const oldValue = note.value.isPinned
  const newValue = !oldValue
  
  try {
    note.value.isPinned = newValue
    await window.electronAPI.setPin(newValue)
    saveNote()
  } catch (error) {
    console.error('设置置顶失败:', error)
    note.value.isPinned = oldValue
  }
}

function handleResizeStart(e: MouseEvent) {
  isResizing.value = true
  resizeStart.value = {
    x: e.clientX,
    y: e.clientY,
    width: note.value.width,
    height: note.value.height,
  }

  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeUp)
}

function handleResizeMove(e: MouseEvent) {
  if (!isResizing.value) return

  const dx = e.clientX - resizeStart.value.x
  const dy = e.clientY - resizeStart.value.y

  const newWidth = Math.max(120, resizeStart.value.width + dx)
  const newHeight = Math.max(100, resizeStart.value.height + dy)

  window.ipcRenderer.send('update-sticky-note-size', {
    noteId: note.value.id,
    width: newWidth,
    height: newHeight,
  })
}

function handleResizeUp() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeUp)
}
</script>

<template>
  <div
    class="sticky-note"
    :style="{
      width: note.width + 'px',
      height: note.height + 'px',
      backgroundColor: note.color,
    }"
  >
    <div class="note-header">
      <div class="color-picker">
        <div
          v-for="color in colors"
          :key="color"
          class="color-dot"
          :style="{ backgroundColor: color }"
          @click.stop="changeColor(color)"
          :class="{ active: color === note.color }"
        ></div>
      </div>
      <div class="note-actions">
        <button class="note-pin" @click.stop="togglePin" :title="note.isPinned ? '取消置顶' : '置顶'" :class="{ active: note.isPinned }">
          📌
        </button>
        <button class="note-close" @click.stop="closeNote" title="关闭">✕</button>
      </div>
    </div>
    
    <div class="note-content">
      <textarea
        v-model="note.content"
        @input="handleContentChange"
        class="note-textarea"
        placeholder="在这里输入便签内容..."
        :style="{ backgroundColor: note.color }"
      ></textarea>
    </div>
    
    <Transition name="notification">
      <div v-if="showSaveNotification" class="save-notification" :class="saveNotificationType">
        {{ saveNotificationText }}
      </div>
    </Transition>
    
    <div class="resize-handle" @mousedown.stop="handleResizeStart"></div>
  </div>
</template>

<style scoped>
.sticky-note {
  position: relative;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  cursor: grab;
  user-select: none;
  -webkit-app-region: drag;
}

.note-header:active {
  cursor: grabbing;
}

.color-picker {
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
  border: 2px solid transparent;
  -webkit-app-region: no-drag;
}

.color-dot:hover {
  transform: scale(1.2);
}

.color-dot.active {
  border-color: #333;
}

.note-actions {
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.note-pin,
.note-close {
  width: 24px;
  height: 24px;
  border: none;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
  -webkit-app-region: no-drag;
}

.note-pin:hover,
.note-close:hover {
  background: rgba(0, 0, 0, 0.15);
}

.note-pin.active {
  background: rgba(251, 191, 36, 0.2);
  transform: rotate(45deg);
}

.note-close {
  color: #666;
}

.note-close:hover {
  color: #e74c3c;
}

.note-content {
  flex: 1;
  padding: 8px;
  overflow: hidden;
}

.note-textarea {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  user-select: text;
}

.note-textarea::placeholder {
  color: #999;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: se-resize;
  background: transparent;
}

.resize-handle::after {
  content: '';
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  border-right: 2px solid rgba(0, 0, 0, 0.3);
  border-bottom: 2px solid rgba(0, 0, 0, 0.3);
}

.save-notification {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: white;
  z-index: 100;
}

.save-notification.success {
  background: rgba(34, 197, 94, 0.9);
}

.save-notification.error {
  background: rgba(239, 68, 68, 0.9);
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

.note-textarea::-webkit-scrollbar {
  width: 6px;
}

.note-textarea::-webkit-scrollbar-track {
  background: transparent;
}

.note-textarea::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.note-textarea::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>