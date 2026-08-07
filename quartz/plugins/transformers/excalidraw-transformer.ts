import type { QuartzTransformerPlugin, BuildCtx } from "@quartz-community/types"

function replaceExcalidrawLinks(text: string): string {
  const regex = /!\[\[([\s\S]*?)\.excalidraw\]\]/g;

  return text.replace(regex, (match, innerContent) => {
    const newLink = `<div style="overflow: auto;"><img style="max-width: 100%; height: auto;" src="Графы/${innerContent}.svg"></div>`;
    return newLink;
  });
}

export const ExcalidrawTransformer: QuartzTransformerPlugin<{ enabled: boolean }> = (options) => {
  return {
    name: "ExcalidrawTransformer",
    textTransform(_ctx: BuildCtx, src: string) {
      return replaceExcalidrawLinks(src)
    }
  };
};