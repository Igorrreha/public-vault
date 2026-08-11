//@ts-nocheck
function onTelegramReady(callback: (tg: any) => void, maxRetries = 50) {
  let retries = 0

  const interval = setInterval(() => {
    if (window.Telegram?.WebApp) {
      clearInterval(interval)
      window.Telegram.WebApp.ready() 
      callback(window.Telegram.WebApp)
    
    } else if (retries >= maxRetries) {
      clearInterval(interval)
      console.warn("Telegram WebApp SDK awaiting timeout")
    }
    retries++
  }, 100)
}

document.addEventListener("nav", () => {
    onTelegramReady((tg) => {
        console.log("Telegram WebApp Inited")

        tg.BackButton.show()

        tg.BackButton.onClick(() => {
            window.history.back()
        })
    })
})