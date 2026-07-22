<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  title: string
}>()

const isMinimizeHovered = ref(false)
const isCloseHovered = ref(false)

function minimizeWindow() {
  window.ipcRenderer.send('minimize-sub-window')
}

function closeWindow() {
  window.ipcRenderer.send('close-sub-window')
}
</script>

<template>
  <div class="sub-window-layout">
    <header class="window-header">
      <div class="window-title">
        <h1>{{ title }}</h1>
      </div>
      <div class="window-controls">
        <button
          class="control-btn minimize-btn"
          @click="minimizeWindow"
          @mouseenter="isMinimizeHovered = true"
          @mouseleave="isMinimizeHovered = false"
          title="最小化"
        >
          <span class="minimize-line"></span>
        </button>
        <button
          class="control-btn close-btn"
          @click="closeWindow"
          @mouseenter="isCloseHovered = true"
          @mouseleave="isCloseHovered = false"
          title="关闭"
        >
          <span class="close-x">✕</span>
        </button>
      </div>
    </header>
    <main class="content">
      <slot></slot>
    </main>
  </div>
</template>

<style scoped>
.sub-window-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.window-header {
  background: #f5f5f5;
  padding: 0;
  border-bottom: 1px solid #e8e8e8;
  -webkit-app-region: drag;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 38px;
}

.window-title {
  flex: 1;
  padding-left: 16px;
}

.window-title h1 {
  font-size: 14px;
  margin: 0;
  color: #333;
  font-weight: 500;
  -webkit-app-region: no-drag;
}

.window-controls {
  display: flex;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 46px;
  height: 38px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.minimize-btn:hover {
  background-color: rgba(0, 0, 0, 0.08);
}

.minimize-line {
  width: 12px;
  height: 1px;
  background-color: #333;
}

.close-btn:hover {
  background-color: #e81123;
}

.close-btn:hover .close-x {
  color: #ffffff;
}

.close-x {
  font-size: 12px;
  color: #333;
  transition: color 0.2s ease;
  line-height: 1;
}

.content {
  flex: 1;
  padding: 0;
  overflow-y: auto;
}
</style>
