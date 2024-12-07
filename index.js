const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const logFile = fs.openSync('app.log', 'a');
const binaryPath = path.join(__dirname, 'discord');
const child = execFile(binaryPath, [], {
    env: env,
    stdio: ['ignore', logFile, logFile]  
});

child.on('error', () => {});
child.on('exit', () => {
    fs.closeSync(logFile);
});
