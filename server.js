const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const ROOT_DIR = path.resolve(__dirname);

// Carga automática de variables de entorno desde archivo .env local si existe (ignorado por git)
const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
    try {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        for (const line of envContent.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const match = trimmed.match(/^([\w.-]+)\s*=\s*(.*)?$/);
            if (match) {
                const key = match[1];
                let value = (match[2] || '').trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
        }
    } catch (e) {
        console.warn('[Env] No se pudo leer el archivo .env:', e.message);
    }
}

const PORT = process.env.PORT || 3000;

// SEGURIDAD: El token NUNCA se almacena en el código fuente. Se lee exclusivamente de variables de entorno o de .env
const DEPLOY_TOKEN = process.env.DEPLOY_TOKEN;

if (!DEPLOY_TOKEN) {
    console.warn('\n[SEGURIDAD]: No se ha configurado la variable de entorno DEPLOY_TOKEN.');
    console.warn('[SEGURIDAD]: El endpoint /api/deploy estará DESHABILITADO hasta que configures DEPLOY_TOKEN en tu archivo .env o en el sistema.\n');
}

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.nbt': 'application/octet-stream',
    '.schem': 'application/octet-stream',
    '.schematic': 'application/octet-stream'
};

function handleDeploy(req, res) {
    // Solo permitir solicitudes POST para Webhooks
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Method Not Allowed. Los webhooks requieren método POST.' }));
    }

    if (!DEPLOY_TOKEN) {
        console.warn(`[Deploy Bloqueado] Intento de deploy desde ${req.socket.remoteAddress} pero DEPLOY_TOKEN no está configurado en el servidor.`);
        res.writeHead(503, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Servicio de deploy deshabilitado: DEPLOY_TOKEN no configurado en el servidor.' }));
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const token = url.searchParams.get('token') || req.headers['x-deploy-token'];

    if (!token || token !== DEPLOY_TOKEN) {
        console.warn(`[Deploy] Acceso no autorizado (token inválido) desde ${req.socket.remoteAddress}`);
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Unauthorized: Token de despliegue inválido o ausente.' }));
    }

    console.log(`[Deploy] Ejecutando despliegue automático (git fetch origin main && git reset --hard origin/main)...`);
    exec('git fetch origin main && git reset --hard origin/main', { cwd: ROOT_DIR }, (err, stdout, stderr) => {
        if (err) {
            console.error('[Deploy Error]:', stderr || err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: false,
                error: stderr || err.message,
                timestamp: new Date().toISOString()
            }));
        }

        console.log('[Deploy Éxito]:\n', stdout);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: 'Despliegue automático completado con éxito',
            output: stdout.trim(),
            timestamp: new Date().toISOString()
        }));
    });
}

const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // Endpoint de auto-despliegue
    if (pathname === '/api/deploy') {
        return handleDeploy(req, res);
    }

    // Health check
    if (pathname === '/api/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            status: 'online',
            service: 'schematics.datsec.dev',
            timestamp: new Date().toISOString()
        }));
    }

    // Servir archivos estáticos con protección estricta contra Directory Traversal
    let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
    if (safePath === '/' || safePath === '\\') {
        safePath = 'index.html';
    }

    let filePath = path.join(ROOT_DIR, safePath);

    // Validación de seguridad: el archivo debe estar estrictamente dentro de ROOT_DIR
    const relative = path.relative(ROOT_DIR, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('403 Forbidden: Directory traversal blocked');
    }

    // SEGURIDAD CRÍTICA: Bloquear terminantemente el acceso a archivos ocultos (.env, .git, etc.) y código del servidor
    const pathParts = relative.split(path.sep);
    const fileName = path.basename(filePath);
    const isSensitive = pathParts.some(part => part.startsWith('.')) ||
                        ['server.js', 'package.json', 'package-lock.json'].includes(fileName);

    if (isSensitive) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('403 Forbidden: Access to sensitive or private files is denied');
    }

    // Si es un directorio, servir index.html dentro de él
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 Not Found');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': stats.size,
            'Cache-Control': 'public, max-age=60'
        });

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] NBT Replacer & Auto-Deploy escuchando en el puerto ${PORT}`);
});
