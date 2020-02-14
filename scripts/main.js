{'use strict'
let openTime = Date.now()
const PATH = 'scripts/sw.js'
navigator.serviceWorker.register(PATH)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(PATH).then(registration => {
      // console.log('ServiceWorker registration successful with scope: ', registration.scope)
    }, err => {
      // console.log('ServiceWorker registration failed: ', err)
    })
  })
}
const DB_NAME = 'indexedDB'
const DB_VERSION = 1
const STORE_NAME_LIST = ['site', 'market', 'statistics', 'setting']
const ID_NAME = 'site'
const LOCAL_BUFFER_OBJECT = {}
STORE_NAME_LIST.forEach(v => LOCAL_BUFFER_OBJECT[v] = [])
const siteList = LOCAL_BUFFER_OBJECT[STORE_NAME_LIST[0]]
const marketList = LOCAL_BUFFER_OBJECT[STORE_NAME_LIST[1]]
const WORD_LIST = ['Storage Tank', 'Generator Engine', 'Rig']
const MATERIAL_LIST = ['Crude', 'EU']
const BUILDING_OBJECT = {
  [WORD_LIST[0]]: {
    acceptor: [WORD_LIST[0], WORD_LIST[2]],
    capacity: 40,
    conversion: [{
      from: MATERIAL_LIST[0],
      to: MATERIAL_LIST[0],
      efficiency: 1
    }],
    price: {
      value: 40,
      unit: MATERIAL_LIST[0]
    }
  }, [WORD_LIST[1]]: {
    acceptor: [WORD_LIST[0], WORD_LIST[2]],
    capacity: 20,
    conversion: [{
      from: MATERIAL_LIST[0],
      to: MATERIAL_LIST[1],
      efficiency: 2
    }],
    price: {
      value: 40,
      unit: MATERIAL_LIST[0]
    }
  }, [WORD_LIST[2]]: {
    acceptor: [WORD_LIST[1]],
    capacity: 10,
    conversion: [{
      from: MATERIAL_LIST[1],
      to: MATERIAL_LIST[0],
      efficiency: 1
    }],
    price: {
      value: 40,
      unit: MATERIAL_LIST[0]
    }
  }
}
Object.keys(BUILDING_OBJECT).forEach(v => {
  BUILDING_OBJECT[v].acceptable = []
  Object.keys(BUILDING_OBJECT).forEach(val => {
    if (BUILDING_OBJECT[val].acceptor.some(value => v === value)) {
      BUILDING_OBJECT[v].acceptable.push(val)
    }
  })
})
const FIRST_BUILDING_LIST = []
const buildingGenerator = (index) => {
  const object = {}
  object.name = WORD_LIST[index]
  object.output = index
  object.amount = 0
  object.capacity = BUILDING_OBJECT[WORD_LIST[index]].capacity
  object.content = ''
  object.timestamp = 0
  return object
}
for (let i = 0; i < 3; i++) FIRST_BUILDING_LIST[i] = buildingGenerator(i)
FIRST_BUILDING_LIST[0].amount = 8
FIRST_BUILDING_LIST[0].content = MATERIAL_LIST[0]
const WEIGHT_TIME = 1e3
let db
const openDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onsuccess = async () => {
      console.log('open DB success')
      db = request.result
      await setDbFirst().catch( async () => {
        await Promise.all(STORE_NAME_LIST.map(async v => await getDbForBuffer(v)))
      })
      await generateElementToBody()
      await displayElements()
      resolve()
    }
    request.onupgradeneeded = e => {
      console.log('openDb.onupgradeneeded')
      STORE_NAME_LIST.forEach(v => {
        e.target.result.createObjectStore(v, {keyPath: ID_NAME})
      })
      FIRST_BUILDING_LIST.forEach((v, i) => {
        v[ID_NAME] = i
        siteList.push(FIRST_BUILDING_LIST[i])
      })
      Object.keys(BUILDING_OBJECT).forEach((v, i) => {
        marketList.push(BUILDING_OBJECT[v].price)
        marketList[i]['name'] = Object.keys(BUILDING_OBJECT)[i]
        marketList[i][ID_NAME] = i
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
    STORE_NAME_LIST.forEach(v => LOCAL_BUFFER_OBJECT[v].length = 0)
    if (bool) openDb()
  }
  deleteRequest.onblocked = () => {
    console.log('delete DB blocked')
    db.close()
  }
  deleteRequest.onerror = () => console.log('delete DB error')
}
const getDbForBuffer = storeName => {
  return new Promise(resolve => {
    const store = getObjectStore(storeName, 'readonly')
    store.openCursor().onsuccess = e => {
      const cursor = e.target.result
      if (cursor) {
        LOCAL_BUFFER_OBJECT[storeName].push(cursor.value)
        cursor.continue()
      } else {
        console.log(storeName, 'set DB contents for buffer successful')
        resolve()
      }
    }
  })
}
const setDbFirst = () => {
  return new Promise( async (resolve, reject) => {
    if (LOCAL_BUFFER_OBJECT[STORE_NAME_LIST[0]].length === 0) reject()
    const fn = async v => {
      await Promise.all(LOCAL_BUFFER_OBJECT[v].map(async val => {
        await putEveryStore(v, val)
      }))
    }
    await Promise.all(STORE_NAME_LIST.map(async v => {await fn(v)}))
    resolve()
  })
}
const getObjectStore = (store_name, mode) => {
  const tx = db.transaction(store_name, mode)
  return tx.objectStore(store_name)
}
const putEveryStore = (storeName, obj) => {
  return new Promise(resolve => {
    const store = getObjectStore(storeName, 'readwrite')
    const request1 = store.put(obj)
    request1.onsuccess = () => {resolve()}
    request1.onerror = e => {console.log(e.target.errorCode)}
  })
}
const putStore = (site1, site2) => {
  return new Promise(resolve => {
    const store = getObjectStore(STORE_NAME_LIST[0], 'readwrite')
    const request1 = store.put(site1)
    request1.onsuccess = () => {
      if (site2 === undefined) resolve()
      else {
        const request2 = store.put(site2)
        request2.onsuccess = () => resolve()
      }
    }
  })
}
const getDb = num => {
  return new Promise(resolve => {
    const store = getObjectStore(STORE_NAME_LIST[num], 'readonly')
    store.openCursor().onsuccess = e => {
      const cursor = e.target.result
      if (cursor) {
        console.log(cursor.value)
        cursor.continue()
      } else {
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
//     displaySite()
//     console.log('cleared')
//   }
//   request.onerror = e => {
//     console.error('clearObjectStore:', e.target.errorCode)
//   }
// }
const rewriteOutput = (former, i) => {
  // local list update
  siteList[former].output = i
  // db update
  putStore(siteList[former])
  // element update
  document.getElementById(`output-${former}`).textContent = `${i} ${siteList[i].name}`
}
const rewriteSite = (former, i) => {
  console.log('rewrite site')
  siteList.splice(i, 0, siteList.splice(former, 1)[0])
  siteList.forEach((v, index) => {
    if (v.output === former) v.output = i
    else if (former < i) {
      if (former <= v.output && v.output <= i) v.output -= 1
    } else {
      if (i <= v.output && v.output <= former) v.output += 1
    }
    v.site = index
    putStore(v)
  })
  displayElements()
}
const rewriteConvert = targetSite => {
  const out = siteList[targetSite.output]
  BUILDING_OBJECT[targetSite.name].conversion.forEach(v => {
    const time = Math.abs(
      targetSite.site - siteList[targetSite.output].site) * WEIGHT_TIME
    if (
      v.from === targetSite.content && 0 < targetSite.amount &&
      out.amount + v.efficiency * 1 <= out.capacity && time !== 0
    ) {
      if (targetSite.timestamp + time <= Date.now()) {
        // local list update
        targetSite.amount -= 1
        out.content = v.to
        out.amount += v.efficiency * 1
        targetSite.timestamp += time
        // db update
        putStore(targetSite, out)
        // element update
        document.getElementById(`amount-${targetSite.site}`).textContent =
        `${targetSite.amount} of ${targetSite.capacity}`
        document.getElementById(`content-${out.site}`).textContent = out.content
        document.getElementById(
          `amount-${out.site}`).textContent = `${out.amount} of ${out.capacity}`
      }
    } else {
      targetSite.timestamp = 0
      document.getElementById(`checkbox-${targetSite.site}`).checked = false
      return
    }
  })
}
const convert = () => {
  siteList.forEach(v => {
    if (v.timestamp !== 0) rewriteConvert(v)
  })
}
const generateElementToBody = () => {
  console.log('generate elements')
  const mainElement = document.getElementById`main`
  mainElement.textContent = null
  return new Promise(resolve => {
    STORE_NAME_LIST.forEach(v => {
      const div = document.createElement`div`
      div.id = v
      const di = document.createElement`div`
      div.appendChild(di)
      di.className = 'container'
      di.textContent = v
      mainElement.appendChild(div)
    })
    const BUTTON_LIST = [{
      showSiteDb: 'showSiteDbOnConsole'
    }, {showMarketDb: 'showMarketDbOnConsole'
    }, {showSite: 'showSiteOnConsole'
    }, {clear: 'Clear'
    }, {deleteDb: 'DeleteDb'
    }, {deleteDev: 'DeleteDb(no remake)'
    }]
    BUTTON_LIST.forEach(v => {
      const p = document.createElement`p`
      const button = document.createElement`button`
      p.appendChild(button)
      button.id = Object.keys(v)[0]
      button.textContent = Object.values(v)[0]
      mainElement.appendChild(p)
    })
    document.getElementById`showSiteDb`.addEventListener('click', () => getDb(0))
    document.getElementById`showMarketDb`.addEventListener('click', () => getDb(1))
    document.getElementById`showSite`.addEventListener('click', () => console.log(siteList))
    document.getElementById`deleteDb`.addEventListener('click', () => deleteDb())
    document.getElementById`deleteDev`.addEventListener('click', () => deleteDb(false))
    const p = document.createElement`p`
    p.className = 'container'
    p.textContent = 'Connected Time'
    const span = document.createElement`span`
    p.appendChild(span)
    span.id = 'connectedTime'
    const button = document.createElement`button`
    p.appendChild(button)
    button.id = 'timeReset'
    button.textContent = 'Reset'
    button.addEventListener('click', () => openTime = Date.now())
    mainElement.appendChild(p)
    resolve()
  })
}
const generateSite = (building) => {
  const createE = (e, c, i = '', t = '', a) => {
    const element = document.createElement(e)
    if (c !== '') element.className = c
    if (i !== '') element.id = i
    element.textContent = t
    if (a !== undefined) a.appendChild(element)
    return element
  }
  const siteItem = document.getElementById`site`
  const div = createE('div', 'box', '', '', siteItem)
  const top = createE('div', 'container', '', '', div)
  createE('span', '', `site-${building.site}`, `${building.site} ${building.name}`, top)
  createE('span','',`time-${building.site}`, '', top)
  const checkbox = createE('input', '', `checkbox-${building.site}`, '', top)
  checkbox.type = 'checkbox'
  checkbox.checked = siteList[building.site].timestamp ? true : false
  checkbox.addEventListener('input', e => {
    siteList[building.site].timestamp = e.target.checked ? Date.now() : 0
  })
  const middle = createE('div', 'container', '', '', div)
  const progress = createE('progress', '', `progress-${building.site}`, '', middle)
  progress.max = building.capacity
  progress.value = building.amount
  const bottom = createE('div', 'container', '', '', div)
  const detailButton = createE('button', '', `button-${building.site}`, '+', bottom)
  createE('span', '', `content-${building.site}`, building.content, bottom)
  createE('span', '', `amount-${building.site}`, `${building.amount} of ${building.capacity}`, bottom)
  const outputBox = createE('div', 'box', `detail-${building.site}`, '', div)
  const outputContainer = createE('div', 'container', '', '', outputBox)
  const outputButton = createE('button', '', '', '+', outputContainer)
  createE('span', '', '', 'Output', outputContainer)
  createE(
    'span', '', `output-${building.site}`,
    `${building.output} ${siteList[building.output].name}`, outputContainer)
  let outputList = []
  let outputButtonList = []
  siteList.forEach((value, index) => {
    BUILDING_OBJECT[building.name].acceptable.forEach(val => {
      if (val === value.name) {
        const outputItem = createE('div', 'container', '', '', div)
        outputList.push(outputItem)
        createE('span', '', '', `${index} ${val}`, outputItem)
        const button = createE('button', '', `output-${building.site}-${index}`, '->', outputItem)
        outputButtonList.push(button)
        button.addEventListener('click', () => {
          rewriteOutput(building.site, index)
          outputButtonList.forEach(v => v.style.display = 'flex')
          button.style.display = 'none'
        })
        if (building.output === index) button.style.display = 'none'
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
  siteList.forEach((v, i) => {
    const sortingItem = createE('div', 'container', '', '', div)
    sortingList.push(sortingItem)

    if (i === building.site) createE('span', '', '', 'Current', sortingItem)
    else {
      if (i === 0) {
        createE('span', '', '', `Above ${v.site}`, sortingItem)
      } else if (i === siteList.length - 1) {
        createE('span', '', '', `Below ${v.site}`, sortingItem)
      } else {
        const smallerNum = v.site - 1 === building.site ? v.site : v.site - 1
        const largerNum = v.site + 1 === building.site ? v.site : v.site + 1
        createE('span', '', '', `${smallerNum} and ${largerNum}`, sortingItem)
      }
      const button = createE('button', '', `sorting-${building.site}-${i}`, '->', sortingItem)
      sortingButtonList.push(button)
      button.addEventListener('click', () => rewriteSite(building.site, i))
    }
  })
  const conversionBox = createE('div', 'box', '', '', div)
  const conversionContainer = createE('div', 'container', '', '', conversionBox)
  const conversionButton = createE('button', '', '', '+', conversionContainer)
  createE('span', '', '', 'Conversion Information', conversionContainer)
  let conversionList = []
  BUILDING_OBJECT[building.name].conversion.forEach(val => {
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
const generateMarket = (v) => {
  const createE = (e, c, i = '', t = '', a) => {
    const element = document.createElement(e)
    if (c !== '') element.className = c
    if (i !== '') element.id = i
    element.textContent = t
    if (a !== undefined) a.appendChild(element)
    return element
  }
  const marketItem = document.getElementById`market`
  const box = createE('div', 'box', '', '', marketItem)
  const container = createE('div', 'container', '', '', box)
  createE('span', '', '', v.name, container)
  const span = createE('span', '', '', '', container)
  createE('span', '', '', `Cost ${v.value} ${v.unit} `, span)
  const button = createE('button', '', '', 'Install', span)
  button.addEventListener('click', async () => {
    const building = buildingGenerator(v.site)
    building.output = building.site = siteList.length
    console.log('v',v, 'n', v.site, 'l', siteList.length)
    console.log(building)
    siteList.push(building)
    await putStore(building)
    generateSite(building)
  })
  createE('progress', '', '', '', box)
}
const displayElements = () => {
  return new Promise(resolve => {
    document.getElementById`site`.textContent = 'Site'
    document.getElementById`market`.textContent = 'Market'
    siteList.forEach(v => generateSite(v))
    marketList.forEach(v => generateMarket(v))
    resolve()
  })
}
const displayUpdate = () => {
  siteList.forEach(v => {
    const progress = document.getElementById(`progress-${v.site}`)
    progress.max = v.capacity
    progress.value = v.amount
  })
  const formatTime = argTime => {
    const mm = ('0' + Math.floor(argTime / 6e4)).slice(-2)
    const ss = ('0' + Math.floor(argTime % 6e4 / 1e3)).slice(-2)
    const ms = ('00' + argTime % 1e3).slice(-3)
    let time = ms
    if (0 < mm || 0 < ss) time = ss + ':' + time
    if (0 < mm) time = mm + ':' + time
    return time
  }
  document.getElementById`connectedTime`.textContent = formatTime(Date.now() - openTime)
}
const asyncFn = async () => {
  await openDb()
  main()
}
asyncFn()
const main = () => {
  convert()
  displayUpdate()
  window.requestAnimationFrame(main)
}
}