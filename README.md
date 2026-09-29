# 🧱 Minecraft NBT & Schematic Block Replacer

Una aplicación web moderna, ultraligera y elegante para inspeccionar y reemplazar bloques en estructuras de Minecraft (`.nbt`) y schematics (`.schem` / WorldEdit / Create) con bloques de cualquier mod (ej. *Blood Magic*, *The Aether*, *Create*, *Botania*).

---

## ✨ Características

- 🚀 **100% Client-Side y Privado:** No requiere servidores ni sube tus archivos a internet. Todo el procesamiento de compresión GZIP y análisis binario NBT ocurre directamente en tu navegador.
- 🎨 **Interfaz Moderna Dark Mode:** Estilo obsidian con glassmorphism, microanimaciones y paleta con contrastes inspirados en Minecraft.
- 🔍 **Explorador de Paleta Interactivo:**
  - Filtro instantáneo por texto o propiedades de bloque (`facing=north`, `waterlogged=false`, etc.).
  - Filtros rápidos por mods detectados (`minecraft`, `create`, `aether`, `bloodmagic`, etc.).
  - Métrica de porcentaje y conteo exacto de bloques en la estructura.
- 🔄 **Generador de Reglas de Reemplazo Múltiples:**
  - Sustituye múltiples bloques al mismo tiempo.
  - Atajos rápidos con sugerencias de mods populares.
  - Opción para conservar propiedades de orientación y estado (`facing`, `distance`, etc.).
- 💾 **Descarga Directa:** Genera el archivo `.nbt` o `.schem` modificado listo para cargar en tu servidor o mundo.

---

## 🚀 Cómo Usar

### Opción 1: Abrir directamente (Sin instalar nada)
Simplemente haz doble clic en `index.html` para abrirlo en cualquier navegador moderno (Google Chrome, Edge, Brave, Firefox, etc.).

### Opción 2: Con servidor local (Vite / Live Server / Python)
Si prefieres servirlo localmente:
```bash
# Con Python
python -m http.server 3000

# O con npx
npx serve .
```
Abre en tu navegador `http://localhost:3000`.

### Opción 3: Desplegar en GitHub Pages
1. Sube esta carpeta a tu repositorio en GitHub.
2. Ve a **Settings** $\rightarrow$ **Pages** en tu repositorio.
3. En *Branch*, selecciona `main` y la carpeta `/ (root)`.
4. ¡Tu editor estará disponible públicamente en `https://tu-usuario.github.io/tu-repo/`!

---

## 🛠️ Tecnologías

- **Vanilla HTML5, CSS3 & JavaScript (ES6+):** Cero dependencias pesadas, arranque instantáneo.
- **Web Streams API:** `DecompressionStream` y `CompressionStream` nativos para descompresión/compresión GZIP rápida.
- **Motor NBT Puro (`nbt.js`):** Decodificador y serializador de etiquetas NBT completas (Compound, List, String, Int, Long/BigInt, Arrays, etc.).

---

## 📄 Licencia

MIT License. Creado para constructores, modders y creadores de modpacks de Minecraft.
