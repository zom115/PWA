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
const BUILDING_LIST = ['Storage Tank', 'Generator Engine', 'Rig', 'Battery']
const MATERIAL_LIST = ['Crude Oil', 'EU']
const BUILDING_OBJECT = {
  [BUILDING_LIST[0]]: {
    capacity: 40,
    recipe: [{
      from: {[MATERIAL_LIST[0]]: 1},
      to: {[MATERIAL_LIST[0]]: 1}
    }],
    price: {
      value: 32+8,
      unit: MATERIAL_LIST[0]
    }
  }, [BUILDING_LIST[1]]: {
    capacity: 20,
    recipe: [{
      from: {[MATERIAL_LIST[0]]: 1},
      to: {[MATERIAL_LIST[1]]: 2}
    }],
    price: {
      value: 64+16,
      unit: MATERIAL_LIST[0]
    }
  }, [BUILDING_LIST[2]]: {
    capacity: 2 ** 3 + 2,
    recipe: [{
      from: {[MATERIAL_LIST[1]]: 1},
      to: {[MATERIAL_LIST[0]]: 1}
    }],
    price: {
      value: 2 ** 6 + 2 ** 4,
      unit: MATERIAL_LIST[1]
    }
  }, [BUILDING_LIST[3]]: {
    capacity: 2 ** 6 + 2 ** 4,
    recipe: [{
      from: {[MATERIAL_LIST[1]]: 1},
      to: {[MATERIAL_LIST[1]]: 1}
    }],
    price: {
      value: 2 ** 6 + 2 ** 4,
      unit: MATERIAL_LIST[1]
    }
  }
}
const FIRST_BUILDING_LIST = []
const buildingGenerator = (index) => {
  const object = {}
  object.name = BUILDING_LIST[index]
  object.capacity = BUILDING_OBJECT[BUILDING_LIST[index]].capacity
  object.content = {
    '': {
      amount: 0,
      output: index,
      timestamp: 0
    }
  }
  object.timestamp = 0
  return object
}
for (let i = 0; i < 3; i++) FIRST_BUILDING_LIST[i] = buildingGenerator(i)

FIRST_BUILDING_LIST[0].content = {
  [MATERIAL_LIST[0]]: {
    amount: 8,
    output: 0,
    timestamp: 0
  }
}
const CONVERT_WEIGHT_TIME = 2e3
const TRANSPORT_WEIGHT_TIME = 1e3
const SETTING_LIST = [{
  name: 'Hide Conversion Information',
  function: () => {hideConversionToggle()}
}, {
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
let displayFlagObject = {}
let showConversionFlag = false
const hideConversionToggle = () => {
  showConversionFlag = !showConversionFlag
  document.getElementById`site`.textContent = 'Site'
  siteList.forEach(v => generateSite(v))
}
let db
const openDb = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onsuccess = async () => {
      db = request.result
      // deleteDb(false)
      // return
      await setDbFirst().catch( async () => {
        await Promise.all(STORE_NAME_LIST.map(async v => await getDbForBuffer(v)))
      })
      await generateElementToBody()
      await generateElement()
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
const rewriteOutput = (formerIndex, formerContent, index) => {
  // local list update
  formerContent.output = index
  // db update
  putStore(siteList[formerIndex])
  // element update
  generateElement()
}
const rewriteSite = (former, i) => {
  console.log('rewrite site')
  siteList.splice(i, 0, siteList.splice(former, 1)[0])
  siteList.forEach((v, index) => {
    Object.values(v.content).forEach(value => {
      if (value.output === former) value.output = i
      else if (former < i) {
        if (former <= value.output && value.output <= i) {
          value.output -= 1
        }
      } else {
        if (i <= value.output && value.output <= former) {
          value.output += 1
        }
      }
      v.site = index
    })
    putStore(v)
  })
  generateElement()
}
const transportProcess = (senderSite, senderContent) => {
  if (senderContent.timestamp === 0) return
  const outputSite = siteList[senderContent.output]
  const time = Math.abs(
    senderSite.site - siteList[senderContent.output].site) * TRANSPORT_WEIGHT_TIME
  if (
    0 < senderContent.amount &&
    Object.values(outputSite.content)[0].amount < outputSite.capacity &&
    time !== 0
  ) {
    if (senderContent.timestamp + time <= Date.now()) {
      // local list update
      senderContent.amount -= 1
      Object.keys(outputSite.content)[0].name = senderContent.name
      Object.values(outputSite.content)[0].amount += 1
      senderContent.timestamp += time
      // db update
      putStore(senderSite, outputSite)
      // element update
      generateElement()
    }
  } else {
    senderContent.timestamp = 0
    document.getElementById(`checkbox-${senderSite.site}`).checked = false
  }
}
const convertProcess = targetSite => {
  const reset = () => {
    targetSite.timestamp = 0
    // document.getElementById(`checkbox-${targetSite.site}`).checked = false
  }
  Object.keys(targetSite.content).forEach(v => {
    BUILDING_OBJECT[targetSite.name].recipe.forEach(va => {
      // まずcontentがrecipeにあるか
      // from some レシピ検索
      if (Object.keys(va.from).some(val => val === v.name)) {
        // 材料足りてるか
        // TODO remake siteList[n].content for Object
        const nameObject = {}
        targetSite.content.forEach(valu => nameObject[valu.name] = valu.amount)
        if (Object.keys(va.from).every(valu => Object.values(valu) <= nameObject[valu])) {
          // 足りてたら
          // local list update
          if (targetSite.timestamp &&
            targetSite.timestamp + CONVERT_WEIGHT_TIME <= Date.now()
          ) {
            va.from.forEach(value => targetSite.content[value].amount -= 1)
            va.to.forEach(value => {
              out.content[value].name = Object.keys(value)
              out.content[value].amount += Object.values(value)
            })
            targetSite.timestamp += time
            // db update
            putStore(targetSite, out)
            // element update
            generateElement()
          } else reset()
        } else reset()
      } else reset()
    })
  })
}
const convert = () => {
  siteList.forEach(value => {
    Object.values(value.content).forEach(valu => transportProcess(value, valu))
    convertProcess(value)
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
  if (displayFlagObject[expandButton.id] === undefined) {
    displayFlagObject[expandButton.id] = false
    expandButton.textContent = '+'
  }
  if (displayFlagObject[expandButton.id]) {
    containerList.forEach(v => v.style.display = 'flex')
    expandButton.textContent = '-'
  } else {
    containerList.forEach(v => v.style.display = 'none')
    expandButton.textContent = '+'
  }
  expandButton.addEventListener('click', () => {
    displayFlagObject[expandButton.id] = !displayFlagObject[expandButton.id]
    expandButton.textContent = expandButton.textContent === '+' ? '-' : '+'
    containerList.forEach(v => {
      v.style.display = v.style.display === 'none' ? 'flex' : 'none'
    })
  })
}
const generateSorting = (building, box) => {
  const sortingBox = createElement('div', 'box', `sorting-${building.site}`, '', box)
  sortingBox.textContent = null
  const sortingHeadContainer = createElement('div', 'container', '', '', sortingBox)
  const sortingExpandButton = createElement(
    'button', '', `sorting-button-${building.site}`, '', sortingHeadContainer)
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
        createElement(
          'span', '', '', `${building.site < v.site ? v.site : v.site - 1
          } and ${building.site < v.site ? v.site + 1: v.site}`, sortingContainer)
      }
      const button = createElement(
        'button', '', `sorting-${building.site}-${i}`, '->', sortingContainer)
      sortingButtonList.push(button)
      button.addEventListener('click', () => {
        rewriteSite(building.site, i)
      })
    }
  })
  setExpandFunction(sortingExpandButton, sortingContainerList)
  return sortingBox
}
const generateConversion = (building, box) => {
  const recipeBox = createElement('div', 'box', `recipe-${building.site}`, '', box)
  recipeBox.textContent = null
  if (showConversionFlag) return recipeBox
  const recipeHeadContainer = createElement('div', 'container', '', '', recipeBox)
  const recipeExpandButton = createElement(
    'button', '', `recipe-button-${building.site}`, '', recipeHeadContainer)
  createElement('span', '', '', 'Conversion Information', recipeHeadContainer)
  const recipeContainerList = []
  BUILDING_OBJECT[building.name].recipe.forEach(val => {
    const recipeContainer = createElement('div', 'container', '', '', recipeBox)
    recipeContainerList.push(recipeContainer)
    createElement(
      'span', '', '',
      `${Object.entries(val.from)} -> ${Object.entries(val.to)}`, recipeContainer)
  })
  setExpandFunction(recipeExpandButton, recipeContainerList)
  return recipeBox
}
const generateSite = (building) => {
  const siteBox = createElement('div', 'box', '', '', document.getElementById`site`)
  const topContainer = createElement('div', 'container', '', '', siteBox)
  const topStartItem = createElement('span', '', '', '', topContainer)
  const detailExpandButton = createElement(
    'button', '', `detail-button-${building.site}`, '', topStartItem)
  createElement('span', '', '', ' ', topStartItem)
  createElement(
    'span', '', '', `${building.site} ${building.name}`, topStartItem)
  createElement(
    'span', '', '', `${Object.values(building.content).reduce((acc, cur) => {
      return acc + cur.amount
    }, 0)} of ${building.capacity}`, topContainer)
  const containerBox = createElement('div', 'box', '', '', siteBox)
  Object.values(building.content).forEach(v => {
    const contentContainer = createElement('div', 'container', '', '', containerBox)
    createElement('span', '', '', v.name, contentContainer)
    createElement('span', '', '', v.amount, contentContainer)
    const progressContainer = createElement('div', 'container', '', '', containerBox)
    const progress = createElement(
      'progress', '', `progress-${building.site}`, '', progressContainer)
    progress.max = building.capacity
    progress.value = v.amount
    const outputBox = createElement('div', 'box', '', '', containerBox)
    const outputTopContainer = createElement('div', 'container', '', '', outputBox)
    const outputExpandButton = createElement(
      'button', '', `output-button-${building.site}`, '', outputTopContainer)
    const outputEndItem = createElement('span', '', '', '', outputTopContainer)
    createElement(
      'span', '', '',
      `to ${v.output} ${siteList[v.output].name}`, outputEndItem)
    createElement('span', '', '', ' ', outputEndItem)
    const checkbox = createElement(
      'input', '', `checkbox-${building.site}`, '', outputEndItem)
    checkbox.type = 'checkbox'
    checkbox.checked = v.timestamp ? true : false
    checkbox.addEventListener('input', e => v.timestamp = e.target.checked ? Date.now() : 0)
    let outputContainerList = []
    let outputButtonList = []
    siteList.forEach((value, index) => {
      const outputContainer = createElement('div', 'container', '', '', outputBox)
      outputContainerList.push(outputContainer)
      createElement('span', '', '', `${index} ${value.name}`, outputContainer)
      const button = createElement(
        'button', '', '', '->', outputContainer)
      outputButtonList.push(button)
      button.addEventListener('click', () => {
        rewriteOutput(building.site, v, index)
        outputButtonList.forEach(v => v.style.display = 'flex')
        button.style.display = 'none'
      })
      if (v.output === index) button.style.display = 'none'
    })
    setExpandFunction(outputExpandButton, outputContainerList)
  })

  const boxList = [
    containerBox,
    generateSorting(building, siteBox),
    generateConversion(building, siteBox)
  ]
  setExpandFunction(detailExpandButton, boxList)
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
    Object.values(building.content)[0].output = building.site = siteList.length
    Object.values(building.content)[0].amount = -v.value
    console.log('v',v, 'n', v.site, 'l', siteList.length)
    console.log(building)
    await putStore(building)
    siteList.push(building)
    generateElement()
  })
  createElement('progress', '', '', '', box)
}
const generateSetting = v => {
  const box = createElement('div', 'box', '', '', document.getElementById`setting`)
  const container = createElement('div', 'container', '', '', box)
  const button = createElement('button', '', '', v.name, container)
  button.addEventListener('click', v.function)
}
const generateElement = () => {
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