import * as fs from "fs"
import puppeteer from 'puppeteer'
import path from "path"
import { optimize, Config } from 'svgo';

export async function buildExcalidraw(): Promise<void> {
  let browser
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--disable-setuid-sandbox',
        "--disable-web-security",
        "--allow-running-insecure-content",
        "--no-sandbox"
      ],
    })
  } catch (error) {
    console.error('Error launching puppeter:', error)
    return
  }

  // Create HTML-page, that connects React, ReactDOM and Excalidraw
  const page = await browser.newPage();
  await page.setContent(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Excalidraw in browser</title>
        <meta charset="UTF-8" />
        <link
          rel="stylesheet"
          href="https://esm.sh/@excalidraw/excalidraw@0.18.0/dist/dev/index.css"
        />
        <link rel="stylesheet" href="./index.css" />
        <script>
            window.EXCALIDRAW_ASSET_PATH = "https://esm.sh/@excalidraw/excalidraw@0.18.0/dist/prod/";
            </script>
        <script type="importmap">
          {
            "imports": {
              "react": "https://esm.sh/react@19.0.0",
              "react/jsx-runtime": "https://esm.sh/react@19.0.0/jsx-runtime",
              "react-dom": "https://esm.sh/react-dom@19.0.0"
              }
          }
        </script>
      </head>

      <body>
        <div class="container">
          <h1>Excalidraw Embed Example</h1>
          <div id="app"></div>
        </div>
        <script type="text/javascript" src="packages/excalidraw/index.js"></script>
        <script type="module">
            import * as ExcalidrawLib from 'https://esm.sh/@excalidraw/excalidraw@0.18.0/dist/dev/index.js?external=react,react-dom';
            window.exportToSvg = async (diagram) => {
                try {
                  diagram.appState.exportWithDarkMode = true;
                  
                  let svg = await ExcalidrawLib.exportToSvg(diagram);
                  const serializer = new XMLSerializer();
                  return serializer.serializeToString(svg);
                
                } catch (error) {
                    return { error: error.message };
                }
            };
        </script>
    </body>
    </html>
    `,
    { waitUntil: 'load' }
  );

  try {
    // Get directory entries as Dirent objects
    const excalidrawDir = "./content/Excalidraw"
    const svgDir = "./content/Графы"
    const entries = await fs.promises.readdir(excalidrawDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = path.join(excalidrawDir, entry.name);

        // extract obsidian's json
        const excalidrawDiagram = await extractJsonFromObsidianExcalidraw(fullPath)

        // export obsidian diagram as svg inside headless browser
        const svgString = await page.evaluate(async(excalidrawDiagram) => {
          window.document.body.innerHTML = ""
          // @ts-ignore
          const svgString = await window.exportToSvg(excalidrawDiagram)
          return svgString
        }, excalidrawDiagram)

        const finalSvg = optimize(svgString, {
          multipass: true, // Repeatedly optimize until fully minimized
          js2svg: {
            indent: 0,     // Remove unnecessary tabs/spaces
            pretty: false, // Minify into a single line
          },
          plugins: [
            'preset-default', // Enables standard minification rules
            'removeComments',  // Strips XML comments
            'removeMetadata',  // Removes editor-specific junk metadata
          ],
        }).data

        const svgFileName = entry.name.substring(0, entry.name.length - ".excalidraw.md".length) + ".svg"
        const svgFilePath = path.join(svgDir, svgFileName)
        
        fs.writeFileSync(svgFilePath, finalSvg)
        console.log(`File created: ${svgFilePath}`)
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error)
  }

  await browser.close()
}

async function extractJsonFromObsidianExcalidraw(filePath: string): Promise<any> {
  const fileContent = await fs.promises.readFile(filePath, 'utf-8');

  // Ищем маркер начала блока кода с JSON (```json)
  const jsonBlockStart = fileContent.indexOf('```json');
  
  if (jsonBlockStart === -1) {
    throw new Error('Не найден блок ```json в файле Excalidraw.');
  }

  // Смещаемся после "```json" и перевода строки
  const jsonStringStartIndex = fileContent.indexOf('\n', jsonBlockStart);
  if (jsonStringStartIndex === -1) {
    throw new Error('Некорректная структура файла.');
  }

  // Ищем конец блока кода (```), чтобы отрезать лишний текст снизу (если он есть)
  const jsonBlockEnd = fileContent.indexOf('```', jsonStringStartIndex);
  
  const jsonString = jsonBlockEnd !== -1
    ? fileContent.substring(jsonStringStartIndex, jsonBlockEnd).trim()
    : fileContent.substring(jsonStringStartIndex).trim();

  // Парсим извлеченный кусок в объект
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`Ошибка парсинга JSON: ${(error as Error).message}`);
  }
}

export async function cleanup() {
    const svgDir = "./content/Графы"
    const entries = await fs.promises.readdir(svgDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = path.join(svgDir, entry.name);
        fs.rmSync(fullPath)
      }
    }
}