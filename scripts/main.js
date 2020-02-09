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
  request.onsuccess = () => console.log('cleared')
  request.onerror = e => {
    console.error('clearObjectStore:', e.target.errorCode)
    displayActionFailure(request.error)
  }
}
const displayPubList = store => {
  if (typeof store === 'undefined') store = getObjectStore(storeName, 'readonly')
  const getFromId = store.get(materialName)
  getFromId.onsuccess = () => {
    console.log(getFromId)
    console.log(getFromId.result)
    document.getElementById`main`.textContent = `${materialName}: 0`
  }
}
const newViewerFrame = () => {}
const setInViewer = key => {}
const addPublication = arg => {
  console.log('add ...')
  const store = getObjectStore(storeName, 'readwrite')
  const data = {[idName]: arg}
  let req = store.put(data)
  req.onsuccess = () => {
    console.log('Insertion in DB successful')
    // displayActionSuccess()
    // displayPubList(store)
  }
  req.onerror = () => {
    console.error('addPublication error', req.error)
    // displayActionFailure(req.error)
  }
}
const deletePublicationFromBib = biblioid => {}
const deletePublication = (key, store) => {}
const displayActionSuccess = msg => {}
const displayActionFailure = msg => {}
const addEventListeners = msg => {
  console.log('addEventListeners')
  document.getElementById`add`.addEventListener('click', () => addPublication(materialName))
  document.getElementById`get`.addEventListener('click', () => displayPubList())
  document.getElementById`clear`.addEventListener('click', () => clearObjectStore(storeName))
  document.getElementById`deleteDb`.addEventListener('click', () => deleteDb())
}
let openTime = Date.now()
document.getElementById`timeReset`.addEventListener('click', () => openTime = Date.now())
const main = () => {
  // document.getElementById`main`.insertAdjacentHTML('afterend', '<p>a</p>')
  // document.getElementById`main`.innerHTML = '<p>a</p>'
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