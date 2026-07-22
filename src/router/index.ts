import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import ReminderPopup from '../views/ReminderPopup.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/task',
    name: 'Task',
    component: () => import('../views/TodoView.vue'),
  },
  {
    path: '/reminder',
    name: 'Reminder',
    component: () => import('../views/ReminderView.vue'),
  },
  {
    path: '/pet',
    name: 'Pet',
    component: () => import('../views/PetView.vue'),
  },
  
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
  },
  {
    path: '/sticky-note',
    name: 'StickyNote',
    component: () => import('../views/StickyNote.vue'),
  },
  {
    path: '/reminder-popup',
    name: 'reminder-popup',
    component: ReminderPopup,
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
