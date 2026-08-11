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

let currentBackHandler: (() => void) | null = null

document.addEventListener("nav", (e: CustomEvent) => {
    onTelegramReady((tg) => {
        console.log("Telegram WebApp Inited")

        const currentSlug = e.detail.slug

        if (currentSlug === "index" || currentSlug === "") {
            tg.BackButton.hide()
            return
        }

        tg.BackButton.show()

        if (currentBackHandler) {
            tg.BackButton.offClick(currentBackHandler)
        }

        currentBackHandler = () => {
            if (window.history.length > 1) {
                window.history.back()
            } else {
                window.location.href = "/"
            }
        }

        tg.BackButton.onClick(currentBackHandler)
    })
})
