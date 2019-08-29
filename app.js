navigator.serviceWorker.register`sw.js`
// if ('serviceWorker' in navigator) {
//   navigator.serviceWorker.register('/sw.js').then(() => {
//     console.log('Service worker registered!')
//   })
// }
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js').then(registration => {
//       // Registration was successful
//       console.log('ServiceWorker registration successful with scope: ', registration.scope)
//     }, err => {
//       // registration failed :(
//       console.log('ServiceWorker registration failed: ', err)
//     })
//   })
// }