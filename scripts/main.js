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
let count = 0
// let inventory = []
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
    const num = (a !== undefined) ? a.value : 0
    document.getElementById`main`.textContent = `${materialName}: ${num}`
  }
}
const newViewerFrame = () => {}
const setInViewer = key => {}
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
const deletePublicationFromBib = biblioid => {}
const deletePublication = (key, store) => {}
const addEventListeners = msg => {
  console.log('addEventListeners')
  document.getElementById`add`.addEventListener('click', () => addPublication(materialName))
  document.getElementById`clear`.addEventListener('click', () => clearObjectStore(storeName))
  document.getElementById`deleteDb`.addEventListener('click', () => deleteDb())
}
let openTime = Date.now()
document.getElementById`timeReset`.addEventListener('click', () => openTime = Date.now())
const main = () => {
  const connectedTime = Date.now() - openTime
  const mm = ('0' + Math.floor(connectedTime / 6e4)).slice(-2)
  const ss = ('0' + Math.floor(connectedTime % 6e4 / 1e3)).slice(-2)
  const ms = ('00' + connectedTime % 1e3).slice(-3)
  let time = ms
  if (0 < mm || 0 < ss) time = ss + ':' + time
  if (0 < mm) time = mm + ':' + time
  document.getElementById`conectedTime`.textContent = time
  window.requestAnimationFrame(main)
}
openDb()
addEventListeners()
main()