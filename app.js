/**
 * NBT & Schematic Block Replacer - Main Application Controller
 */

(function () {
    let currentStructure = null;
    let replacementRules = [];
    let currentModFilter = 'all';
    let searchQuery = '';

    // Quick suggestions for mods
    const MOD_SUGGESTIONS = [
        { label: 'Demon Stone', id: 'bloodmagic:dungeon_stone' },
        { label: 'Hojas Raicielo', id: 'aether:skyroot_leaves' },
        { label: 'Madera Raicielo', id: 'aether:skyroot_log' },
        { label: 'Andesite Casing', id: 'create:andesite_casing' },
        { label: 'Brass Casing', id: 'create:brass_casing' },
        { label: 'Livingrock', id: 'botania:livingrock' }
    ];

    // DOM Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const dashboard = document.getElementById('dashboard');
    const demoBtn = document.getElementById('demo-btn');

    // Stats Elements
    const statBlocks = document.getElementById('stat-blocks');
    const statTypes = document.getElementById('stat-types');
    const statSize = document.getElementById('stat-size');
    const statFile = document.getElementById('stat-file');

    // Palette & Search Elements
    const searchInput = document.getElementById('search-input');
    const modChipsContainer = document.getElementById('mod-chips');
    const paletteList = document.getElementById('palette-list');
    const paletteCountBadge = document.getElementById('palette-count-badge');

    // Rules Elements
    const rulesContainer = document.getElementById('rules-container');
    const btnAddRule = document.getElementById('btn-add-rule');
    const summaryCount = document.getElementById('summary-count');
    const btnDownload = document.getElementById('btn-download');
    const toast = document.getElementById('toast');

    // Setup event listeners
    function init() {
        // Drag and drop
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
            if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                loadFile(e.target.files[0]);
            }
        });

        // Demo button
        if (demoBtn) {
            demoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                loadDemoStructure();
            });
        }

        // Search and filter
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderPalette();
        });

        // Add Rule
        btnAddRule.addEventListener('click', () => {
            addRule();
        });

        // Download
        btnDownload.addEventListener('click', () => {
            executeAndDownload();
        });
    }

    // Load file with NBTEngine
    async function loadFile(file) {
        try {
            showToast(`Cargando ${file.name}...`);
            currentStructure = await NBTEngine.loadFromFile(file);

            // Reset rules
            replacementRules = [];
            addRule(); // Add first default rule

            // Update UI
            updateStats();
            updateModChips();
            renderPalette();
            renderRules();
            updateSummary();

            dashboard.classList.add('active');
            dropzone.scrollIntoView({ behavior: 'smooth' });
            showToast(`¡Archivo cargado con éxito! ${currentStructure.palette.length} bloques encontrados.`);
        } catch (err) {
            console.error(err);
            alert("Error al leer el archivo: " + err.message);
        }
    }

    // Load Demo data if user doesn't have a file ready
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
        addRule("minecraft:oak_leaves", "aether:skyroot_leaves");

        updateStats();
        updateModChips();
        renderPalette();
        renderRules();
        updateSummary();

        dashboard.classList.add('active');
        showToast("Demostración cargada con éxito.");
    }

    // Update Top Metric Cards
    function updateStats() {
        if (!currentStructure) return;
        statBlocks.textContent = currentStructure.totalBlocks.toLocaleString();
        statTypes.textContent = currentStructure.palette.length.toString();
        statSize.textContent = `${currentStructure.size.x} × ${currentStructure.size.y} × ${currentStructure.size.z}`;
        statFile.textContent = currentStructure.filename;
        paletteCountBadge.textContent = `${currentStructure.palette.length} bloques`;
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
            chip.className = `mod-chip ${currentModFilter === mod ? 'active' : ''}`;
            chip.textContent = mod === 'all' ? 'Todos' : mod;
            chip.addEventListener('click', () => {
                currentModFilter = mod;
                updateModChips();
                renderPalette();
            });
            modChipsContainer.appendChild(chip);
        });
    }

    // Render Palette List
    function renderPalette() {
        if (!currentStructure) return;
        paletteList.innerHTML = '';

        // Filter palette
        const filtered = currentStructure.palette.filter(item => {
            const [mod, blockName] = item.name.includes(':') ? item.name.split(':') : ['minecraft', item.name];
            
            // Mod filter
            if (currentModFilter !== 'all' && mod !== currentModFilter) {
                return false;
            }

            // Search filter
            if (searchQuery) {
                const matchName = item.name.toLowerCase().includes(searchQuery);
                const matchProps = Object.entries(item.properties)
                    .some(([k, v]) => `${k}=${v}`.toLowerCase().includes(searchQuery));
                return matchName || matchProps;
            }

            return true;
        });

        // Sort by count descending
        filtered.sort((a, b) => b.count - a.count);

        if (filtered.length === 0) {
            paletteList.innerHTML = '<div class="empty-state">No se encontraron bloques con ese criterio.</div>';
            return;
        }

        filtered.forEach(item => {
            const [mod, blockName] = item.name.includes(':') ? item.name.split(':') : ['minecraft', item.name];
            const pct = currentStructure.totalBlocks > 0 
                ? ((item.count / currentStructure.totalBlocks) * 100).toFixed(1) 
                : '0';

            const card = document.createElement('div');
            card.className = 'palette-item';

            // Properties string
            let propsHtml = '';
            const propEntries = Object.entries(item.properties);
            if (propEntries.length > 0) {
                const propsText = propEntries.map(([k, v]) => `${k}=${v}`).join(', ');
                propsHtml = `<span class="block-props" title="${propsText}">${propsText}</span>`;
            }

            // Mod badge class
            let modClass = 'other';
            if (['minecraft', 'bloodmagic', 'aether', 'create'].includes(mod)) {
                modClass = mod;
            }

            card.innerHTML = `
                <div class="palette-item-info">
                    <div class="palette-item-header">
                        <span class="mod-badge ${modClass}">${mod}</span>
                        <span class="block-name">${blockName}</span>
                    </div>
                    <div class="block-fullname mono">${item.name}</div>
                    ${propsHtml}
                </div>
                <div class="palette-item-actions">
                    <div class="block-count-badge">
                        <div class="block-count-num">${item.count.toLocaleString()}</div>
                        <div class="block-count-pct">${pct}%</div>
                    </div>
                    <button class="btn-quick-replace" title="Configurar reemplazo para este bloque">
                        Reemplazar
                    </button>
                </div>
            `;

            // Quick replace click
            card.querySelector('.btn-quick-replace').addEventListener('click', () => {
                addRule(item.name);
            });

            paletteList.appendChild(card);
        });
    }

    // Rules Management
    function addRule(fromBlock = '', toBlock = '') {
        if (!currentStructure && !fromBlock) return;

        // Default 'from' if not provided
        if (!fromBlock && currentStructure && currentStructure.palette.length > 0) {
            fromBlock = currentStructure.palette[0].name;
        }

        const newRule = {
            id: Date.now() + Math.random(),
            from: fromBlock,
            to: toBlock,
            keepProps: true
        };

        replacementRules.push(newRule);
        renderRules();
        updateSummary();
    }

    function removeRule(ruleId) {
        replacementRules = replacementRules.filter(r => r.id !== ruleId);
        if (replacementRules.length === 0) {
            addRule();
        } else {
            renderRules();
            updateSummary();
        }
    }

    // Render Rules List
    function renderRules() {
        rulesContainer.innerHTML = '';

        // Get unique block names for dropdown
        const uniqueBlocks = Array.from(new Set(currentStructure ? currentStructure.palette.map(p => p.name) : []));

        replacementRules.forEach((rule, idx) => {
            const card = document.createElement('div');
            card.className = 'rule-card';

            const optionsHtml = uniqueBlocks.map(b => 
                `<option value="${b}" ${b === rule.from ? 'selected' : ''}>${b}</option>`
            ).join('');

            card.innerHTML = `
                <div class="rule-card-header">
                    <span class="rule-index">Regla #${idx + 1}</span>
                    <button class="btn-remove-rule" title="Eliminar regla">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="rule-inputs-row">
                    <div class="input-group">
                        <label>Bloque Original</label>
                        <select class="rule-select from-select">
                            ${optionsHtml}
                        </select>
                    </div>
                    <div class="rule-arrow">→</div>
                    <div class="input-group">
                        <label>Bloque Nuevo (ID de mod)</label>
                        <input type="text" class="rule-input to-input" placeholder="ej. bloodmagic:dungeon_stone" value="${rule.to}">
                        <div class="quick-mod-suggestions">
                            ${MOD_SUGGESTIONS.map(s => `<span class="mod-suggestion-chip" data-id="${s.id}">${s.label}</span>`).join('')}
                        </div>
                    </div>
                </div>
                <div class="rule-options-row">
                    <label class="checkbox-label">
                        <input type="checkbox" class="keep-props-chk" ${rule.keepProps ? 'checked' : ''}>
                        <span>Conservar propiedades (facing, waterlogged, etc.)</span>
                    </label>
                </div>
            `;

            // Event bindings
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

            // Suggestions
            card.querySelectorAll('.mod-suggestion-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const chosenId = chip.getAttribute('data-id');
                    toInput.value = chosenId;
                    rule.to = chosenId;
                    updateSummary();
                });
            });

            card.querySelector('.btn-remove-rule').addEventListener('click', () => {
                removeRule(rule.id);
            });

            rulesContainer.appendChild(card);
        });
    }

    // Update Summary of replacements
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

        summaryCount.textContent = `${count.toLocaleString()} bloques`;
        btnDownload.disabled = validRules.length === 0;
    }

    // Execute Replacements & Download file
    async function executeAndDownload() {
        const validRules = replacementRules.filter(r => r.from && r.to.trim());
        if (validRules.length === 0) {
            alert("Agrega al menos una regla de reemplazo válida.");
            return;
        }

        try {
            btnDownload.textContent = "Procesando...";
            btnDownload.disabled = true;

            const result = currentStructure.applyReplacements(validRules);
            const gzippedData = await currentStructure.exportGzipped();

            // Create download
            const blob = new Blob([gzippedData], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');

            // Name generation
            const baseName = currentStructure.filename.replace(/\.(nbt|schem|schematic)$/i, '');
            const ext = currentStructure.format === 'sponge_schem' ? '.schem' : '.nbt';
            a.href = url;
            a.download = `${baseName}_modified${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showToast(`¡Listo! Se reemplazaron ${result.totalReplacedBlocks.toLocaleString()} bloques.`);
            
            // Refresh views
            renderPalette();
            renderRules();
            updateSummary();
        } catch (err) {
            console.error(err);
            alert("Error al guardar la estructura: " + err.message);
        } finally {
            btnDownload.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Aplicar y Descargar Estructura
            `;
            btnDownload.disabled = false;
        }
    }

    // Toast helper
    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    }

    // Initialize on load
    document.addEventListener('DOMContentLoaded', init);
})();
