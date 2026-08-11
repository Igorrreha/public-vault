//@ts-nocheck
document.addEventListener("nav", (e: CustomEvent) => {
    updateTgBackButton(e)
})

function updateTgBackButton(e: CustomEvent): void {
    try {
        const tg = window.Telegram.WebApp

        if (e.detail.url == "index") {
            tg.BackButton.hide()
        } else {
            tg.BackButton.show()
        }
    }
    catch(e) {
        console.log("No Telegram Connection")
    }
}