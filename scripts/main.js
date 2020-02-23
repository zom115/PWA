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
const BUILDING_LIST = [
  'Storage Tank',
  'Generator Engine',
  'Rig',
  'Battery',
  'Electric Heater',
  'Distillator' // 5
]
const MATERIAL_LIST = [
  'Crude Oil',
  'EU',
  'Hot Crude Oil',
  'Light Distillates',
  'Middle-Heavy Distillates',
  'Hot Middle-Heavy Distillates',
  'Middle Distillates',
  'Heavy Distillates' // 7
]
const BUILDING_OBJECT = {
  [BUILDING_LIST[0]]: {
    capacity: 40,
    recipe: [{
      from: {'': 0},
      to: {'': 0}
    }],
    price: {
      value: 32+8,
      unit: MATERIAL_LIST[0]
    }
  }, [BUILDING_LIST[1]]: {
    capacity: 20,
    recipe: [{
      from: {[MATERIAL_LIST[0]]: 1},
      to: {[MATERIAL_LIST[1]]: 1}
    }, {
      from: {[MATERIAL_LIST[2]]: 1},
      to: {[MATERIAL_LIST[1]]: 1}
    }, {
      from: {[MATERIAL_LIST[3]]: 1},
      to: {[MATERIAL_LIST[1]]: 1}
    }, {
      from: {[MATERIAL_LIST[4]]: 1},
      to: {[MATERIAL_LIST[1]]: 1}
    }, {
      from: {[MATERIAL_LIST[5]]: 1},
      to: {[MATERIAL_LIST[1]]: 1}
    }, {
      from: {[MATERIAL_LIST[6]]: 1},
      to: {[MATERIAL_LIST[1]]: 1}
    }, {
      from: {[MATERIAL_LIST[7]]: 1},
      to: {[MATERIAL_LIST[1]]: 1}
    }],
    price: {
      value: 64+16,
      unit: MATERIAL_LIST[0]
    }
  }, [BUILDING_LIST[2]]: {
    capacity: 2 ** 3 + 2,
    recipe: [{
      from: {[MATERIAL_LIST[1]]: 1},
      to: {[MATERIAL_LIST[0]]: 2}
    }],
    price: {
      value: 2 ** 6 + 2 ** 4,
      unit: MATERIAL_LIST[1]
    }
  }, [BUILDING_LIST[3]]: {
    capacity: 2 ** 6 + 2 ** 4,
    recipe: [{
      from: {'': 0},
      to: {'': 0}
    }],
    price: {
      value: 2 ** 6 + 2 ** 4,
      unit: MATERIAL_LIST[1]
    }
  }, [BUILDING_LIST[4]]: {
    capacity: 2 ** 6 + 2 ** 4,
    recipe: [{
      from: {[MATERIAL_LIST[0]]: 1, [MATERIAL_LIST[1]]: 1},
      to: {[MATERIAL_LIST[2]]: 1}
    }, {
      from: {[MATERIAL_LIST[0]]: 1, [MATERIAL_LIST[4]]: 1},
      to: {[MATERIAL_LIST[5]]: 1}
    }],
    price: {
      value: 2 ** 5 + 2 ** 3,
      unit: MATERIAL_LIST[1]
    }
  }, [BUILDING_LIST[5]]: {
    capacity: 2 ** 6 + 2 ** 4,
    recipe: [{
      from: {[MATERIAL_LIST[2]]: 3},
      to: {[MATERIAL_LIST[3]]: 1, [MATERIAL_LIST[4]]: 2}
    }, {
      from: {[MATERIAL_LIST[5]]: 3},
      to: {[MATERIAL_LIST[6]]: 1, [MATERIAL_LIST[7]]: 1}
    }],
    price: {
      value: 0,
      unit: MATERIAL_LIST[2]
    }
  }
}
const FIRST_BUILDING_LIST = []
const buildingGenerator = (index) => {
  const object = {}
  object.name = BUILDING_LIST[index]
  object.capacity = BUILDING_OBJECT[BUILDING_LIST[index]].capacity
  object.content = {}
  object.timestamp = 0
  return object
}
for (let i = 0; i < 3; i++) FIRST_BUILDING_LIST[i] = buildingGenerator(i)
const setContent = (site, material) => {
  site.content = {
    [material]: {
      amount: 8,
      output: 0,
      timestamp: 0
    }
  }
}
setContent(FIRST_BUILDING_LIST[0], MATERIAL_LIST[0])
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
  siteList.forEach(v => generateSiteBox(v))
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
const putStore = site => {
  return new Promise(resolve => {
    const store = getObjectStore(STORE_NAME_LIST[0], 'readwrite')
    const request1 = store.put(site)
    request1.onsuccess = () => {
      console.log('put store')
      resolve()
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
const rewriteOutput = async (formerIndex, formerContent, index) => {
  console.log('rewriteOutput()')
  return new Promise( async resolve => {
    // local list update
    formerContent.output = index
    // db update
    await putStore(siteList[formerIndex])
    // element update
    await generateElement()
    resolve()
  })
}
const sortingSite = async (senderSiteIndex, destinationSiteIndex) => {
  return new Promise(async resolve => {
    siteList.splice(destinationSiteIndex, 0, siteList.splice(senderSiteIndex, 1)[0])
    siteList.forEach((v, index) => {
      v.site = index
      Object.values(v.content).forEach(value => {
        if (value.output === senderSiteIndex) value.output = destinationSiteIndex
        else if (senderSiteIndex < destinationSiteIndex) {
          if (senderSiteIndex <= value.output && value.output <= destinationSiteIndex) {
            value.output -= 1
          }
        } else {
          if (destinationSiteIndex <= value.output && value.output <= senderSiteIndex) {
            value.output += 1
          }
        }
      })
      putStore(v) // TODO await
    })
    await generateElement()
    resolve()
  })
}
const transportProcess = async (site, contentName) => {
  return new Promise(async resolve => {
    const outputSite = siteList[site.content[contentName].output]
    const time = Math.abs(
      site.site - siteList[site.content[contentName].output].site) * TRANSPORT_WEIGHT_TIME
    const update = async () => {
      // local list update
      site.content[contentName].amount -= 1
      if (site.content[contentName].amount === 0) site.content[contentName].timestamp = 0
      if (Object.keys(outputSite.content).some(v => v === contentName)) {
      } else {
        outputSite.content[contentName] = {
          amount: 0,
          output: outputSite.site,
          timestamp: 0
        }
        generateContentContainer(outputSite)
      }
      outputSite.content[contentName].amount += 1
      if (site.content[contentName].amount) site.content[contentName].timestamp += time
      // db update
      await putStore(site)
      await putStore(outputSite)
      // element update
      elementUpdate(site)
      elementUpdate(outputSite)
      resolve()
    }
    if (
      time === 0 ||
      site.content[contentName].amount <= 0 ||
      outputSite.capacity <= Object.values(outputSite.content).reduce((acc, cur) => {
        return acc + cur.amount}, 0)
      ) site.content[contentName].timestamp = 0
    if (
      site.content[contentName].timestamp !== 0 &&
      site.content[contentName].timestamp + time <= Date.now()
    ) update()
    resolve()
  })
}
const convertProcess = async targetSite => {
  return new Promise(resolve => {
    const update = async () => {
      // db update
      await putStore(targetSite)
      // element update
      elementUpdate(targetSite)
      resolve()
    }
    if (Object.values(BUILDING_OBJECT[targetSite.name].recipe[0].from)[0] === 0) {
      return resolve()
    }
    let bool = false
    BUILDING_OBJECT[targetSite.name].recipe.forEach(v => {
      if (Object.keys(v.from).every(va => {
        return Object.keys(targetSite.content).some(val => {
          return val === va
        })
      })) bool = true
    })
    if (!bool) return resolve()
    Object.keys(targetSite.content).forEach(v => {
      BUILDING_OBJECT[targetSite.name].recipe.forEach(va => {
        // recipe search
        if (Object.keys(va.from).some(val => {
          return val === v})) {
          if (
            Object.keys(va.from).every(val => {
              return targetSite.content[val] !== undefined
            }) &&
            Object.keys(va.from).every(val => {
              return va.from[val] <= targetSite.content[val].amount
            }) &&
            Object.values(va.to).reduce((acc, cur) => {return acc + cur}, 0) +
            Object.values(targetSite.content).reduce((acc, cur) => {
            return acc + cur.amount}, 0) <=
            targetSite.capacity
          ) {
            // local list update
            if (targetSite.timestamp === 0) targetSite.timestamp = Date.now()
            if (targetSite.timestamp + CONVERT_WEIGHT_TIME <= Date.now()) {
              Object.entries(va.from).forEach(value => {
                targetSite.content[value[0]].amount -= value[1]
                if (targetSite.content[value[0]].amount === 0) targetSite.timestamp = 0
              })
              Object.entries(va.to).forEach(value => {
                if (Object.keys(targetSite.content).some(v => v === value[0])) {
                } else {
                  targetSite.content[value[0]] = {
                    amount: 0,
                    output: targetSite.site,
                    timestamp: 0
                  }
                  generateContentContainer(targetSite)
                }
                console.log(value[0], value[1])
                targetSite.content[value[0]].amount += value[1]
                if (targetSite.timestamp) targetSite.timestamp += CONVERT_WEIGHT_TIME
              })
              update()
            }
          }
        }
      })
    })
    resolve()
  })
}
const convert = () => {
  return new Promise(async resolve => {
    await Promise.all(siteList.map(async v => {
      await Promise.all(Object.keys(v.content).map(async val => {
        await transportProcess(v, val)
      }))
      await convertProcess(v)
    }))
    resolve()
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
    button.addEventListener('click', () => openTime = Date.now(), true)
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
  document.getElementById(expandButton.id).addEventListener('click', async () => {
    console.log('click', expandButton.id)
    return new Promise(resolve => {
      displayFlagObject[expandButton.id] = !displayFlagObject[expandButton.id]
      expandButton.textContent = expandButton.textContent === '+' ? '-' : '+'
      containerList.forEach(v => {
        v.style.display = v.style.display === 'none' ? 'flex' : 'none'
      })
      resolve()
    })
  }, true)
}
const generateContentContainer = building => {
  const contentBox = document.getElementById(`content-box-${building.site}`)
  contentBox.textContent = null
  Object.values(building.content).forEach((v, i) => {
    const contentContainer = createElement('div', 'container', '', '', contentBox)
    createElement('span', '', '', Object.keys(building.content)[i], contentContainer)
    createElement('span', '', `amount-${building.site}-${i}`, v.amount, contentContainer)
    const progressContainer = createElement('div', 'container', '', '', contentBox)
    const progress = createElement(
      'progress', '', `progress-${building.site}-${i}`, '', progressContainer)
    progress.max = building.capacity
    progress.value = v.amount
    const outputBox = createElement('div', 'box', '', '', contentBox)
    const outputTopContainer = createElement('div', 'container', '', '', outputBox)
    const outputExpandButton = createElement(
      'button', '', `output-button-${building.site}-${i}`, '', outputTopContainer)
    const outputEndItem = createElement('span', '', '', '', outputTopContainer)
    createElement(
      'span', '', '',
      `to ${v.output} ${siteList[v.output].name}`, outputEndItem)
    createElement('span', '', '', ' ', outputEndItem)
    const checkbox = createElement(
      'input', '', `checkbox-${building.site}-${i}`, '', outputEndItem)
    checkbox.type = 'checkbox'
    checkbox.checked = v.timestamp ? true : false
    checkbox.addEventListener('input', async () => {
      v.timestamp = v.timestamp ? 0 : Date.now()
      await putStore(building)
    }, true)
    let outputContainerList = []
    let outputButtonList = []
    siteList.forEach((value, index) => {
      const outputContainer = createElement('div', 'container', '', '', outputBox)
      outputContainerList.push(outputContainer)
      createElement('span', '', '', `${index} ${value.name}`, outputContainer)
      const button = createElement('button', '', '', '->', outputContainer)
      outputButtonList.push(button)
      button.addEventListener('click', async () => {
        await rewriteOutput(building.site, v, index)
        outputButtonList.forEach(v => v.style.display = 'flex')
        button.style.display = 'none'
      }, true)
      if (v.output === index) button.style.display = 'none'
    })
    setExpandFunction(outputExpandButton, outputContainerList)
  })
}
const generateSortingBox = (building, box) => {
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
      button.addEventListener('click', async () => {
        await sortingSite(building.site, i)
      }, true)
    }
  })
  setExpandFunction(sortingExpandButton, sortingContainerList)
  return sortingBox
}
const generateConversionBox = (building, box) => {
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
const generateSiteBox = building => {
  const siteBox = createElement('div', 'box', '', '', document.getElementById`site`)
  const topContainer = createElement('div', 'container', '', '', siteBox)
  const topStartItem = createElement('span', '', '', '', topContainer)
  const detailExpandButton = createElement(
    'button', '', `detail-button-${building.site}`, '', topStartItem)
  createElement('span', '', '', ' ', topStartItem)
  createElement(
    'span', '', '', `${building.site} ${building.name}`, topStartItem)
  createElement(
    'span', '', `value-state-${building.site}`,
    `${Object.values(building.content).reduce((acc, cur) => {
      return acc + cur.amount
    }, 0)} of ${building.capacity}`, topContainer)
  const contentBox = createElement('div', 'box', `content-box-${building.site}`, '', siteBox)
  generateContentContainer(building)
  const boxList = [
    contentBox,
    generateSortingBox(building, siteBox),
    generateConversionBox(building, siteBox)
  ]
  setExpandFunction(detailExpandButton, boxList)
}
const generateMarket = site => {
  const marketItem = document.getElementById`market`
  const box = createElement('div', 'box', '', '', marketItem)
  const container = createElement('div', 'container', '', '', box)
  createElement('span', '', '', site.name, container)
  const span = createElement('span', '', '', '', container)
  createElement('span', '', '', `Cost ${site.value} ${site.unit} `, span)
  const button = createElement('button', '', '', 'Install', span)
  button.addEventListener('click', async () => {
    const building = buildingGenerator(site.site)
    setContent(building, BUILDING_OBJECT[site.name].price.unit)
    Object.values(building.content)[0].output = building.site = siteList.length
    Object.values(building.content)[0].amount = -site.value
    await putStore(building)
    siteList.push(building)
    generateElement()
  }, true)
  createElement('progress', '', '', '', box)
}
const generateSetting = v => {
  const box = createElement('div', 'box', '', '', document.getElementById`setting`)
  const container = createElement('div', 'container', '', '', box)
  const button = createElement('button', '', '', v.name, container)
  button.addEventListener('click', v.function, true)
}
const generateElement = () => {
  console.log('generateElement()')
  return new Promise(resolve => {
    document.getElementById`site`.textContent = 'Site'
    document.getElementById`market`.textContent = 'Market'
    document.getElementById`setting`.textContent = 'Setting'
    siteList.forEach(v => generateSiteBox(v))
    marketList.forEach(v => generateMarket(v))
    SETTING_LIST.forEach(v => generateSetting(v))
    resolve()
  })
}
const elementUpdate = building => {
  // top amount of capacity
  document.getElementById(`value-state-${building.site}`).textContent =
    `${Object.values(building.content).reduce((acc, cur) => {
      return acc + cur.amount
    }, 0)} of ${building.capacity}`
  Object.values(building.content).forEach((v, i) => {
    document.getElementById(`checkbox-${building.site}-${i}`).checked = v.timestamp ?
    true : false
    // content amount
    document.getElementById(`amount-${building.site}-${i}`).textContent = v.amount
    // progress bar
    document.getElementById(`progress-${building.site}-${i}`).value = v.amount
  })
}
const displayUpdate = () => {
  return new Promise(async resolve => {
    const formatTime = argTime => {
      return new Promise(resolve => {
        const mm = ('0' + Math.floor(argTime / 6e4)).slice(-2)
        const ss = ('0' + Math.floor(argTime % 6e4 / 1e3)).slice(-2)
        const ms = ('00' + argTime % 1e3).slice(-3)
        let time = ms
        if (0 < mm || 0 < ss) time = ss + ':' + time
        if (0 < mm) time = mm + ':' + time
        return resolve(time)
      })
    }
    document.getElementById`connectedTime`.textContent = await formatTime(Date.now() - openTime)
    resolve()
  })
}
const asyncFn = async () => {
  await openDb()
  main()
}
asyncFn()
const main = async () => {
  await convert()
  await displayUpdate()
  window.requestAnimationFrame(main)
}
}