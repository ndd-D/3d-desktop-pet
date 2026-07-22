<script setup lang="ts">
import { computed } from 'vue'
import { useModel } from '../composable/useModel'
import db from '../db'

const { loopAction } = useModel()

const emit = defineEmits(['close'])

interface MenuItem {
  id: string
  label: string
  icon: string
}

const menuItems = computed<MenuItem[]>(() => [
  { id: 'task', label: '任务管理', icon: '📝' },
  { id: 'reminder', label: '提醒管理', icon: '⏰' },
  { id: 'sticky-note', label: '新建便签', icon: '📌' },
  {
    id: 'pet',
    label: loopAction.value.isLoop ? '暂停动画' : '播放动画',
    icon: '🐶',
  },
  { id: 'settings', label: '设置', icon: '⚙️' },
])

const handleMenuClick = async (menuId: string) => {
  const ipcRenderer = window.ipcRenderer

  switch (menuId) {
    case 'task':
      ipcRenderer.send('open-sub-window', {
        windowId: 'task',
        title: '任务管理',
      })
      break
    case 'reminder':
      ipcRenderer.send('open-sub-window', {
        windowId: 'reminder',
        title: '提醒管理',
      })
      break
    case 'sticky-note':
      const colors = ['#fff3cd', '#d4edda', '#d1ecf1', '#f8d7da', '#e2e3e5']
      const randomColor = colors[Math.floor(Math.random() * colors.length)]
      const noteX = Math.random() * (window.screen.width - 240) + 50
      const noteY = Math.random() * (window.screen.height - 200) + 50
      
      const savedId = await db.addStickyNote({
        content: '',
        x: noteX,
        y: noteY,
        width: 240,
        height: 200,
        color: randomColor,
        isPinned: false,
      })
      
      ipcRenderer.send('create-sticky-note', {
        id: savedId.toString(),
        content: '',
        x: noteX,
        y: noteY,
        width: 240,
        height: 200,
        color: randomColor,
        isPinned: false,
      })
      break
    case 'pet':
      if (loopAction.value.isLoop) {
        loopAction.value.isLoop = false
      } else {
        loopAction.value.isLoop = true
      }
      break
    case 'settings':
      ipcRenderer.send('open-sub-window', {
        windowId: 'settings',
        title: '设置',
      })
      break
  }
  emit('close')
}
</script>

<template>
  <div class="context-menu">
    <div
      v-for="item in menuItems"
      :key="item.id"
      @click="handleMenuClick(item.id)"
      class="menu-item"
      :title="item.label"
    >
      <span>{{ item.icon }}</span>
    </div>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  left: 8px;
  top: 40px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 999;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.menu-item:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.menu-item:active {
  transform: scale(0.95);
  background: rgba(239, 239, 239, 0.9);
}

.menu-item:hover::after {
  content: attr(title);
  position: absolute;
  left: 32px;
  background: rgba(55, 65, 81, 0.95);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.2s ease;
  z-index: 1000;
}
</style>
