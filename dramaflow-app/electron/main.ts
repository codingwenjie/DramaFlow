import { app, BrowserWindow, Menu, dialog, ipcMain, net, protocol } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'
import fs from 'fs'
import { pathToFileURL } from 'url'
import { runSynthesis } from './synthesis'
import type { SynthesisJobInput, SynthesisProgress, SynthesisResult } from './synthesis'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null

// 本地成片预览协议：dramaflow-media://local/?path=<encodeURIComponent(绝对路径)>
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'dramaflow-media',
    privileges: { secure: true, supportFetchAPI: true, stream: true },
  },
])

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'DramaFlow',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  return mainWindow
}

function createAppMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'DramaFlow',
      submenu: [
        { role: 'about', label: '关于 DramaFlow' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' },
        { role: 'hideOthers', label: '隐藏其他' },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '文件',
      submenu: [
        {
          label: '新建项目',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('menu-new-project')
          },
        },
        { type: 'separator' },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('menu-save')
          },
        },
        {
          label: '导出项目',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            BrowserWindow.getFocusedWindow()?.webContents.send('menu-export')
          },
        },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'resetZoom', label: '重置缩放' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 DramaFlow',
          click: () => {
            const { dialog } = require('electron')
            dialog.showMessageBox({
              type: 'info',
              title: 'DramaFlow',
              message: 'DramaFlow v1.0.0',
              detail: 'AI 短剧生成提效工具\n基于 Electron + React 构建',
            })
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// ===== 自动更新 =====
if (!isDev) {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    console.log('正在检查更新...')
  })

  autoUpdater.on('update-available', (info) => {
    dialog
      .showMessageBox({
        type: 'info',
        title: '发现新版本',
        message: `DramaFlow ${info.version} 可用`,
        detail: '是否立即下载更新？',
        buttons: ['下载更新', '稍后提醒'],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate()
        }
      })
  })

  autoUpdater.on('update-not-available', () => {
    console.log('当前已是最新版本')
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-download-progress', progress.percent)
    mainWindow?.setProgressBar(progress.percent / 100)
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.setProgressBar(-1)
    dialog
      .showMessageBox({
        type: 'info',
        title: '更新已下载',
        message: '更新已下载完成，是否立即重启安装？',
        buttons: ['立即重启', '稍后'],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
  })

  autoUpdater.on('error', (error) => {
    console.error('自动更新出错:', error.message)
  })
}

app.whenReady().then(() => {
  protocol.handle('dramaflow-media', (request) => {
    const url = new URL(request.url)
    const filePath = url.searchParams.get('path')
    if (!filePath) {
      return new Response('Bad Request', { status: 400 })
    }
    return net.fetch(pathToFileURL(filePath).toString())
  })

  ipcMain.handle('synthesis:start', async (event, job: SynthesisJobInput): Promise<SynthesisResult> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const sendProgress = (p: SynthesisProgress) => win?.webContents.send('synthesis:progress', p)
    const outputDir = path.join(app.getPath('userData'), 'exports')
    return runSynthesis(job, sendProgress, outputDir)
  })

  ipcMain.handle('synthesis:save-as', async (event, payload: { sourcePath: string; defaultName: string }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.SaveDialogOptions = {
      title: '保存成片',
      defaultPath: payload.defaultName,
      filters: [{ name: 'MP4 视频', extensions: ['mp4'] }],
    }
    const { canceled, filePath } = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    if (canceled || !filePath) return null
    fs.copyFileSync(payload.sourcePath, filePath)
    return filePath
  })

  createAppMenu()
  createWindow()
  // 应用启动后 5 秒检查更新
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates()
    }, 5000)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
