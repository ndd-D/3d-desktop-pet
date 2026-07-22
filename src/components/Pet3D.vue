<script setup lang="ts">
import { useAnimations, useGLTF } from '@tresjs/cientos'
import * as THREE from 'three'
import { ref, watch, onUnmounted } from 'vue'
import { useModel } from '../composable/useModel'

const { url, loopAction, clickAction, clickActionPlay } = useModel()

watch(clickActionPlay, () => {
  if (clickActionPlay.value) {
    hello()
  }
})

watch(
  loopAction,
  () => {
    if (loopAction.value.isLoop) {
      currentLoopAction.value.play()
      isPlaying.value = true
    } else {
      currentLoopAction.value.stop()
      isPlaying.value = false
    }
  },
  { deep: true }
)

const isPlaying = ref(false)
const animationFinishedHandler = ref<(() => void) | null>(null)

const modelUrl = ref('')

const modules = import.meta.glob('/public/*.glb', {
  eager: true,
  import: 'default',
})

modelUrl.value = modules[`/public/${url.value}`] as string

const { scene: model, animations } = await useGLTF(modelUrl.value)

const { actions } = useAnimations(animations, model)

const currentClickAction = ref<any>(null)

currentClickAction.value = Object.keys(actions).includes(
  clickAction.value.action
)
  ? actions[clickAction.value.action]
  : null

const currentLoopAction = ref<any>(null)

currentLoopAction.value = Object.keys(actions).includes(loopAction.value.action)
  ? actions[loopAction.value.action]
  : null

if (loopAction.value.isLoop && currentLoopAction.value) {
  currentLoopAction.value.play()
  isPlaying.value = true
}

const hello = () => {
  if (!clickAction.value.isEnable || !currentClickAction.value) {
    return
  }
  if (isPlaying.value) {
    currentLoopAction.value.stop()
  }
  currentClickAction.value.play()
  currentClickAction.value.setLoop(THREE.LoopOnce, 1)
  currentClickAction.value.clampWhenFinished = true

  const onAnimationFinished = () => {
    currentClickAction.value.stop()
    clickActionPlay.value = false
    if (isPlaying.value) {
      currentLoopAction.value.play()
    }
  }

  if (animationFinishedHandler.value && currentClickAction.value?.getMixer()) {
    currentClickAction.value.getMixer().removeEventListener('finished', animationFinishedHandler.value)
  }

  animationFinishedHandler.value = onAnimationFinished
  currentClickAction.value.getMixer().addEventListener('finished', onAnimationFinished)
}

onUnmounted(() => {
  if (animationFinishedHandler.value && currentClickAction.value?.getMixer()) {
    currentClickAction.value.getMixer().removeEventListener('finished', animationFinishedHandler.value)
  }
  if (currentLoopAction.value) {
    currentLoopAction.value.stop()
  }
  if (currentClickAction.value) {
    currentClickAction.value.stop()
  }
})
</script>

<template>
  <primitive :object="model" />
</template>
