{'use strict'
const PATH = 'scripts/sw.js'
navigator.serviceWorker.register(PATH)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(PATH).then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope)
    }, err => {
      console.log('ServiceWorker registration failed: ', err)
    })
  })
}
const DB_NAME = 'indexedDB'
const DB_VERSION = 1
const STORE_NAME_LIST = ['site', 'market', 'statistics', 'setting']
const ID_NAME = 'site'
const localBuffer = {[STORE_NAME_LIST[0]]: []}
const site = localBuffer[STORE_NAME_LIST[0]]
const WORD_LIST = ['Storage Tank', 'Generator Engine', 'Rig']
const MATERIAL_LIST = ['Crude', 'EU']
const BUILDING_LIST = {
  [WORD_LIST[0]]: {
    acceptor: [WORD_LIST[0], WORD_LIST[2]],
    conversion: [{
      from: MATERIAL_LIST[0],
      to: MATERIAL_LIST[0],
      efficiency: 1
    }]
  }, [WORD_LIST[1]]: {
    acceptor: [WORD_LIST[0], WORD_LIST[2]],
    conversion: [{
      from: MATERIAL_LIST[0],
      to: MATERIAL_LIST[1],
      efficiency: 2
    }]
  }, [WORD_LIST[2]]: {
    acceptor: [WORD_LIST[1]],
    conversion: [{
      from: MATERIAL_LIST[1],
      to: MATERIAL_LIST[0],
      efficiency: 1
    }]
  }
}
Object.keys(BUILDING_LIST).forEach(v => {
  BUILDING_LIST[v].acceptable = []
  Object.keys(BUILDING_LIST).forEach(val => {
    if (BUILDING_LIST[val].acceptor.some(value => v === value)) {
      BUILDING_LIST[v].acceptable.push(val)
    }
  })
})
const firstBuildingArray = [{
  name: WORD_LIST[0],
  output: 0,
  amount: 8,
  capacity: 40,
  content: MATERIAL_LIST[0],
  value: 8,
  timestamp: 0
}, {
  name: WORD_LIST[1],
  output: 2,
  amount: 0,
  capacity: 20,
  content: '',
  value: 0,
  timestamp: 0
}, {
  name: WORD_LIST[2],
  output: 0,
  amount: 0,
  capacity: 10,
  content: '',
  value: 0,
  timestamp: 0
}]
const WEIGHT_TIME = 1e3
let db
let initializeFlag = false
const openDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onsuccess = async () => {
      db = request.result
      if (initializeFlag) {
        initializeFlag = false
        initializeDb()
      }
      await setDbForBuffer()
      await displayColumn()
      console.log('open DB success')
      resolve()
    }
    request.onupgradeneeded = e => {
      console.log('openDb.onupgradeneeded')
      initializeFlag = true
      STORE_NAME_LIST.forEach(v => {
        e.target.result.createObjectStore(v, {keyPath: ID_NAME})
      })
    }
    request.onerror = e => {
      console.log('openDb error:', e.target.errorCode)
      reject()
    }
  })
}
const deleteDb = (bool = true) => {
  const deleteRequest = indexedDB.deleteDatabase(DB_NAME)
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
const initializeDb = () => {
  firstBuildingArray.forEach((v, i) => {
    v[ID_NAME] = i
    putData(firstBuildingArray[i])
  })
}
const setDbForBuffer = () => {
  return new Promise(resolve => {
    const store = getObjectStore(STORE_NAME_LIST[0], 'readonly')
    store.openCursor().onsuccess = e => {
      const cursor = e.target.result
      if (cursor) {
        site.push(cursor.value)
        cursor.continue()
      } else {
        console.log('set DB contents for buffer successful')
        resolve()
      }
    }
  })
}
const getObjectStore = (store_name, mode) => {
  const tx = db.transaction(store_name, mode)
  return tx.objectStore(store_name)
}
const getDb = num => {
  return new Promise(resolve => {
    const store = getObjectStore(STORE_NAME_LIST[num], 'readonly')
    store.openCursor().onsuccess = e => {
      const cursor = e.target.result
      if (cursor) {
        console.log(cursor.key, cursor.value)
        cursor.continue()
      } else {
        console.log('end')
        resolve()
      }
    }
  })
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
const rewriteLine = (former, i) => {
  console.log('rewrite line')
  site.splice(i, 0, site.splice(former, 1)[0])
  site.forEach((v, index) => {
    if (v.output === former) v.output = i
    else if (former < i) {
      if (former <= v.output && v.output <= i) v.output -= 1
    } else {
      if (i <= v.output && v.output <= former) v.output += 1
    }
    v.site = index
    putData(v)
  })
  displayColumn()
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
  const div = createE('div', 'box', '', '', column)
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
  const outputBox = createE('div', 'box', `detail-${num}`, '', div)
  const outputContainer = createE('div', 'container', '', '', outputBox)
  const outputButton = createE('button', '', '', '+', outputContainer)
  createE('span', '', '', 'Output', outputContainer)
  createE(
    'span', '', `output-${num}`, `${v.output} ${site[v.output].name}`, outputContainer)
  let outputList = []
  let outputButtonList = []
  BUILDING_LIST[v.name].acceptable.forEach(val => {
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
  /*
  const sendBox = createE('div', 'box', '', '', div)
  const sendContainer = createE('div', 'container', '', '', sendBox)
  createE('span', '', '', 'Send Amount', sendContainer)
  const sendIndicator = createE('span', '', '', v.amount, sendContainer)
  const inputElement = createE('input', '', `input-${num}`, '', div)
  inputElement.type = 'range'
  inputElement.step = 1
  inputElement.min = 1
  inputElement.max = v.amount
  inputElement.value = v.amount
  inputElement.addEventListener('input', e => {
    v.value = sendIndicator.textContent = e.target.value
  })
  */
  const sortingBox = createE('div', 'box', '', '', div)
  const sortingContainer = createE('div', 'container', '', '', sortingBox)
  const sortingExpandButton = createE('button', '', '', '+', sortingContainer)
  let sortingList = []
  let sortingButtonList = []
  createE('span', '', '', 'Sorting', sortingContainer)
  site.forEach((v, i) => {
    const sortingColumn = createE('div', 'container', '', '', div)
    sortingList.push(sortingColumn)

    if (i === num) createE('span', '', '', 'Current', sortingColumn)
    else {
      if (i === 0) {
        createE('span', '', '', `Above ${v.site}`, sortingColumn)
      } else if (i === site.length - 1) {
        createE('span', '', '', `Below ${v.site}`, sortingColumn)
      } else {
        const smallerNum = v.site - 1 === num ? v.site : v.site - 1
        const largerNum = v.site + 1 === num ? v.site : v.site + 1
        createE('span', '', '', `${smallerNum} and ${largerNum}`, sortingColumn)
      }
      const button = createE('button', '', `sorting-${num}-${i}`, '->', sortingColumn)
      sortingButtonList.push(button)
      button.addEventListener('click', () => {
        rewriteLine(num, i)
      })
    }
  })
  const conversionBox = createE('div', 'box', '', '', div)
  const conversionContainer = createE('div', 'container', '', '', conversionBox)
  const conversionButton = createE('button', '', '', '+', conversionContainer)
  createE('span', '', '', 'Conversion Information', conversionContainer)
  let conversionList = []
  BUILDING_LIST[v.name].conversion.forEach(val => {
    const conversion = createE('div', 'container', '', '', div)
    conversionList.push(conversion)
    createE('span', '', '', `1 ${val.from} -> ${val.efficiency} ${val.to}`, conversion)
  })
  const boxList = [
    outputBox,
    // sendBox,
    // inputElement,
    sortingBox,
    conversionBox
  ]
  boxList.forEach(v => v.style.display = 'none')
  const buttonList = [outputButton, sortingExpandButton, conversionButton]
  const constList = [outputList, sortingList, conversionList]
  constList.forEach(v => v.forEach(val => val.style.display = 'none'))
  detailButton.addEventListener('click', () => {
    detailButton.textContent = detailButton.textContent === '+' ? '-' : '+'
    boxList.forEach(v => v.style.display = v.style.display === 'none' ? 'flex' : 'none')
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
const displayColumn = () => {
  return new Promise(resolve => {
    document.getElementById`column`.textContent = null
    site.forEach((v, i) => generateColumn(v, i))
    resolve()
  })
}
const putData = (site1, site2) => {
  const store = getObjectStore(STORE_NAME_LIST[0], 'readwrite')
  const request1 = store.put(site1)
  request1.onsuccess = () => {
    if (site2 === undefined) {
    } else {
      store.put(site2)
    }
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
const addEventListeners = async () => {
  return new Promise(resolve => {
    // document.getElementById`clear`.addEventListener('click', () => clearObjectStore(storeName))
    document.getElementById`deleteDb`.addEventListener('click', () => deleteDb())
    document.getElementById`deleteDev`.addEventListener('click', () => deleteDb(false))
    document.getElementById`showSiteDb`.addEventListener('click', () => getDb(0))
    document.getElementById`showMarketDb`.addEventListener('click', () => getDb(1))
    document.getElementById`showSite`.addEventListener('click', () => console.log(site))
    resolve()
  })
}
const rewriteConvert = targetSite => {
  // local list update
  const out = site[targetSite.output]
  BUILDING_LIST[targetSite.name].conversion.forEach(v => {
    const time = Math.abs(
      targetSite.site - site[targetSite.output].site) * WEIGHT_TIME
    if (
      v.from === targetSite.content && 0 < targetSite.amount &&
      out.amount + v.efficiency * 1 <= out.capacity && time !== 0
    ) {
      if (targetSite.timestamp + time <= Date.now()) {
        targetSite.amount -= 1
        out.content = v.to
        out.amount += v.efficiency * 1
        targetSite.timestamp += time
      }
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