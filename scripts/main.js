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

let openTime = Date.now()
document.getElementById('timeReset').addEventListener('click', () => openTime = Date.now())
const countUp = () => {
  const timerId = setTimeout(() => {
    const elapsedTime = Date.now() - openTime
    const mm = ('0' + Math.floor(elapsedTime / 6e4)).slice(-2)
    const ss = ('0' + Math.floor(elapsedTime % 6e4 / 1e3)).slice(-2)
    const ms = ('00' + elapsedTime % 1e3).slice(-3)
    document.getElementById('currentTime').innerHTML = `${mm}:${ss}:${ms}`
    countUp()
  }, 16)
}
countUp()