{'use strict'
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
const dbName = 'indexedDB'
const dbVersion = 1
const storeName = ['site', 'market', 'statistics', 'setting']
const idName = 'site'
const materialName = 'crude'
let firstBuildingArray = [{
    name: 'Storage Tank'
  }, {
    name: 'Generator Engine'
  }, {
    name: 'Rig'
  }
]
let referenceLimit = 3
const countLimit = 10 * 1e3
const coolTimeLimit = 250
let getTime = 0
let takeFlag = false
let db
const openDb = () => {
  console.log('open DB ...')
  const request = indexedDB.open(dbName, dbVersion)
  request.onsuccess = () => {
    db = request.result
    displayColumn()
    console.log('open DB done')
  }
  request.onupgradeneeded = e => {
    console.log('openDb.onupgradeneeded')
    e.target.result.createObjectStore(storeName[0], {keyPath: idName})
  }
  request.onerror = e => console.log('openDb:', e.target.errorCode)
}
const deleteDb = (bool = true) => {
  console.log('delete DB ...')
  const deleteRequest = indexedDB.deleteDatabase(dbName)
  deleteRequest.onsuccess = () => {
    console.log('delete DB success')
    if (bool) openDb()
  }
  deleteRequest.onblocked = () => {
    console.log('delete DB blocked')
    db.close()
  }
  deleteRequest.onerror = () => console.log('delete DB error')
}
const initializeDb = () => {
  console.log('initialize ...')
  document.getElementById`column`.textContent = null
  const store = getObjectStore(storeName[0], 'readwrite')
  firstBuildingArray.forEach((v, i) => {
    v.detailFlag = false
    v[idName] = i
    const getFromId = store.get(v[idName])
    getFromId.onsuccess = () => {
      const req = store.put(firstBuildingArray[i])
      req.onsuccess = () => {
        if (i === 2) console.log('initialize DB success')
      }
      req.onerror = () => console.error('addPublication error', req.error)
    }
  })
}
const getObjectStore = (store_name, mode) => {
  const tx = db.transaction(store_name, mode)
  return tx.objectStore(store_name)
}
const clearObjectStore = (store_name) => {
  console.log('clear ...')
  const store = getObjectStore(store_name, 'readwrite')
  const request = store.clear()
  request.onsuccess = () => {
    displayColumn()
    console.log('cleared')
  }
  request.onerror = e => {
    console.error('clearObjectStore:', e.target.errorCode)
  }
}
const generateColumn = (v, num) => {
  const createE = (e, c, i = '', t = '', a) => {
    const element = document.createElement(e)
    element.className = c
    element.id = i
    element.textContent = t
    if (a !== undefined) a.appendChild(element)
    return element
  }
  const div = createE('div', 'cell', '', '', document.getElementById`column`)
  const top = createE('div', 'container', '', '', div)
  createE('progress', '', `progressbar-${num}`, '', top)
  const middle = createE('div', 'container', '', '', div)
  createE('span', '', `site-${num}`, num, middle)
  createE('span', '', `name-${num}`, v.name, middle)
  createE('span', '', `state-${num}`, '', middle)
  const bottom = createE('div', 'container', '', '', div)
  createE('span','',`time-${num}`, '', bottom)
  const button = createE('button', '', `button-${num}`, '+', bottom)
  const detail = createE('div', 'container', `detail-${num}`, '', div)
  createE('span', '', '', v.name, detail)
  const dummy1 = createE('div', 'container', '', '', div)
  createE('span', '', '', v.name, dummy1)
  const list = [detail, dummy1]
  list.forEach(v => v.style.display = 'none')
  button.addEventListener('click', () => {
    button.textContent = button.textContent === '+' ? '-' : '+'
    list.forEach(v => v.style.display = v.style.display === 'none' ? 'block' : 'none')
  })
}
const displayColumn = () => {
  const store = getObjectStore(storeName[0], 'readonly')
  for (let i = 0; i < referenceLimit; i++) {
    const getFromId = store.get(i)
    getFromId.onsuccess = () => {
      const r = getFromId.result
      if (r === undefined) {
        if (i === 0) {
          initializeDb()
          displayColumn()
        }
      } else generateColumn(r, i)
    }
  }
}
const getObject = arg => {
  const store = getObjectStore(storeName[0], 'readwrite')
  const getFromId = store.get(arg)
  getFromId.onsuccess = () => {
    console.log(getFromId.result)
    return getFromId.result
  }
}
const switchDatailFlag = arg => {
  const store = getObjectStore(storeName[0], 'readwrite')
  const getFromId = store.get(arg)
  getFromId.onsuccess = () => {
    let r = getFromId.result
    r.detailFlag = !r.detailFlag
    const req = store.put(r)
    // let req = store.put(data)
    req.onsuccess = () => {
      console.log('Insertion in DB successful')
      // displayColumn()
    }
    req.onerror = () => console.error('addPublication error', req.error)
  }
}
const addPublication = arg => {
  console.log('add ...')
  const store = getObjectStore(storeName[0], 'readwrite')
  const getFromId = store.get(arg)
  getFromId.onsuccess = () => {
    const a = getFromId.result
    const num = (a !== undefined) ? a.value + 1 : 1
    const data = {[idName]: arg, value: num}
    let req = store.put(data)
    req.onsuccess = () => {
      console.log('Insertion in DB successful')
      displayColumn()
    }
    req.onerror = () => {
      console.error('addPublication error', req.error)
    }
  }
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
const addEventListeners = msg => {
  console.log('addEventListeners')
  // document.getElementById`clear`.addEventListener('click', () => clearObjectStore(storeName))
  document.getElementById`deleteDb`.addEventListener('click', () => deleteDb())
  document.getElementById`deleteDev`.addEventListener('click', () => deleteDb(false))
}
const main = () => {
  // materialProcess()
  document.getElementById`conectedTime`.textContent = formatTime(Date.now() - openTime)
  window.requestAnimationFrame(main)
}
openDb()
addEventListeners()
main()
}