const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4000;

const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);
    
    // Si la ruta termina en /admin o /admin/, servir admin/index.html
    if (urlPath === '/admin' || urlPath === '/admin/') {
        filePath = path.join(__dirname, 'admin', 'index.html');
    }
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
        let custom404Path = path.join(__dirname, '404.html');
        if (fs.existsSync(custom404Path)) {
            filePath = custom404Path;
            res.statusCode = 404;
        } else {
            res.statusCode = 404;
            res.end('Not found: ' + filePath);
            return;
        }
    }

    let extname = path.extname(filePath);
    let contentType = 'text/html';
    switch (extname) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;      
        case '.jpg': contentType = 'image/jpg'; break;
        case '.svg': contentType = 'image/svg+xml'; break;
    }

    let content = fs.readFileSync(filePath);

    // Mini-compilador Jekyll on-the-fly para HTML
    if (extname === '.html' || extname === '') {
        let contentStr = content.toString('utf8');
        
        // Remover Frontmatter (--- ... ---)
        contentStr = contentStr.replace(/^---\n[\s\S]*?\n---\n/, '');
        
        // Remover etiquetas SEO de Jekyll
        contentStr = contentStr.replace(/{%\s*seo\s*%}/g, '');
        
        // Reemplazar {% include file.html %}
        contentStr = contentStr.replace(/{%\s*include\s+(.*?)\s*%}/g, (match, p1) => {
            const incPath = path.join(__dirname, '_includes', p1.trim());
            return fs.existsSync(incPath) ? fs.readFileSync(incPath, 'utf8') : '';
        });

        // Reemplazar {{ '/ruta' | relative_url }}
        contentStr = contentStr.replace(/\{\{\s*'(.*?)'\s*\|\s*relative_url\s*\}\}/g, '$1');

        // Aplicar layout: default
        let layoutPath = path.join(__dirname, '_layouts', 'default.html');
        if (fs.existsSync(layoutPath)) {
            let layoutStr = fs.readFileSync(layoutPath, 'utf8');
            layoutStr = layoutStr.replace('{{ content }}', contentStr);
            
            // Procesar includes y urls del layout
            layoutStr = layoutStr.replace(/{%\s*include\s+(.*?)\s*%}/g, (match, p1) => {
                const incPath = path.join(__dirname, '_includes', p1.trim());
                return fs.existsSync(incPath) ? fs.readFileSync(incPath, 'utf8') : '';
            });
            layoutStr = layoutStr.replace(/\{\{\s*'(.*?)'\s*\|\s*relative_url\s*\}\}/g, '$1');
            
            contentStr = layoutStr;
        }
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(contentStr, 'utf-8');
    } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    }
});

server.listen(PORT, () => {
    console.log(`\n✅ Servidor local (Simulador Jekyll) corriendo en:`);
    console.log(`➡️  http://localhost:${PORT}`);
    console.log(`\nPresiona Ctrl+C para detenerlo.\n`);
});
