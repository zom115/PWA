const path = 'scripts/sw.js'
navigator.serviceWorker.register(path)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(path).then(registration => {
    console.log('ServiceWorker registration successful with scope: ', registration.scope)
  }).catch(err => {
    console.log('ServiceWorker registration failed: ', err)
  })
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(path).then(registration => {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope)
    }, err => {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err)
    })
  })
}