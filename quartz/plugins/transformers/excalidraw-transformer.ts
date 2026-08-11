import type { QuartzTransformerPlugin, BuildCtx } from "@quartz-community/types"

function replaceExcalidrawLinks(text: string): string {
  const regex = /!\[\[([\s\S]*?)\.excalidraw\]\]/g;

  return text.replace(regex, (_match, innerContent) => {
    const imageSrc = `Graphs/${innerContent}.svg`
    const openFullScreenButton = `<a href="javascript:void(window.open(new URL('${imageSrc}', window.location.origin).href, '_blank'))" 
      style="position: absolute; top: 0px; right: 0px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: none; color: #ffffff55; text-decoration: none; font-family: sans-serif; font-size: 14px; border-radius: 6px; box-sizing: border-box;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
      </svg>
    </a>`
    const img = `<img style="max-width: 100%; height: auto;" src="${imageSrc}">`
    const externalLinkIconHider = `<style>
      .external-icon {
        display: none;
      }
    </style>`

    const newLink = `<div style="position: relative; display: inline-block;">${externalLinkIconHider}${img}${openFullScreenButton}</div>`;
    return newLink;
  });
}

export const ExcalidrawTransformer: QuartzTransformerPlugin<{ enabled: boolean }> = (_options) => {
  return {
    name: "ExcalidrawTransformer",
    textTransform(_ctx: BuildCtx, src: string) {
      return replaceExcalidrawLinks(src)
    }
  };
};