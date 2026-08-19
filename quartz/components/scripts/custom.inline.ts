//@ts-nocheck
const FILE_EXTENSIONS = /\.(canvas|svg|png|jpg|jpeg|gif|webp|pdf|zip|mp4|mp3)($|\?)/i

let currentBackHandler: (() => void) | null = null

document.addEventListener("nav", (e: CustomEvent) => {
    onTelegramReady((tg) => {
        console.log("Telegram WebApp Inited")
        setupBackButton(tg, e)
        setupGlobalLinkInterceptor(tg)
    })
})

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

function setupBackButton(tg: any, e: CustomEvent) {
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
        window.history.back()
    }

    tg.BackButton.onClick(currentBackHandler)
}

function setupGlobalLinkInterceptor(tg: any) {
    if ((window as any).__linkInterceptorInstalled) return
    (window as any).__linkInterceptorInstalled = true

    document.addEventListener(
        "click",
        (e: MouseEvent) => {
            const target = e.target as HTMLElement
            const anchor = target.closest("a") as HTMLAnchorElement | null

            if (!anchor) return

            const href = anchor.getAttribute("href") || ""

            const isExternal = anchor.host && anchor.host !== window.location.host
            const isStaticFile = FILE_EXTENSIONS.test(href) || FILE_EXTENSIONS.test(anchor.pathname)
            const isLinkFromStaticFile = FILE_EXTENSIONS.test(window.location.href)
            
            if (!isLinkFromStaticFile && !isStaticFile && !isExternal) {
                return
            }

            // check if link targets file or from file
            if (
                isLinkFromStaticFile
                || FILE_EXTENSIONS.test(href)
                || FILE_EXTENSIONS.test(anchor.pathname)
            ) {
                // stop default browser & Quartz logic
                e.preventDefault()
                e.stopPropagation()
                e.stopImmediatePropagation()

                // get absolute URL
                const fullUrl = anchor.href

                // open file via Telegram Modal / External Browser
                if (tg.openLink) {
                    tg.openLink(fullUrl)
                } else {
                    window.open(fullUrl, "_blank")
                }
            }
        },
        true
    )
}
