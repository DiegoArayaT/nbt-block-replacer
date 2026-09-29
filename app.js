/**
 * NBT & Schematic Block Replacer - Controller
 * Follows Style.md Industrial Minimalist Design System
 */

(function () {
    let currentStructure = null;
    let replacementRules = [];
    let currentModFilter = 'all';
    let searchQuery = '';

    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const btnBrowse = document.getElementById('btn-browse');
    const dashboard = document.getElementById('dashboard');
    const demoBtn = document.getElementById('demo-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');

    // Stats Elements
    const statBlocks = document.getElementById('stat-blocks');
    const statTypes = document.getElementById('stat-types');
    const statSize = document.getElementById('stat-size');
    const statFile = document.getElementById('stat-file');

    // Palette & Search Elements
    const searchInput = document.getElementById('search-input');
    const modChipsContainer = document.getElementById('mod-chips');
    const paletteTbody = document.getElementById('palette-tbody');
    const paletteCountBadge = document.getElementById('palette-count-badge');

    // Rules Elements
    const rulesContainer = document.getElementById('rules-container');
    const btnAddRule = document.getElementById('btn-add-rule');
    const summaryCount = document.getElementById('summary-count');
    const btnDownload = document.getElementById('btn-download');
    const toast = document.getElementById('toast');

    // Initialize application
    function init() {
        initTheme();

        btnBrowse.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.click();
        });

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                loadFile(e.dataTransfer.files[0]);
            }
        });

        dropzone.addEventListener('click', (e) => {
            if (e.target !== btnBrowse && !e.target.closest('#demo-btn')) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                loadFile(e.target.files[0]);
            }
        });

        if (demoBtn) {
            demoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                loadDemoStructure();
            });
        }

        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderPalette();
        });

        btnAddRule.addEventListener('click', () => {
            addRule();
        });

        btnDownload.addEventListener('click', () => {
            executeAndDownload();
        });
    }

    // Theme toggle
    function initTheme() {
        const savedTheme = localStorage.getItem('mc_theme') || 'dark';
        setTheme(savedTheme);

        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        themeToggleBtn.textContent = `THEME: ${theme.toUpperCase()}`;
        localStorage.setItem('mc_theme', theme);
    }

    // Load file with NBTEngine
    async function loadFile(file) {
        try {
            showToast(`CARGANDO ${file.name.toUpperCase()}...`);
            currentStructure = await NBTEngine.loadFromFile(file);

            // Iniciar sin reglas iniciales (deja que el usuario elija qué reemplazar)
            replacementRules = [];

            updateStats();
            updateModChips();
            renderPalette();
            renderRules();
            updateSummary();

            dashboard.classList.add('active');
            dropzone.scrollIntoView({ behavior: 'smooth' });
            showToast(`CARGA EXITOSA: ${currentStructure.palette.length} TIPOS DE BLOQUES`);
        } catch (err) {
            console.error(err);
            alert("Error al leer el archivo: " + err.message);
        }
    }

    // Load Demo data
    function loadDemoStructure() {
        const dummyNbt = {
            name: "",
            type: 10,
            value: {
                size: { type: 9, value: [{ type: 3, value: 32 }, { type: 3, value: 48 }, { type: 3, value: 32 }] },
                palette: {
                    type: 9,
                    value: [
                        { type: 10, value: { Name: { type: 8, value: "minecraft:oak_leaves" }, Properties: { type: 10, value: { distance: { type: 8, value: "1" }, persistent: { type: 8, value: "true" } } } } },
                        { type: 10, value: { Name: { type: 8, value: "minecraft:stone" } } },
                        { type: 10, value: { Name: { type: 8, value: "minecraft:cobblestone" } } },
                        { type: 10, value: { Name: { type: 8, value: "minecraft:oak_planks" } } },
                        { type: 10, value: { Name: { type: 8, value: "minecraft:stone_bricks" } } },
                        { type: 10, value: { Name: { type: 8, value: "create:cut_calcite" } } },
                        { type: 10, value: { Name: { type: 8, value: "bloodmagic:dungeon_stone" } } }
                    ]
                },
                blocks: {
                    type: 9,
                    value: Array(548).fill(null).map(() => ({ type: 10, value: { state: { type: 3, value: 0 } } }))
                        .concat(Array(320).fill(null).map(() => ({ type: 10, value: { state: { type: 3, value: 1 } } })))
                        .concat(Array(180).fill(null).map(() => ({ type: 10, value: { state: { type: 3, value: 2 } } })))
                        .concat(Array(420).fill(null).map(() => ({ type: 10, value: { state: { type: 3, value: 3 } } })))
                        .concat(Array(150).fill(null).map(() => ({ type: 10, value: { state: { type: 3, value: 4 } } })))
                        .concat(Array(187).fill(null).map(() => ({ type: 10, value: { state: { type: 3, value: 5 } } })))
                        .concat(Array(80).fill(null).map(() => ({ type: 10, value: { state: { type: 3, value: 6 } } })))
                }
            }
        };

        currentStructure = new NBTEngine.StructureFile(dummyNbt, "torre_demo.nbt");
        replacementRules = [];

        updateStats();
        updateModChips();
        renderPalette();
        renderRules();
        updateSummary();

        dashboard.classList.add('active');
        showToast("DEMOSTRACIÓN INDUSTRIAL CARGADA");
    }

    // Update Stats
    function updateStats() {
        if (!currentStructure) return;
        statBlocks.textContent = currentStructure.totalBlocks.toLocaleString();
        statTypes.textContent = currentStructure.palette.length.toString();
        statSize.textContent = `${currentStructure.size.x} × ${currentStructure.size.y} × ${currentStructure.size.z}`;
        statFile.textContent = currentStructure.filename.toUpperCase();
        paletteCountBadge.textContent = `${currentStructure.palette.length} BLOQUES`;
    }

    // Generate Mod Filter Chips
    function updateModChips() {
        if (!currentStructure) return;
        const mods = new Set(['all']);
        for (const item of currentStructure.palette) {
            const parts = item.name.split(':');
            if (parts.length > 1) {
                mods.add(parts[0]);
            } else {
                mods.add('minecraft');
            }
        }

        modChipsContainer.innerHTML = '';
        mods.forEach(mod => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = `mod-chip ${currentModFilter === mod ? 'active' : ''}`;
            chip.textContent = mod === 'all' ? 'TODOS' : mod.toUpperCase();
            chip.addEventListener('click', () => {
                currentModFilter = mod;
                updateModChips();
                renderPalette();
            });
            modChipsContainer.appendChild(chip);
        });
    }

    // Render Palette in Semantic HTML Table
    function renderPalette() {
        if (!currentStructure) return;
        paletteTbody.innerHTML = '';

        const filtered = currentStructure.palette.filter(item => {
            const [mod, blockName] = item.name.includes(':') ? item.name.split(':') : ['minecraft', item.name];
            
            if (currentModFilter !== 'all' && mod !== currentModFilter) {
                return false;
            }

            if (searchQuery) {
                const matchName = item.name.toLowerCase().includes(searchQuery);
                const matchProps = Object.entries(item.properties)
                    .some(([k, v]) => `${k}=${v}`.toLowerCase().includes(searchQuery));
                return matchName || matchProps;
            }

            return true;
        });

        filtered.sort((a, b) => b.count - a.count);

        if (filtered.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5" class="empty-state">NO SE ENCONTRARON BLOQUES CON EL CRITERIO ESPECIFICADO.</td>`;
            paletteTbody.appendChild(tr);
            return;
        }

        filtered.forEach(item => {
            const [mod, blockName] = item.name.includes(':') ? item.name.split(':') : ['minecraft', item.name];
            const pct = currentStructure.totalBlocks > 0 
                ? ((item.count / currentStructure.totalBlocks) * 100).toFixed(1) 
                : '0';

            const propEntries = Object.entries(item.properties);
            const propsText = propEntries.length > 0 
                ? propEntries.map(([k, v]) => `${k}=${v}`).join(', ') 
                : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="col-mod">
                    <span class="mod-tag">${mod}</span>
                </td>
                <td class="col-block">
                    <div class="block-name-primary">${blockName}</div>
                    <div class="block-name-full">${item.name}</div>
                </td>
                <td class="col-props">
                    ${propsText ? `<span class="props-code" title="${propsText}">${propsText}</span>` : `<span style="color:var(--text-faint)">—</span>`}
                </td>
                <td class="col-count">
                    <div class="count-num">${item.count.toLocaleString()}</div>
                    <div class="count-pct">${pct}%</div>
                </td>
                <td class="col-action">
                    <button type="button" class="btn-table-replace" data-block="${item.name}">
                        REEMPLAZAR
                    </button>
                </td>
            `;

            tr.querySelector('.btn-table-replace').addEventListener('click', () => {
                handleTableReplaceClick(item.name);
            });

            paletteTbody.appendChild(tr);
        });
    }

    // User clicked "REEMPLAZAR" on a table row
    function handleTableReplaceClick(blockName) {
        // Check if rule already exists for this block
        const existingRule = replacementRules.find(r => r.from === blockName);
        if (existingRule) {
            renderRules();
            focusRuleInput(existingRule.id);
            return;
        }

        // Create new rule for this block
        const newId = Date.now() + Math.random();
        replacementRules.push({
            id: newId,
            from: blockName,
            to: '',
            keepProps: true
        });

        renderRules();
        updateSummary();
        focusRuleInput(newId);
    }

    function focusRuleInput(ruleId) {
        setTimeout(() => {
            const card = document.querySelector(`[data-rule-id="${ruleId}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                const input = card.querySelector('.to-input');
                if (input) input.focus();
            }
        }, 50);
    }

    // Add generic rule
    function addRule(fromBlock = '', toBlock = '') {
        if (!currentStructure && !fromBlock) return;

        if (!fromBlock && currentStructure && currentStructure.palette.length > 0) {
            fromBlock = currentStructure.palette[0].name;
        }

        const newId = Date.now() + Math.random();
        replacementRules.push({
            id: newId,
            from: fromBlock,
            to: toBlock,
            keepProps: true
        });

        renderRules();
        updateSummary();
        focusRuleInput(newId);
    }

    function removeRule(ruleId) {
        replacementRules = replacementRules.filter(r => r.id !== ruleId);
        renderRules();
        updateSummary();
    }

    // Render Rules (without suggested chips, with clean empty state)
    function renderRules() {
        rulesContainer.innerHTML = '';

        if (replacementRules.length === 0) {
            rulesContainer.innerHTML = `
                <div class="empty-rules-box">
                    <div class="empty-rules-title">NO HAY REGLAS ACTIVAS</div>
                    <div class="empty-rules-sub">Haz clic en <strong>REEMPLAZAR</strong> en cualquier bloque de la tabla superior para agregarlo aquí, o pulsa el botón de abajo para agregar una regla manual.</div>
                </div>
            `;
            return;
        }

        const uniqueBlocks = Array.from(new Set(currentStructure ? currentStructure.palette.map(p => p.name) : []));

        replacementRules.forEach((rule, idx) => {
            const card = document.createElement('div');
            card.className = 'rule-card';
            card.setAttribute('data-rule-id', rule.id);

            const optionsHtml = uniqueBlocks.map(b => 
                `<option value="${b}" ${b === rule.from ? 'selected' : ''}>${b}</option>`
            ).join('');

            card.innerHTML = `
                <div class="rule-card-header">
                    <span class="rule-index">REGLA // ${String(idx + 1).padStart(2, '0')}</span>
                    <button type="button" class="btn-remove-rule" title="Eliminar regla">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div class="rule-fields">
                    <div class="field-group">
                        <label class="input-label">BLOQUE A REEMPLAZAR</label>
                        <select class="rule-select from-select">
                            ${optionsHtml}
                        </select>
                    </div>

                    <div class="field-group">
                        <label class="input-label">REEMPLAZAR POR (ID DEL MOD)</label>
                        <input type="text" class="rule-input to-input" placeholder="ej. bloodmagic:dungeon_stone o aether:skyroot_leaves" value="${rule.to}">
                    </div>

                    <div class="rule-options-row">
                        <label class="checkbox-label">
                            <input type="checkbox" class="keep-props-chk" ${rule.keepProps ? 'checked' : ''}>
                            <span>CONSERVAR PROPIEDADES DE ESTADO (FACING, WATERLOGGED, DISTANCE, ETC.)</span>
                        </label>
                    </div>
                </div>
            `;

            const fromSelect = card.querySelector('.from-select');
            fromSelect.addEventListener('change', (e) => {
                rule.from = e.target.value;
                updateSummary();
            });

            const toInput = card.querySelector('.to-input');
            toInput.addEventListener('input', (e) => {
                rule.to = e.target.value;
                updateSummary();
            });

            const keepPropsChk = card.querySelector('.keep-props-chk');
            keepPropsChk.addEventListener('change', (e) => {
                rule.keepProps = e.target.checked;
            });

            card.querySelector('.btn-remove-rule').addEventListener('click', () => {
                removeRule(rule.id);
            });

            rulesContainer.appendChild(card);
        });
    }

    // Update Summary
    function updateSummary() {
        if (!currentStructure) return;
        let count = 0;
        const validRules = replacementRules.filter(r => r.from && r.to.trim());

        for (const rule of validRules) {
            for (const item of currentStructure.palette) {
                if (item.name === rule.from) {
                    count += item.count;
                }
            }
        }

        summaryCount.textContent = `${count.toLocaleString()} BLOQUES`;
        btnDownload.disabled = validRules.length === 0;
    }

    // Execute Replacements & Download
    async function executeAndDownload() {
        const validRules = replacementRules.filter(r => r.from && r.to.trim());
        if (validRules.length === 0) {
            alert("Define al menos una regla con bloque de origen y destino válido.");
            return;
        }

        try {
            btnDownload.textContent = "PROCESANDO...";
            btnDownload.disabled = true;

            const result = currentStructure.applyReplacements(validRules);
            const gzippedData = await currentStructure.exportGzipped();

            const blob = new Blob([gzippedData], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');

            const baseName = currentStructure.filename.replace(/\.(nbt|schem|schematic)$/i, '');
            const ext = currentStructure.format === 'sponge_schem' ? '.schem' : '.nbt';
            a.href = url;
            a.download = `${baseName}_modified${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(`OPERACIÓN COMPLETADA: ${result.totalReplacedBlocks.toLocaleString()} BLOQUES REEMPLAZADOS`);
            
            renderPalette();
            renderRules();
            updateSummary();
        } catch (err) {
            console.error(err);
            alert("Error al exportar la estructura: " + err.message);
        } finally {
            btnDownload.textContent = "APLICAR Y DESCARGAR ESTRUCTURA";
            btnDownload.disabled = false;
        }
    }

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
