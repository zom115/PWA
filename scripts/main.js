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
let localBuffer = {[storeName[0]]: []}
const site = localBuffer[storeName[0]]
// const materialName = 'Crude'
const buildingList = {
  'Storage Tank': {
    acceptor: ['Storage Tank', 'Rig'],
    conversion: [{
      from: 'Crude',
      to: 'Crude',
      efficiency: 1
    }]
  }, 'Generator Engine': {
    acceptor: ['Storage Tank', 'Rig'],
    conversion: [{
      from: 'Crude',
      to: 'EU',
      efficiency: 2
    }]
  }, 'Rig': {
    acceptor: ['Generator Engine'],
    conversion: [{
      from: 'EU',
      to: 'Crude',
      efficiency: 1
    }]
  }
}
Object.keys(buildingList).forEach(v => {
  buildingList[v].acceptable = []
  Object.keys(buildingList).forEach(val => {
    if (buildingList[val].acceptor.some(value => v === value)) {
      buildingList[v].acceptable.push(val)
    }
  })
})
const firstBuildingArray = [{
  name: 'Storage Tank',
  output: 0,
  amount: 8,
  capacity: 40,
  content: 'Crude',
  value: 8,
  timestamp: 0
}, {
  name: 'Generator Engine',
  output: 2,
  amount: 0,
  capacity: 20,
  content: '',
  value: 0,
  timestamp: 0
}, {
  name: 'Rig',
  output: 0,
  amount: 0,
  capacity: 10,
  content: '',
  value: 0,
  timestamp: 0
}]
// const countLimit = 10 * 1e3
// const coolTimeLimit = 250
// let getTime = 0
// let takeFlag = false
let db
let initializeFlag = false
const openDb = () => { // console.log('open DB ...')
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion)
    request.onsuccess = async () => {
      db = request.result
      if (initializeFlag) {
        initializeFlag = false
        initializeDb()
      }
      await displayColumn()
      console.log('open DB success')
      resolve()
    }
    request.onupgradeneeded = e => {
      console.log('openDb.onupgradeneeded')
      initializeFlag = true
      e.target.result.createObjectStore(storeName[0], {keyPath: idName})
    }
    request.onerror = e => {
      console.log('openDb error:', e.target.errorCode)
      reject()
    }
  })
}
const deleteDb = (bool = true) => { // console.log('delete DB ...')
  const deleteRequest = indexedDB.deleteDatabase(dbName)
  deleteRequest.onsuccess = () => {
    console.log('delete DB success')
    site.length = 0
    if (bool) openDb()
  }
  deleteRequest.onblocked = () => {
    console.log('delete DB blocked')
    db.close()
  }
  deleteRequest.onerror = () => console.log('delete DB error')
}
const initializeDb = () => { // console.log('initialize ...')
  document.getElementById`column`.textContent = null
  const store = getObjectStore(storeName[0], 'readwrite')
  firstBuildingArray.forEach((v, i) => {
    v[idName] = i
    const req = store.put(firstBuildingArray[i])
    req.onsuccess = () => {
      console.log(`${i + 1} / ${firstBuildingArray.length} initialize DB success`)
    }
    req.onerror = () => console.error('initialize DB error', req.error)
  })
}
const getObjectStore = (store_name, mode) => {
  const tx = db.transaction(store_name, mode)
  return tx.objectStore(store_name)
}
// const clearObjectStore = (store_name) => {
//   console.log('clear ...')
//   const store = getObjectStore(store_name, 'readwrite')
//   const request = store.clear()
//   request.onsuccess = () => {
//     displayColumn()
//     console.log('cleared')
//   }
//   request.onerror = e => {
//     console.error('clearObjectStore:', e.target.errorCode)
//   }
// }
const rewriteOutput = (former, i) => {
  // local list update
  site[former].output = i
  // db update
  putData(site[former])
  // element update
  document.getElementById(`output-${former}`).textContent = `${i} ${site[i].name}`
}
const generateColumn = (v, num) => {
  const createE = (e, c, i = '', t = '', a) => {
    const element = document.createElement(e)
    if (c !== '') element.className = c
    if (i !== '') element.id = i
    element.textContent = t
    if (a !== undefined) a.appendChild(element)
    return element
  }
  const column = document.getElementById`column`
  const div = createE('div', 'unit', '', '', column)
  const top = createE('div', 'container', '', '', div)
  createE('span', '', `site-${num}`, `${num} ${v.name}`, top)
  createE('span','',`time-${num}`, '', top)
  const checkbox = createE('input', '', `checkbox-${num}`, '', top)
  checkbox.type = 'checkbox'
  checkbox.checked = site[num].timestamp ? true : false
  checkbox.addEventListener('input', e => {
    site[num].timestamp = e.target.checked ? Date.now() : 0
  })
  const middle = createE('div', 'container', '', '', div)
  const progress = createE('progress', '', `progress-${num}`, '', middle)
  progress.max = v.capacity
  progress.value = v.amount
  const bottom = createE('div', 'container', '', '', div)
  const detailButton = createE('button', '', `button-${num}`, '+', bottom)
  createE('span', '', `content-${num}`, v.content, bottom)
  createE('span', '', `amount-${num}`, `${v.amount} of ${v.capacity}`, bottom)
  const outputUnit = createE('div', 'unit', `detail-${num}`, '', div)
  const outputContainer = createE('div', 'container', '', '', outputUnit)
  const outputButton = createE('button', '', '', '+', outputContainer)
  createE('span', '', '', 'Output', outputContainer)
  createE(
    'span', '', `output-${num}`, `${v.output} ${site[v.output].name}`, outputContainer)
  let outputList = []
  let outputButtonList = []
  buildingList[v.name].acceptable.forEach(val => {
    site.forEach((value, index) => {
      if (val === value.name) {
        const outputColumn = createE('div', 'container', '', '', div)
        outputList.push(outputColumn)
        createE('span', '', '', `${index} ${val}`, outputColumn)
        const button = createE('button', '', `output-${num}-${index}`, '->', outputColumn)
        outputButtonList.push(button)
        button.addEventListener('click', () => {
          rewriteOutput(num, index)
          outputButtonList.forEach(v => v.style.display = 'flex')
          button.style.display = 'none'
        })
        if (v.output === index) button.style.display = 'none'
      }
    })
  })
  const sendUnit = createE('div', 'unit', '', '', div)
  const sendContainer = createE('div', 'container', '', '', sendUnit)
  createE('span', '', '', 'Send Amount', sendContainer)
  const sendIndicator = createE('span', '', '', v.amount, sendContainer)
  const inputElement = createE('input', '', `input-${num}`, '', div)
  inputElement.type = 'range'
  inputElement.step = 1
  inputElement.min = 1
  inputElement.max = v.amount
  inputElement.value = v.amount
  inputElement.addEventListener('input', e => {
    v.amount = sendIndicator.textContent = e.target.value
  })
  const conversionUnit = createE('div', 'unit', '', '', div)
  const conversionContainer = createE('div', 'container', '', '', conversionUnit)
  const conversionButton = createE('button', '', '', '+', conversionContainer)
  createE('span', '', '', 'Conversion Information', conversionContainer)
  let conversionList = []
  buildingList[v.name].conversion.forEach(val => {
    const conversion = createE('div', 'container', '', '', div)
    conversionList.push(conversion)
    createE('span', '', '', `1 ${val.from} -> ${val.efficiency} ${val.to}`, conversion)
  })
  const unitList = [
    outputUnit,
    sendUnit,
    inputElement,
    conversionUnit
  ]
  unitList.forEach(v => v.style.display = 'none')
  outputList.forEach(v => v.style.display = 'none')
  conversionList.forEach(v => v.style.display = 'none')
  const buttonList = [outputButton, conversionButton]
  const constList = [outputList, conversionList]

  detailButton.addEventListener('click', () => {
    detailButton.textContent = detailButton.textContent === '+' ? '-' : '+'
    unitList.forEach(v => v.style.display = v.style.display === 'none' ? 'flex' : 'none')
    buttonList.forEach((v, i) => {
      if (v.textContent === '-') {
        constList[i].forEach(
          val => val.style.display = val.style.display === 'none' ? 'flex' : 'none')
      }
    })
  })
  buttonList.forEach((v, i) => {
    v.addEventListener('click', () => {
      v.textContent = v.textContent === '+' ? '-' : '+'
      constList[i].forEach(
        val => val.style.display = val.style.display === 'none' ? 'flex' : 'none')
    })
  })
}
const displayColumn = async () => {
  return new Promise(resolve => {
    const store = getObjectStore(storeName[0], 'readonly')
    store.openCursor().onsuccess = async e => {
      const cursor = e.target.result
      if (cursor) { // console.log(cursor.key, cursor.value.name)
        site.push(cursor.value)
        cursor.continue()
      } else {
        site.forEach((v, i) => generateColumn(v, i))
        resolve()
      }
    }
  })
}
const putData = (site1, site2) => { // console.log('put ...')
  const store = getObjectStore(storeName[0], 'readwrite')
  const request1 = store.put(site1)
  request1.onsuccess = () => {
    if (site2 === undefined) { // console.log('put success')
    } else {
      const request2 = store.put(site2)
      // request2.onsuccess = () => console.log('2 sites put success')
    }
  }
}
// const addPublication = arg => {
//   console.log('add ...')
//   const store = getObjectStore(storeName[0], 'readwrite')
//   const getFromId = store.get(arg)
//   getFromId.onsuccess = () => {
//     const a = getFromId.result
//     const num = (a !== undefined) ? a.value + 1 : 1
//     const data = {[idName]: arg, value: num}
//     let req = store.put(data)
//     req.onsuccess = () => {
//       console.log('Insertion in DB successful')
//       displayColumn()
//     }
//     req.onerror = () => {
//       console.error('addPublication error', req.error)
//     }
//   }
// }
// const materialProcess = () => {
//   if (getTime !== 0) {
//     let elapsedTime = Date.now() - getTime
//     let rate = elapsedTime / countLimit
//     if (countLimit <= elapsedTime) {
//       if (!takeFlag) {
//         // addPublication(materialName)
//         takeFlag = true
//       }
//       rate = (coolTimeLimit - (elapsedTime - countLimit)) / coolTimeLimit
//       if (countLimit + coolTimeLimit <= elapsedTime) {
//         document.getElementById`testButton`.disabled = false
//         getTime = 0
//         takeFlag = false
//       }
//     }
//     document.getElementById`progress`.value = rate
//     document.getElementById`testTime`.textContent = countLimit <= elapsedTime ? ''
//     : formatTime(countLimit - elapsedTime)
//   }
// }
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
const addEventListeners = async () => {
  return new Promise(resolve => {
    // document.getElementById`clear`.addEventListener('click', () => clearObjectStore(storeName))
    document.getElementById`deleteDb`.addEventListener('click', () => deleteDb())
    document.getElementById`deleteDev`.addEventListener('click', () => deleteDb(false))
    resolve()
  })
}
const rewriteConvert = targetSite => {
  // local list update
  const out = site[targetSite.output]
  buildingList[targetSite.name].conversion.forEach(v => {
    if (
      v.from === targetSite.content &&
      0 < targetSite.amount &&
      out.amount + v.efficiency * 1 <= out.capacity
    ) {
      targetSite.amount -= 1
      out.content = v.to
      out.amount += v.efficiency * 1
    } else {
      targetSite.timestamp = 0
      document.getElementById(`checkbox-${targetSite.site}`).checked = false
      return
    }
  })
  // db update
  putData(targetSite, out)
  // element update
  document.getElementById(`amount-${targetSite.site}`).textContent =
  `${targetSite.amount} of ${targetSite.capacity}`
  document.getElementById(`content-${out.site}`).textContent = out.content
  document.getElementById(
    `amount-${out.site}`).textContent = `${out.amount} of ${out.capacity}`
}
const convert = () => {
  site.forEach(v => {
    if (v.timestamp !== 0) rewriteConvert(v)
  })
}
const displayUpdate = () => {
  site.forEach(v => {
    const progress = document.getElementById(`progress-${v.site}`)
    progress.max = v.capacity
    progress.value = v.amount
  })
}
const main = () => {
  // materialProcess()
  // transmit()
  convert()
  displayUpdate()
  document.getElementById`conectedTime`.textContent = formatTime(Date.now() - openTime)
  window.requestAnimationFrame(main)
}
const asyncFunc = async () => {
  await openDb()
  addEventListeners()
  main()
}
asyncFunc()
}