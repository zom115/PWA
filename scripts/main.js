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
const statisticsList = LOCAL_BUFFER_OBJECT[STORE_NAME_LIST[2]]
const WORD_LIST = ['Storage Tank', 'Generator Engine', 'Rig', 'Battery']
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
      value: 32+8,
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
      value: 64+16,
      unit: MATERIAL_LIST[0]
    }
  }, [WORD_LIST[2]]: {
    acceptor: [WORD_LIST[1], WORD_LIST[3]],
    capacity: 2 ** 3 + 2,
    conversion: [{
      from: MATERIAL_LIST[1],
      to: MATERIAL_LIST[0],
      efficiency: 1
    }],
    price: {
      value: 2 ** 6 + 2 ** 4,
      unit: MATERIAL_LIST[1]
    }
  }, [WORD_LIST[3]]: {
    acceptor: [WORD_LIST[1]],
    capacity: 2 ** 6 + 2 ** 4,
    conversion: [{
      from: MATERIAL_LIST[1],
      to: MATERIAL_LIST[1],
      efficiency: 1
    }],
    price: {
      value: 2 ** 6 + 2 ** 4,
      unit: MATERIAL_LIST[1]
    }
  }
}
const SETTING_LIST = [{
  name: 'Show Site DB On Console',
  function: () => {getDb(0)}
}, {
  name: 'Show Market DB On Console',
  function: () => {getDb(1)}
}, {
  name:  'Show Site On Console',
  function: () => {console.log(siteList)}
}, {
  name: 'Clear',
  function: () => {}
}, {
  name: 'Delete DB',
  function: () => {deleteDb()}
}, {
  name: 'Delete DB(No Remake)',
  function: () => {deleteDb(false)}
}]
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
      } else resolve()
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
  document.getElementById(`output-${former}`).textContent = `to ${i} ${siteList[i].name}`
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
  return new Promise(resolve => {
    const mainElement = document.getElementById`main`
    mainElement.textContent = null
    STORE_NAME_LIST.forEach(v => {
      const div = document.createElement`div`
      div.id = v
      const di = document.createElement`div`
      div.appendChild(di)
      di.className = 'container'
      di.textContent = v
      mainElement.appendChild(div)
    })
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
const createElement = (e, c, i = '', t = '', a) => {
  const element = document.createElement(e)
  if (c !== '') element.className = c
  if (i !== '') element.id = i
  element.textContent = t
  if (a !== undefined) a.appendChild(element)
  return element
}
const setExpandFunction = (expandButton, containerList) => {
  containerList.forEach(v => v.style.display = 'none')
  expandButton.addEventListener('click', () => {
    expandButton.textContent = expandButton.textContent === '+' ? '-' : '+'
    containerList.forEach(v => {
      v.style.display = v.style.display === 'none' ? 'flex' : 'none'
    })
  })
}
const generateOutput = (building, box) => {
  const outputBox = createElement('div', 'box', `output-${building.site}`, '', box)
  outputBox.textContent = null
  const outputHeadContainer = createElement('div', 'container', '', '', outputBox)
  const outputExpandButton = createElement('button', '', '', '+', outputHeadContainer)
  createElement('span', '', '', 'Output', outputHeadContainer)
  let outputContainerList = []
  let outputButtonList = []
  siteList.forEach((value, index) => {
    BUILDING_OBJECT[building.name].acceptable.forEach(val => {
      if (val === value.name) {
        const outputContainer = createElement('div', 'container', '', '', outputBox)
        outputContainerList.push(outputContainer)
        createElement('span', '', '', `${index} ${val}`, outputContainer)
        const button = createElement(
          'button', '', `output-${building.site}-${index}`, '->', outputContainer)
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
  setExpandFunction(outputExpandButton, outputContainerList)
  return outputBox
}
const generateSorting = (building, box) => {
  const sortingBox = createElement('div', 'box', `sorting-${building.site}`, '', box)
  sortingBox.textContent = null
  const sortingHeadContainer = createElement('div', 'container', '', '', sortingBox)
  const sortingExpandButton = createElement('button', '', '', '+', sortingHeadContainer)
  let sortingContainerList = []
  let sortingButtonList = []
  createElement('span', '', '', 'Sorting', sortingHeadContainer)
  siteList.forEach((v, i) => {
    const sortingContainer = createElement('div', 'container', '', '', sortingBox)
    sortingContainerList.push(sortingContainer)
    if (i === building.site) createElement('span', '', '', 'Current', sortingContainer)
    else {
      if (i === 0) {
        createElement('span', '', '', `Above ${v.site}`, sortingContainer)
      } else if (i === siteList.length - 1) {
        createElement('span', '', '', `Below ${v.site}`, sortingContainer)
      } else {
        createElement('span', '', '', `${v.site} and ${v.site + 1}`, sortingContainer)
      }
      const button = createElement(
        'button', '', `sorting-${building.site}-${i}`, '->', sortingContainer)
      sortingButtonList.push(button)
      button.addEventListener('click', () => rewriteSite(building.site, i))
    }
  })
  setExpandFunction(sortingExpandButton, sortingContainerList)
  return sortingBox
}
const generateConversion = (building, box) => {
  const conversionBox = createElement('div', 'box', `conversion-${building.site}`, '', box)
  conversionBox.textContent = null
  const conversionHeadContainer = createElement('div', 'container', '', '', conversionBox)
  const conversionExpandButton = createElement('button', '', '', '+', conversionHeadContainer)
  createElement('span', '', '', 'Conversion Information', conversionHeadContainer)
  const conversionContainerList = []
  BUILDING_OBJECT[building.name].conversion.forEach(val => {
    const conversionContainer = createElement('div', 'container', '', '', conversionBox)
    conversionContainerList.push(conversionContainer)
    createElement(
      'span', '', '', `1 ${val.from} -> ${val.efficiency} ${val.to}`, conversionContainer)
  })
  setExpandFunction(conversionExpandButton, conversionContainerList)
  return conversionBox
}
const generateSite = (building) => {
  const siteBox = createElement('div', 'box', '', '', document.getElementById`site`)
  const topContainer = createElement('div', 'container', '', '', siteBox)
  createElement(
    'span', '', `site-${building.site}`, `${building.site} ${building.name}`, topContainer)
  const topEndItem = createElement('span', '', '', '', topContainer)
  createElement('span', '', `content-${building.site}`, building.content, topEndItem)
  createElement('span', '', '', ' ', topEndItem)
  createElement(
    'span', '', `amount-${building.site}`,
    `${building.amount} of ${building.capacity}`, topEndItem)
  const secondBox = createElement('div', 'container', '', '', siteBox)
  const detailExpandButton = createElement(
    'button', '', `button-${building.site}`, '+', secondBox)
  const secondEndItem = createElement('span', '', '', '', secondBox)
  createElement(
    'span', '', `output-${building.site}`,
    `to ${building.output} ${siteList[building.output].name}`, secondEndItem)
  createElement('span', '', '', ' ', secondEndItem)
  const checkbox = createElement('input', '', `checkbox-${building.site}`, '', secondEndItem)
  checkbox.type = 'checkbox'
  checkbox.checked = siteList[building.site].timestamp ? true : false
  checkbox.addEventListener('input', e => {
    siteList[building.site].timestamp = e.target.checked ? Date.now() : 0
  })
  const boxList = [
    generateOutput(building, siteBox),
    generateSorting(building, siteBox),
    generateConversion(building, siteBox)
  ]
  setExpandFunction(detailExpandButton, boxList)
  const bottom = createElement('div', 'container', '', '', siteBox)
  const progress = createElement('progress', '', `progress-${building.site}`, '', bottom)
  progress.max = building.capacity
  progress.value = building.amount
}
const generateMarket = v => {
  const marketItem = document.getElementById`market`
  const box = createElement('div', 'box', '', '', marketItem)
  const container = createElement('div', 'container', '', '', box)
  createElement('span', '', '', v.name, container)
  const span = createElement('span', '', '', '', container)
  createElement('span', '', '', `Cost ${v.value} ${v.unit} `, span)
  const button = createElement('button', '', '', 'Install', span)
  button.addEventListener('click', async () => {
    const building = buildingGenerator(v.site)
    building.output = building.site = siteList.length
    building.amount = -v.value
    console.log('v',v, 'n', v.site, 'l', siteList.length)
    console.log(building)
    await putStore(building)
    siteList.push(building)
    displayElements()
  })
  createElement('progress', '', '', '', box)
}
const generateSetting = v => {
  const box = createElement('div', 'box', '', '', document.getElementById`setting`)
  const container = createElement('div', 'container', '', '', box)
  const button = createElement('button', '', '', v.name, container)
  button.addEventListener('click', v.function)
}
const displayElements = () => {
  return new Promise(resolve => {
    document.getElementById`site`.textContent = 'Site'
    document.getElementById`market`.textContent = 'Market'
    document.getElementById`setting`.textContent = 'Setting'
    siteList.forEach(v => generateSite(v))
    marketList.forEach(v => generateMarket(v))
    SETTING_LIST.forEach(v => generateSetting(v))
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