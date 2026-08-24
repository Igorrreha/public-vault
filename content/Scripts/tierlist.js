// ================= НАСТРОЙКИ =================
let { items = [], categories = ["S", "A", "B", "C"], gradientColors = ["#7fff7f", "#ffdf7f", "#ff7f7f"] } = input;

// Функция генерации градиента
function generateGradient(colorStops, count) {
    if (count <= 0) return [];
    if (count === 1) return [colorStops[0]];
	
    // Преобразование любой CSS строки цвета (HEX) в массив [R, G, B]
    function hexToRgb(hex) {
        let c = hex.replace("#", "");
        if (c.length === 3) c = c.split("").map(x => x + x).join("");
        const num = parseInt(c, 16);
        return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
	
    // Преобразование [R, G, B] обратно в HEX string
    function rgbToHex([r, g, b]) {
        return "#" + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }).join("");
    }
	
    // Линейная интерполяция
    function interpolate(start, end, factor) {
        return start.map((val, i) => val + factor * (end[i] - val));
    }
	
    const rgbStops = colorStops.map(hexToRgb);
    const result = [];
    const segments = rgbStops.length - 1;
	
    for (let i = 0; i < count; i++) {
        const globalProgress = i / (count - 1); // Значение от 0.0 до 1.0
        const scaledProgress = globalProgress * segments;
        const segmentIndex = Math.min(Math.floor(scaledProgress), segments - 1);
        const localProgress = scaledProgress - segmentIndex;
		
        const startColor = rgbStops[segmentIndex];
        const endColor = rgbStops[segmentIndex + 1];
		
        const interpolated = interpolate(startColor, endColor, localProgress);
        result.push(rgbToHex(interpolated));
    }
	
    return result;
}

const UNASSIGNED_LABEL = "—";
let categoryColors = {
    "—": "var(--background-modifier-border)",
}
const gradient = generateGradient(gradientColors, categories.length);
categories.forEach((x, i) => {
    categoryColors[x] = gradient[i];
})

// Загружаем сохраненное состояние из Frontmatter текущей заметки
let savedState = {};

try {
    // Dataview автоматически парсит frontmatter в свойства объекта dv.current()
    const frontmatterData = dv.current().tierlist;
    if (frontmatterData && typeof frontmatterData === "object") {
        savedState = frontmatterData;
    }
} catch(e) {
    savedState = {};
}

const controls = dv.el("div", "", { cls: "dv-tiercontrols" });
const resetButton = controls.createEl("button", { text: "Reset", cls: "dv-tierreset-btn" });
const saveButton = controls.createEl("button", { text: "Save", cls: "dv-tierreset-btn" });

const root = dv.el("div", "", { cls: "dv-tierlist-container" });
const allGroups = [...categories, UNASSIGNED_LABEL];

// Визуальный маркер места вставки
const placeholder = document.createElement("div");
placeholder.className = "dv-tier-placeholder";

// Автоматическое сохранение в Frontmatter заметки
function saveCurrentLayout() {
    const newState = {
        "_colors": categoryColors,
    };
    allGroups.forEach(cat => {
        const dropzone = root.querySelector(`[data-category="${CSS.escape(cat)}"] .dv-tierdropzone`);
        if (dropzone) {
            const itemEls = dropzone.querySelectorAll('.dv-tieritem');
            newState[cat] = Array.from(itemEls).map(el => el.dataset.item);
        }
    });

    // Записываем структуру объекта во Frontmatter
    const activeFile = app.workspace.getActiveFile();
    if (activeFile) {
        app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter.tierlist = newState;
        });
    }
}

// Точный гео-расчет для многострочных (flex-wrap) контейнеров
function getElementBeforeDrop(container, x, y) {
    const draggables = [...container.querySelectorAll('.dv-tieritem:not(.dragging)')];
    if (draggables.length === 0) return null;

    // 1. Группируем элементы по рядам (lines)
    const rows = [];
    let currentRow = [];
    let lastTop = null;

    draggables.forEach(child => {
        const box = child.getBoundingClientRect();
        // Если элемент сдвинут по вертикали более чем на 8px, это новый ряд
        if (lastTop === null || Math.abs(box.top - lastTop) > 8) {
            if (currentRow.length > 0) rows.push(currentRow);
            currentRow = [ { element: child, box: box } ];
            lastTop = box.top;
        } else {
            currentRow.push({ element: child, box: box });
        }
    });
    if (currentRow.length > 0) rows.push(currentRow);

    // 2. Находим ряд, к которому ближе всего курсор по Y
    let targetRow = null;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowTop = row[0].box.top;
        const rowBottom = row[0].box.bottom;
        
        // Если мы выше текущего ряда -> вставляем перед первым элементом этого ряда
        if (y < rowTop) {
            return row[0].element;
        }
        
        // Если мы внутри высоты этого ряда
        if (y >= rowTop && y <= rowBottom) {
            targetRow = row;
            break;
        }
    }

    // Если курсор ниже всех рядов -> вставляем в самый конец
    if (!targetRow) return null;

    // 3. Ищем нужную позицию по оси X внутри выбранного ряда
    for (const item of targetRow) {
        if (x < item.box.left + item.box.width / 2) {
            return item.element;
        }
    }

    // Если мы правее всех элементов в ряду, возвращаем элемент следующего ряда (если он есть)
    const targetRowIndex = rows.indexOf(targetRow);
    if (targetRowIndex < rows.length - 1) {
        return rows[targetRowIndex + 1][0].element;
    }

    return null;
}

const itemMap = new Map();
items.forEach(itemText => {
    const item = document.createElement("div");
    item.className = "dv-tieritem";
    item.draggable = true;
    item.dataset.item = itemText;
    item.innerText = itemText;

    item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", itemText);
        setTimeout(() => item.classList.add("dragging"), 0);
    });

    item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        if (placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
    });

    itemMap.set(itemText, item);
});

allGroups.forEach(cat => {
    const group = root.createDiv({ cls: "dv-tiergroup" });
    group.dataset.category = cat;
    
    const header = group.createDiv({ cls: "dv-tierheader" });
    header.innerText = cat;
    
    if (categoryColors[cat]) {
        header.style.backgroundColor = categoryColors[cat];
        header.style.color = "#000000"; 
    }
    
    const dropzone = group.createDiv({ cls: "dv-tierdropzone" });
    
    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("drag-over");

        const afterElement = getElementBeforeDrop(dropzone, e.clientX, e.clientY);
        
        if (afterElement == null) {
            dropzone.appendChild(placeholder);
        } else {
            dropzone.insertBefore(placeholder, afterElement);
        }
    });
    
    dropzone.addEventListener("dragleave", (e) => {
        if (!dropzone.contains(e.relatedTarget)) {
            dropzone.classList.remove("drag-over");
            if (placeholder.parentNode === dropzone) {
                dropzone.removeChild(placeholder);
            }
        }
    });
    
    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("drag-over");
        
        const draggingItem = root.querySelector('.dragging');
        if (draggingItem && placeholder.parentNode === dropzone) {
            dropzone.insertBefore(draggingItem, placeholder);
            dropzone.removeChild(placeholder);
        }
    });
});

// Наполнение сохраненного состояния
const placedItems = new Set();

allGroups.forEach(cat => {
    const dropzone = root.querySelector(`[data-category="${CSS.escape(cat)}"] .dv-tierdropzone`);
    if (savedState[cat] && Array.isArray(savedState[cat])) {
        savedState[cat].forEach(itemText => {
            if (itemMap.has(itemText) && !placedItems.has(itemText)) {
                dropzone.appendChild(itemMap.get(itemText));
                placedItems.add(itemText);
            }
        });
    }
});

const unassignedDropzone = root.querySelector(`[data-category="${CSS.escape(UNASSIGNED_LABEL)}"] .dv-tierdropzone`);
items.forEach(itemText => {
    if (!placedItems.has(itemText) && itemMap.has(itemText)) {
        unassignedDropzone.appendChild(itemMap.get(itemText));
    }
});

resetButton.addEventListener("click", async () => {
    // 1. Очищаем данные в YAML текущего файла Obsidian
    const activeFile = app.workspace.getActiveFile();
    if (activeFile) {
        await app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            delete frontmatter.tierlist;
        });
    }

    // 2. Перемещаем все элементы в категорию по умолчанию в интерфейсе
    items.forEach(itemText => {
        if (itemMap.has(itemText)) {
            unassignedDropzone.appendChild(itemMap.get(itemText));
        }
    });

    // 3. Сохраняем обновленный (пустой) порядок во Frontmatter
    saveCurrentLayout();
});

saveButton.addEventListener("click", async () => {
    saveCurrentLayout();
});
