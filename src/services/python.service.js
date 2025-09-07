const { spawn } = require('child_process');
const path = require('path');

async function executeScript(scriptName, args = []) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'python', scriptName);
        const scriptDir = path.dirname(scriptPath);

        const py = spawn('python', ['-u', scriptPath, ...args], {
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
            cwd: scriptDir,                 // <- Ejecutar en la carpeta del script
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        py.stdout.on('data', chunk => stdout += chunk.toString('utf8'));
        py.stderr.on('data', chunk => stderr += chunk.toString('utf8'));

        py.on('error', err => reject(err));
        py.on('close', code => {
            if (code !== 0) return reject(new Error(`El script de Python finalizó con código ${code}.\n${stderr}`));
            resolve(stdout.trim());
        });
    });
}

module.exports = { executeScript };