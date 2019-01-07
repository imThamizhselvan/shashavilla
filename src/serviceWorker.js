export const register = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(register => {})
      .catch(err => {});
  }
}