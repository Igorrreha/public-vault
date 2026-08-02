import { QuartzTransformerPlugin } from "../types"

export interface Options {
  // ваши опции, если нужны
}

export const ExcalidrawSvgAdaptor: QuartzTransformerPlugin<Options> = () => {
  return {
    name: "ExcalidrawSvgAdaptor",
    textTransform(_ctx, src) {
      // Вариант А: Самый простой способ (работает с сырым текстом до парсинга)
      // Допустим, вы хотите заменить [[СекретныйТег]] на обычный текст или плашку
      let modified = src.toString()
      modified = modified.replace(/\[\[Вырезаемый текст\]\]/g, "*[0_0]*")
      return modified
    },
  }
}