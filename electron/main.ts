import { app, BrowserWindow, screen, ipcMain, clipboard, dialog, shell } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'fs'
import { createTray, destroyTray } from './tray'

createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

interface StickyNoteData {
  id: string
  content: string
  x: number
  y: number
  width: number
  height: number
  color: string
  isPinned: boolean
}

const stickyNoteWindows = new Map<string, BrowserWindow>()
let stickyNotePath: string = ''

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } =
    primaryDisplay.workAreaSize

  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'rabbit.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    width: 180,
    height: 200,
    x: screenWidth - 200, // 设置窗口x坐标
    y: screenHeight - 220, // 设置窗口y坐标
    autoHideMenuBar: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // 添加以下代码以确保窗口完全透明
  win.setBackgroundColor('#00000000')

  win.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  })

  win.on('move', () => {
    if (reminderWindow?.isVisible()) {
      const mainWindowBounds = win?.getBounds()
      if (mainWindowBounds) {
        const workArea = screen.getPrimaryDisplay().workAreaSize
        const reminderHeight = 150
        const mainWindowHeight = 200
        const gap = 20

        let reminderY = mainWindowBounds.y - reminderHeight - gap
        if (reminderY < 0) {
          reminderY = mainWindowBounds.y + mainWindowHeight + gap
        }
        if (reminderY + reminderHeight > workArea.height) {
          reminderY = workArea.height - reminderHeight - gap
        }

        reminderWindow.setPosition(mainWindowBounds.x, reminderY)
      }
    }
  })

  win.on('minimize', () => {
    win?.webContents.setBackgroundThrottling(true)
  })

  win.on('restore', () => {
    win?.webContents.setBackgroundThrottling(false)
  })

  win.webContents.setBackgroundThrottling(false)

  // win.webContents.openDevTools({ mode: 'detach' })
}

const subWindows = new Map<string, BrowserWindow>()

// 创建子窗口
function createSubWindow(windowId: string, title: string) {
  // 检查窗口是否已存在
  if (subWindows.has(windowId)) {
    // 如果存在，但是被小化了，要恢复
    if (subWindows.get(windowId)?.isMinimized()) {
      subWindows.get(windowId)?.restore()
    }
    subWindows.get(windowId)?.focus()
    return
  }

  const subWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 500,
    minHeight: 400,
    title: title,
    show: false,
    skipTaskbar: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  if (VITE_DEV_SERVER_URL) {
    subWindow.loadURL(VITE_DEV_SERVER_URL + '/#' + windowId)
  } else {
    // win.loadFile('dist/index.html')
    subWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      hash: windowId,
    })
  }

  // 窗口准备好后显示
  subWindow.once('ready-to-show', () => {
    subWindow.show()
    subWindow.focus()
  })

  // 窗口关闭时从Map中删除
  subWindow.on('closed', () => {
    subWindows.delete(windowId)
  })

  subWindows.set(windowId, subWindow)
  // 在页面加载完成后设置标题
  subWindow.webContents.on('did-finish-load', () => {
    subWindow.setTitle(title)
  })

  // 在页面DOM更新后也设置标题
  subWindow.webContents.on('dom-ready', () => {
    subWindow.setTitle(title)
  })

  // 打开调试
  // subWindow.webContents.openDevTools();
}

let reminderWindow: BrowserWindow | null = null
let clipboardInterval: ReturnType<typeof setInterval> | null = null

function createReminderWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight } =
    primaryDisplay.workAreaSize

  // 获取实时的主窗口位置
  const mainWindowBounds = win?.getBounds() || {
    x: screenWidth - 200,
    y: screenHeight - 150,
  }

  reminderWindow = new BrowserWindow({
    width: 180,
    height: 150,
    x: mainWindowBounds.x,
    y: mainWindowBounds.y - 210, // 在主窗口上方150像素
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    autoHideMenuBar: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    show: false, // 初始时不显示窗口
    skipTaskbar: true,
  })

  // 添加以下代码以确保窗口完全透明
  reminderWindow.setBackgroundColor('#00000000')

  if (VITE_DEV_SERVER_URL) {
    reminderWindow.loadURL(VITE_DEV_SERVER_URL + '/#/reminder-popup')
  } else {
    reminderWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      hash: 'reminder-popup',
    })
  }

  // 添加 IPC 监听器来控制窗口显示状态
  ipcMain.on('show-reminder-window', async () => {
    const workArea = screen.getPrimaryDisplay().workAreaSize
    const reminderHeight = 150
    const mainWindowHeight = 200
    const gap = 20

    if (reminderWindow?.isVisible()) {
      const mainWindowBounds = win?.getBounds() || {
        x: workArea.width - 200,
        y: workArea.height - 150,
      }
      let reminderY = mainWindowBounds.y - reminderHeight - gap
      if (reminderY < 0) {
        reminderY = mainWindowBounds.y + mainWindowHeight + gap
      }
      if (reminderY + reminderHeight > workArea.height) {
        reminderY = workArea.height - reminderHeight - gap
      }
      reminderWindow.setPosition(mainWindowBounds.x, reminderY)
      reminderWindow?.webContents.send('update-reminders')
      return
    }
    if (win !== null && win !== undefined) {
      win.restore()
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
    const mainWindowBounds = win?.getBounds() || {
      x: workArea.width - 200,
      y: workArea.height - 150,
    }
    let reminderY = mainWindowBounds.y - reminderHeight - gap
    if (reminderY < 0) {
      reminderY = mainWindowBounds.y + mainWindowHeight + gap
    }
    if (reminderY + reminderHeight > workArea.height) {
      reminderY = workArea.height - reminderHeight - gap
    }
    reminderWindow?.setPosition(mainWindowBounds.x, reminderY)
    reminderWindow?.show()
    reminderWindow?.webContents.send('update-reminders')
  })

  ipcMain.on('hide-reminder-window', () => {
    reminderWindow?.hide()
  })
  // reminderWindow?.webContents.openDevTools();
}

function createStickyNoteWindow(noteData: StickyNoteData) {
  if (stickyNoteWindows.has(noteData.id)) {
    const existingWindow = stickyNoteWindows.get(noteData.id)
    if (existingWindow) {
      existingWindow.restore()
      existingWindow.focus()
      return
    }
  }

  const stickyNoteWindow = new BrowserWindow({
    width: noteData.width,
    height: noteData.height,
    x: noteData.x,
    y: noteData.y,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    autoHideMenuBar: true,
    transparent: false,
    frame: false,
    alwaysOnTop: false,
    fullscreenable: false,
    resizable: true,
    hasShadow: true,
    skipTaskbar: true,
    minimizable: false,
    maximizable: false,
  })

  stickyNoteWindow.setBackgroundColor('#ffffff')

  if (VITE_DEV_SERVER_URL) {
    stickyNoteWindow.loadURL(VITE_DEV_SERVER_URL + '/#/sticky-note?id=' + noteData.id)
  } else {
    stickyNoteWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      hash: 'sticky-note?id=' + noteData.id,
    })
  }

  stickyNoteWindow.once('ready-to-show', () => {
    stickyNoteWindow.show()
    stickyNoteWindow.webContents.send('sticky-note-data', noteData)
  })

  stickyNoteWindow.on('closed', () => {
    stickyNoteWindows.delete(noteData.id)
  })

  stickyNoteWindow.on('move', () => {
    const bounds = stickyNoteWindow.getBounds()
    stickyNoteWindow.webContents.send('sticky-note-moved', {
      x: bounds.x,
      y: bounds.y,
    })
  })

  stickyNoteWindow.on('resize', () => {
    const bounds = stickyNoteWindow.getBounds()
    stickyNoteWindow.webContents.send('sticky-note-resized', {
      width: bounds.width,
      height: bounds.height,
    })
  })

  stickyNoteWindows.set(noteData.id, stickyNoteWindow)
}

function closeStickyNoteWindow(noteId: string) {
  const noteWindow = stickyNoteWindows.get(noteId)
  if (noteWindow) {
    noteWindow.close()
    stickyNoteWindows.delete(noteId)
  }
}

function updateStickyNotePosition(noteId: string, x: number, y: number) {
  const noteWindow = stickyNoteWindows.get(noteId)
  if (noteWindow) {
    noteWindow.setPosition(x, y)
  }
}

function updateStickyNoteSize(noteId: string, width: number, height: number) {
  const noteWindow = stickyNoteWindows.get(noteId)
  if (noteWindow) {
    noteWindow.setSize(width, height)
  }
}



app.on('window-all-closed', () => {
  if (clipboardInterval) {
    clearInterval(clipboardInterval)
    clipboardInterval = null
  }
  destroyTray()
  app.quit()
  subWindows.forEach((window) => {
    window.close()
  })
  stickyNoteWindows.forEach((window) => {
    window.close()
  })
  win = null
  reminderWindow = null
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createReminderWindow()
  createWindow()
  createTray(() => {
    if (win) {
      if (win.isMinimized()) {
        win.restore()
      }
      if (!win.isVisible()) {
        win.show()
      }
      win.focus()
    }
  }, () => {
    destroyTray()
    app.quit()
    subWindows.forEach((window) => {
      window.close()
    })
    win = null
    reminderWindow = null
  })

  ipcMain.on('exit-app', () => {
    if (clipboardInterval) {
      clearInterval(clipboardInterval)
      clipboardInterval = null
    }
    destroyTray()
    app.quit()
    subWindows.forEach((window) => {
      window.close()
    })
    win = null
    reminderWindow = null
  })

  // 主窗口最小化
  ipcMain.on('minimize-main-window', () => {
    if (win !== null && win !== undefined) {
      win.minimize()
    }
  })

  ipcMain.on('open-sub-window', (_event, { windowId, title }) => {
    createSubWindow(windowId, title)
  })

  ipcMain.on('task-changed', () => {
    win?.webContents.send('task-changed')
  })

  ipcMain.on('minimize-sub-window', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow && subWindows.has(focusedWindow.title)) {
      focusedWindow.minimize()
    }
  })

  ipcMain.on('close-sub-window', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.close()
    }
  })

  let currentClipboardDir = path.join(app.getPath('documents'), 'PetClipboard')
  if (!fs.existsSync(currentClipboardDir)) {
    fs.mkdirSync(currentClipboardDir, { recursive: true })
  }

  stickyNotePath = path.join(app.getPath('documents'), 'PetStickyNotes')
  if (!fs.existsSync(stickyNotePath)) {
    fs.mkdirSync(stickyNotePath, { recursive: true })
  }

  let lastClipboardContent = ''
  let lastClipboardImageHash = ''
  let clipboardMode: 'append' | 'new' = 'append'
  let clipboardAppendTime: 'day' | 'hour' | 'minute' = 'day'

  function getTimeKey(date: Date, timeMode: 'day' | 'hour' | 'minute'): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')

    switch (timeMode) {
      case 'minute':
        return `${year}${month}${day}_${hour}${minute}`
      case 'hour':
        return `${year}${month}${day}_${hour}`
      default:
        return `${year}${month}${day}`
    }
  }

  async function saveClipboardImage(image: Electron.NativeImage) {
    try {
      const imageData = image.toPNG() || image.toJPEG(90)
      if (!imageData) return

      const imageHash = imageData.toString('base64').substring(0, 100)
      if (imageHash === lastClipboardImageHash) return
      lastClipboardImageHash = imageHash

      const timestamp = Date.now()
      const ext = image.toPNG() ? 'png' : 'jpg'
      const fileName = `image_${timestamp}.${ext}`
      const filePath = path.join(currentClipboardDir, fileName)

      fs.writeFileSync(filePath, imageData)

      win?.webContents.send('clipboard-change', {
        type: 'image',
        content: filePath,
        fileName: fileName,
        filePath: filePath,
      })
    } catch (error) {
      console.error('Clipboard image save error:', error)
    }
  }

  async function saveClipboardText(text: string) {
    try {
      if (!text || !text.trim()) return

      const date = new Date()
      const timestamp = date.getTime()
      const timeStr = date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })

      if (clipboardMode === 'new') {
        const fileName = `text_${timestamp}.txt`
        const filePath = path.join(currentClipboardDir, fileName)

        fs.writeFileSync(filePath, text, 'utf-8')

        win?.webContents.send('clipboard-change', {
          type: 'text',
          content: text,
          fileName: fileName,
          filePath: filePath,
        })
      } else {
        const timeKey = getTimeKey(date, clipboardAppendTime)
        const fileName = `clipboard_${timeKey}.txt`
        const filePath = path.join(currentClipboardDir, fileName)

        const header = `\n=== ${timeStr} ===\n`
        const content = text + '\n\n'

        if (fs.existsSync(filePath)) {
          const existingContent = fs.readFileSync(filePath, 'utf-8')
          fs.writeFileSync(filePath, existingContent + header + content, 'utf-8')
        } else {
          fs.writeFileSync(filePath, header + content, 'utf-8')
        }

        win?.webContents.send('clipboard-change', {
          type: 'text',
          content: text,
          fileName: fileName,
          filePath: filePath,
        })
      }
    } catch (error) {
      console.error('Clipboard text save error:', error)
    }
  }

  async function handleClipboardChange() {
    try {
      const text = clipboard.readText()
      const image = clipboard.readImage()

      if (image && !image.isEmpty()) {
        await saveClipboardImage(image)
      } else if (text && text !== lastClipboardContent && text.trim()) {
        lastClipboardContent = text
        await saveClipboardText(text)
      }
    } catch (error) {
      console.error('Clipboard error:', error)
    }
  }

  clipboardInterval = setInterval(handleClipboardChange, 1000)

  ipcMain.on('set-clipboard-mode', (_event, mode: 'append' | 'new') => {
    clipboardMode = mode
  })

  ipcMain.on('set-clipboard-append-time', (_event, time: 'day' | 'hour' | 'minute') => {
    clipboardAppendTime = time
  })

  ipcMain.on('get-clipboard-dir', (event) => {
    event.reply('clipboard-dir', currentClipboardDir)
  })

  ipcMain.on('set-clipboard-dir', (_event, newDir) => {
    if (newDir && fs.existsSync(newDir)) {
      currentClipboardDir = newDir
    }
  })

  ipcMain.handle('select-clipboard-dir', async () => {
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
    })
    if (!result.canceled && result.filePaths.length > 0) {
      currentClipboardDir = result.filePaths[0]
      return currentClipboardDir
    }
    return null
  })

  ipcMain.on('open-clipboard-dir', () => {
    try {
      shell.openPath(currentClipboardDir)
    } catch (e) {
      console.error('Failed to open clipboard directory:', e)
    }
  })

  

  ipcMain.on('create-sticky-note', (_event, noteData: StickyNoteData) => {
    createStickyNoteWindow(noteData)
  })

  ipcMain.on('restore-sticky-notes', (_event, notes: StickyNoteData[]) => {
    notes.forEach((note) => {
      createStickyNoteWindow(note)
    })
  })

  ipcMain.on('close-sticky-note', (_event, noteId: string) => {
    closeStickyNoteWindow(noteId)
  })

  ipcMain.on('update-sticky-note-position', (_event, { noteId, x, y }) => {
    updateStickyNotePosition(noteId, x, y)
  })

  ipcMain.on('update-sticky-note-size', (_event, { noteId, width, height }) => {
    updateStickyNoteSize(noteId, width, height)
  })

  ipcMain.handle('set-pin', (_event, val: boolean) => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    if (focusedWindow) {
      focusedWindow.setAlwaysOnTop(val)
      if (process.platform === 'darwin') {
        focusedWindow.setVisibleOnAllWorkspaces(val, {
          visibleOnFullScreen: true,
        })
      }
    }
    return true
  })

  ipcMain.on('get-sticky-note-path', (event) => {
    event.reply('sticky-note-path', stickyNotePath)
  })

  ipcMain.on('set-sticky-note-path', (_event, newPath) => {
    if (newPath) {
      if (!fs.existsSync(newPath)) {
        fs.mkdirSync(newPath, { recursive: true })
      }
      stickyNotePath = newPath
      console.log('Sticky note path updated to:', stickyNotePath)
    }
  })

  ipcMain.handle('select-sticky-note-path', async () => {
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
    })
    if (!result.canceled && result.filePaths.length > 0) {
      stickyNotePath = result.filePaths[0]
      return stickyNotePath
    }
    return null
  })

  ipcMain.on('open-sticky-note-path', () => {
    try {
      shell.openPath(stickyNotePath)
    } catch (e) {
      console.error('Failed to open sticky note directory:', e)
    }
  })

  ipcMain.handle('save-sticky-note-to-file', async (_event, { noteId, content }) => {
    try {
      if (!content || !content.trim()) {
        return { success: true, skipped: true, message: '内容为空，跳过保存' }
      }
      
      console.log('Saving sticky note:', { noteId, content: content?.substring(0, 50) + '...', stickyNotePath })
      if (!fs.existsSync(stickyNotePath)) {
        fs.mkdirSync(stickyNotePath, { recursive: true })
        console.log('Created sticky note directory:', stickyNotePath)
      }
      
      const now = new Date()
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
      const hourStr = String(now.getHours()).padStart(2, '0')
      const minuteStr = String(now.getMinutes()).padStart(2, '0')
      const fileName = `note_${dateStr}_${hourStr}${minuteStr}.txt`
      const filePath = path.join(stickyNotePath, fileName)
      
      let finalFilePath = filePath
      let counter = 1
      while (fs.existsSync(finalFilePath)) {
        finalFilePath = path.join(stickyNotePath, `note_${dateStr}_${hourStr}${minuteStr}_${counter}.txt`)
        counter++
      }
      
      fs.writeFileSync(finalFilePath, content, 'utf-8')
      console.log('Sticky note saved to:', finalFilePath)
      return { success: true, filePath: finalFilePath }
    } catch (e) {
      console.error('Failed to save sticky note:', e)
      return { success: false, error: (e as Error).message }
    }
  })
})
