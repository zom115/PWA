'use strict'
const path = 'scripts/sw.js'
navigator.serviceWorker.register(path)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(path).then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope)
    }, err => {
      console.log('ServiceWorker registration failed: ', err)
    })
  })
}
/*
  onupgradeneeded: DBのバージョン更新(DBの新規作成も含む)時のみ実行
  onsuccess: onupgradeneededの後に実行。更新がない場合はこれだけ実行
*/
const dbName = 'sampleDB'
const dbVersion = 1
const storeName  = 'sampleStore'
const idName = 'sampleId'
const materialName = 'crude'
// let inventory = []
const countLimit = 10 * 1e3
const coolTimeLimit = 250
let getTime = 0
let takeFlag = false
let db
const openDb = () => {
  console.log('openDb ...')
  const request = indexedDB.open(dbName, dbVersion)
  request.onsuccess = () => {
    db = request.result
    displayPubList()
    console.log('openDb DONE')
  }
  request.onupgradeneeded = e => {
    console.log('openDb.onupgradeneeded')
    e.target.result.createObjectStore(storeName, {keyPath: idName})
  }
  request.onerror = e => console.log('openDb:', e.target.errorCode)
}
const deleteDb = () => {
  console.log('deleteDb ...')
  const deleteRequest = indexedDB.deleteDatabase(dbName)
  deleteRequest.onsuccess = () => {
    console.log('delete DB success')
    openDb()
  }
  deleteRequest.onblocked = () => {
    console.log('delete DB blocked')
    db.close()
  }
  deleteRequest.onerror = () => console.log('delete DB error')
}
const getObjectStore = (store_name, mode) => {
  let tx = db.transaction(store_name, mode)
  return tx.objectStore(store_name)
}
const clearObjectStore = (store_name) => {
  console.log('clear ...')
  const store = getObjectStore(store_name, 'readwrite')
  const request = store.clear()
  request.onsuccess = () => {
    displayPubList()
    console.log('cleared')
  }
  request.onerror = e => {
    console.error('clearObjectStore:', e.target.errorCode)
  }
}
const displayPubList = store => {
  if (typeof store === 'undefined') store = getObjectStore(storeName, 'readonly')
  const getFromId = store.get(materialName)
  getFromId.onsuccess = () => {
    const a = getFromId.result
    const materialValue = (a !== undefined) ? a.value : 0
    // document.getElementById`main`.textContent = `${materialName}: ${materialValue}`
    document.getElementById`testText`.textContent = `${materialName}:`
    document.getElementById`testValue`.textContent = materialValue
    document.getElementById`testButton`.textContent = 'Cost: 10s'
    document.getElementById`progress`.value = 0
    document.getElementById`testTime`.textContent = ''
  }
}
const addPublication = arg => {
  console.log('add ...')
  const store = getObjectStore(storeName, 'readwrite')
  const getFromId = store.get(arg)
  getFromId.onsuccess = () => {
    const a = getFromId.result
    const num = (a !== undefined) ? a.value + 1 : 1
    const data = {[idName]: arg, value: num}
    let req = store.put(data)
    req.onsuccess = () => {
      console.log('Insertion in DB successful')
      displayPubList()
    }
    req.onerror = () => {
      console.error('addPublication error', req.error)
    }
  }
}
const addEventListeners = msg => {
  console.log('addEventListeners')
  // document.getElementById`add`.addEventListener('click', () => addPublication(materialName))
  document.getElementById`clear`.addEventListener('click', () => clearObjectStore(storeName))
  document.getElementById`deleteDb`.addEventListener('click', () => deleteDb())
  document.getElementById`testButton`.addEventListener('click', e => {
    e.target.disabled = true
    getTime = Date.now()
  })
}
const materialProcess = () => {
  if (getTime !== 0) {
    let elapsedTime = Date.now() - getTime
    let rate = elapsedTime / countLimit
    if (countLimit <= elapsedTime) {
      if (!takeFlag) {
        addPublication(materialName)
        takeFlag = true
      }
      rate = (coolTimeLimit - (elapsedTime - countLimit)) / coolTimeLimit
      if (countLimit + coolTimeLimit <= elapsedTime) {
        document.getElementById`testButton`.disabled = false
        getTime = 0
        takeFlag = false
      }
    }
    document.getElementById`progress`.value = rate
    document.getElementById`testTime`.textContent = countLimit <= elapsedTime ? ''
    : formatTime(countLimit - elapsedTime)
  }
}
let openTime = Date.now()
document.getElementById`timeReset`.addEventListener('click', () => openTime = Date.now())
const formatTime = argTime => {
  const mm = ('0' + Math.floor(argTime / 6e4)).slice(-2)
  const ss = ('0' + Math.floor(argTime % 6e4 / 1e3)).slice(-2)
  const ms = ('00' + argTime % 1e3).slice(-3)
  let time = ms
  if (0 < mm || 0 < ss) time = ss + ':' + time
  if (0 < mm) time = mm + ':' + time
  return time
}
const main = () => {
  materialProcess()
  document.getElementById`conectedTime`.textContent = formatTime(Date.now() - openTime)
  window.requestAnimationFrame(main)
}
openDb()
addEventListeners()
main()