let dbName = 'sampleDB'
let dbVersion = '1'
let storeName  = 'counts'
let count = 0

let openRequest = indexedDB.open(dbName, dbVersion)
openRequest.onerror = () => console.log('DB connection failed.')

//DBのバージョン更新(DBの新規作成も含む)時のみ実行
openRequest.onupgradeneeded = event => {
  let db = event.target.result
  const objectStore = db.createObjectStore(storeName, { keyPath : 'id' })
  objectStore.createIndex('id', 'id', { unique: true })
  objectStore.createIndex('cnt', 'cnt', { unique: false })
  console.log('DB upgraded!!')
}

//onupgradeneededの後に実行。更新がない場合はこれだけ実行
openRequest.onsuccess = event => {

  let db = event.target.result
  let trans = db.transaction(storeName, 'readonly')
  let store = trans.objectStore(storeName)
  let getReq = store.get(1)
  getReq.onerror = () => {
    count = 0
    console.log('DB get failed.')
  }
  getReq.onsuccess = event => {
    if (typeof event.target.result === 'undefined') count = 0
    else {
      count = event.target.result.cnt
      count++
      document.getElementById('countDisplay').innerHTML = count
    }
    let trans = db.transaction(storeName, 'readwrite')
    let store = trans.objectStore(storeName)
    let putReq = store.put({
      id: 1,
      cnt: count
    })
    putReq.onsuccess = () => console.log('upgraded successful!!')
  }
  document.getElementById('countReset').addEventListener('click', () => {
    count = 0
    let putReq = updateDb(db, storeName, count)

    putReq.onerror = () => console.log('upgrade failed: reset')
    putReq.onsuccess = () => {
      console.log('upgrade successful: reset')
      document.getElementById('countDisplay').innerHTML = count
    }
  })
}
const updateDb = (db, name, cnt) => {
  let trans = db.transaction(name, 'readwrite')
  let store = trans.objectStore(name)
  return store.put({
    id: 1,
    cnt: cnt
  })
}