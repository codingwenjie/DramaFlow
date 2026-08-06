import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 平台信息
  platform: process.platform,

  // 视频合成：启动本地渲染，返回成片信息
  synthesize: (job: unknown) => ipcRenderer.invoke('synthesis:start', job),

  // 保存成片到用户指定位置
  saveVideo: (sourcePath: string, defaultName: string) =>
    ipcRenderer.invoke('synthesis:save-as', { sourcePath, defaultName }),

  // 监听合成进度，返回取消订阅函数
  onSynthesisProgress: (callback: (progress: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: unknown) => callback(progress)
    ipcRenderer.on('synthesis:progress', listener)
    return () => ipcRenderer.removeListener('synthesis:progress', listener)
  },

  // 示例：向主进程发送消息
  send: (channel: string, data: unknown) => {
    ipcRenderer.send(channel, data)
  },

  // 示例：监听主进程消息
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
})
