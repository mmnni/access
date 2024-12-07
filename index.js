const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const env = {
    URL: process.env.URL || '',
    TIME: process.env.TIME || '120',
    UUID: process.env.UUID || '9afd1229-b893-40c1-84dd-51e7ce204913',
    NEZHA_SERVER: process.env.NEZHA_SERVER || 'nz.f4i.cn',
    NEZHA_PORT: process.env.NEZHA_PORT || '5555',
    NEZHA_KEY: process.env.NEZHA_KEY || 'vi6gv71EWtEgSPXkHy',
    ARGO_DOMAIN: process.env.ARGO_DOMAIN || '2go.askoo.dev',
    ARGO_AUTH: process.env.ARGO_AUTH || 'eyJhIjoiOGI5NzI0MDgwZTU1ZTcwMzcwZmI3NDI4NzkyMmYzMWIiLCJ0IjoiM2E3NzJlYWMtODE3MC00MzljLTk3NjQtNDQzOWQyMjM4NDY3IiwicyI6Ik9EaGpZbVV5TkRRdE9UQTBOUzAwTldNeUxXRXpaakF0WldFNE1ESmtNMlF6WWpnNCJ9',
    ARGO_PORT: process.env.ARGO_PORT || '8080',
    CFIP: process.env.CFIP || 'www.visa.com.tw',
    CFPORT: process.env.CFPORT || '443',
    NAME: process.env.NAME || 'Saclingo',
};

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
