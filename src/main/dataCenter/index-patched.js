import fs from 'fs'
import path from 'path'
import EventEmitter from 'events'
import { BrowserWindow, ipcMain, dialog } from 'electron'
import schema from './schema'
import Store from 'electron-store'
import log from 'electron-log'
import { ensureDirSync } from 'common/filesystem'
import { IMAGE_EXTENSIONS } from 'common/filesystem/paths'

// Make keytar optional - fallback to unencrypted storage if not available
let keytar = null
try {
  keytar = require('keytar')
} catch (err) {
  log.warn('Keytar module not available, using unencrypted storage for tokens')
}

const DATA_CENTER_NAME = 'dataCenter'

class DataCenter extends EventEmitter {
  constructor (paths) {
    super()

    const { dataCenterPath, userDataPath } = paths
    this.dataCenterPath = dataCenterPath
    this.userDataPath = userDataPath
    this.serviceName = 'marktext'
    this.encryptKeys = ['githubToken']
    this.hasDataCenterFile = fs.existsSync(path.join(this.dataCenterPath, `./${DATA_CENTER_NAME}.json`))
    this.store = new Store({
      schema,
      name: DATA_CENTER_NAME
    })

    this.init()
  }

  init () {
    const defaultData = {
      imageFolderPath: path.join(this.userDataPath, 'images'),
      screenshotFolderPath: path.join(this.userDataPath, 'screenshot'),
      webImages: [],
      cloudImages: [],
      currentUploader: 'none',
      imageBed: {
        github: {
          owner: '',
          repo: '',
          branch: ''
        }
      }
    }

    if (!this.hasDataCenterFile) {
      this.store.set(defaultData)
      ensureDirSync(this.store.get('screenshotFolderPath'))
    }
    this._listenForIpcMain()
  }

  async getAll () {
    const { serviceName, encryptKeys } = this
    const data = this.store.store
    try {
      if (keytar) {
        const encryptData = await Promise.all(encryptKeys.map(key => {
          return keytar.getPassword(serviceName, key)
        }))
        const encryptObj = encryptKeys.reduce((acc, k, i) => {
          return {
            ...acc,
            [k]: encryptData[i]
          }
        }, {})

        return Object.assign(data, encryptObj)
      } else {
        // Fallback: get encrypted data from regular store
        const encryptObj = encryptKeys.reduce((acc, k) => {
          return {
            ...acc,
            [k]: this.store.get(`_encrypted_${k}`) || null
          }
        }, {})
        return Object.assign(data, encryptObj)
      }
    } catch (err) {
      log.error('Failed to decrypt secure keys:', err)
      return data
    }
  }

  addImage (key, url) {
    const items = this.store.get(key)
    const alreadyHas = items.some(item => item.url === url)
    let item
    if (alreadyHas) {
      item = items.find(item => item.url === url)
      item.timeStamp = +new Date()
    } else {
      item = {
        url,
        timeStamp: +new Date()
      }
      items.push(item)
    }

    ipcMain.emit('broadcast-web-image-added', { type: key, item })
    return this.store.set(key, items)
  }

  removeImage (type, url) {
    const items = this.store.get(type)
    const index = items.indexOf(url)
    const item = items[index]
    if (index === -1) return
    items.splice(index, 1)
    ipcMain.emit('broadcast-web-image-removed', { type, item })
    return this.store.set(type, items)
  }

  /**
   *
   * @param {string} key
   * return a promise
   */
  getItem (key) {
    const { encryptKeys, serviceName } = this
    if (encryptKeys.includes(key)) {
      if (keytar) {
        return keytar.getPassword(serviceName, key)
      } else {
        // Fallback: get from regular store
        const value = this.store.get(`_encrypted_${key}`)
        return Promise.resolve(value)
      }
    } else {
      const value = this.store.get(key)
      return Promise.resolve(value)
    }
  }

  async setItem (key, value) {
    const { encryptKeys, serviceName } = this
    if (key === 'screenshotFolderPath') {
      ensureDirSync(value)
    }
    ipcMain.emit('broadcast-user-data-changed', { [key]: value })
    if (encryptKeys.includes(key)) {
      try {
        if (keytar) {
          return await keytar.setPassword(serviceName, key, value)
        } else {
          // Fallback: store in regular store with warning prefix
          log.warn(`Storing ${key} without encryption - keytar not available`)
          return this.store.set(`_encrypted_${key}`, value)
        }
      } catch (err) {
        log.error('Keytar error:', err)
        // Fallback to unencrypted storage
        return this.store.set(`_encrypted_${key}`, value)
      }
    } else {
      return this.store.set(key, value)
    }
  }

  /**
   * Change multiple setting entries.
   *
   * @param {Object.<string, *>} settings A settings object or subset object with key/value entries.
   */
  setItems (settings) {
    if (!settings) {
      log.error('Cannot change settings without entires: object is undefined or null.')
      return
    }

    Object.keys(settings).forEach(key => {
      this.setItem(key, settings[key])
    })
  }

  _listenForIpcMain () {
    ipcMain.on('mt::UPDATE_USER_DATA', (e, key, value) => {
      this.setItem(key, value)
    })

    ipcMain.handle('mt::GET_USER_DATA_PATH', () => {
      const userDataPath = this.store.get('userDataPath')
      const isCustomPath = this.userDataPath !== userDataPath && userDataPath && fs.existsSync(userDataPath)
      const defaultPath = path.join(this.userDataPath, 'images')
      const imageFolderPath = this.store.get('imageFolderPath')
      let finalImagePath = imageFolderPath

      if (!finalImagePath) {
        finalImagePath = isCustomPath
          ? path.join(userDataPath, 'images')
          : defaultPath
      }
      return finalImagePath
    })

    ipcMain.on('mt::GET_USER_DATA', async e => {
      e.returnValue = await this.getAll()
    })

    ipcMain.handle('mt::GET_USER_DATA_ASYNC', async () => {
      return await this.getAll()
    })

    ipcMain.on('mt::GET_USER_DATA_ITEM', async (e, key) => {
      const value = await this.getItem(key)
      e.returnValue = value
    })

    ipcMain.on('mt::SELECT_FOLDER', async e => {
      const win = BrowserWindow.fromWebContents(e.sender)
      const ret = await dialog.showOpenDialog(win, {
        properties: ['openDirectory']
      })
      if (ret && ret.filePaths.length) {
        e.sender.send('mt::SELECTED_FOLDER', ret.filePaths[0])
      } else {
        e.sender.send('mt::SELECTED_FOLDER', null)
      }
    })

    ipcMain.on('mt::UPLOAD_IMAGE', async (e, filesPath = []) => {
      const availableFilesPath = filesPath.filter(filepath => {
        const extname = path.extname(filepath)
        return IMAGE_EXTENSIONS.some(ext => {
          const EXT_REG = new RegExp(ext, 'i')
          return EXT_REG.test(extname)
        })
      })
      const imageFolderPath = await this.getItem('imageFolderPath')
      ensureDirSync(imageFolderPath)
      const images = availableFilesPath.map(filepath => {
        const basename = path.basename(filepath)
        const extname = path.extname(filepath)
        const noHashPath = path.join(imageFolderPath, basename)
        const hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        const hashFilePath = path.join(imageFolderPath, `${path.basename(filepath, extname)}_${hash}${extname}`)
        if (fs.existsSync(noHashPath)) {
          const originFile = fs.readFileSync(filepath)
          const noHashFile = fs.readFileSync(noHashPath)
          if (originFile.equals(noHashFile)) {
            return {
              path: noHashPath
            }
          } else {
            fs.copyFileSync(filepath, hashFilePath)
            return {
              path: hashFilePath
            }
          }
        } else {
          fs.copyFileSync(filepath, noHashPath)
          return {
            path: noHashPath
          }
        }
      })
      e.sender.send('mt::UPLOAD_IMAGE_RESPONSE', images)
    })
  }
}

export default DataCenter
