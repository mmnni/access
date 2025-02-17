const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const schedule = require('node-schedule');
const app = express();
const PORT = process.env.PORT || 3000;

// initialization SQLite database
const db = new sqlite3.Database('./urls.db', (err) => {
  if (err) {
    console.error('cannot connect database:', err.message);
  } else {
    console.log('Already connect SQLite database');
    db.run(`CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE,
      fail_count INTEGER DEFAULT 0,
      consecutive_fail_count INTEGER DEFAULT 0
    )`);
  }
});

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), 
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`; 
    })
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'info',
      maxsize: 1024 * 1024 * 50, // 50MB
      maxFiles: 1, 
      tailable: true,
    }),
  ],
});


// delete log every day
schedule.scheduleJob('0 0 * * *', () => {  // every day
  const cutoffTime = Date.now() - 1 * 24 * 60 * 60 * 1000; 
  fs.readdir(logDir, (err, files) => {
    if (err) {
      logger.error('cannot get log dir:', err.message);
      return;
    }
    files.forEach((file) => {
      const filePath = path.join(logDir, file);
      fs.stat(filePath, (err, stats) => {
        if (err) {
          logger.error('cannot get log file:', err.message);
          return;
        }
        if (stats.mtimeMs < cutoffTime) {
          fs.unlink(filePath, (err) => {
            if (err) {
              logger.error('cannot delete log file:', err.message);
            } else {
              logger.info(`delete out date log file: ${file}`);
            }
          });
        }
      });
    });
  });
});

app.use(express.json());

app.get("/", function(req, res) {
  res.send("Hello world!");
});

// get all URL
app.get('/admin/urls', (req, res) => {
  db.all('SELECT url FROM urls WHERE fail_count < 50', (err, rows) => {
    if (err) {
      logger.error('cannot URL list:', err.message);
      return res.status(500).json({ error: 'cannot URL list', message: err.message });
    }
    const urls = rows.map(row => `"${row.url}"`).join(',\n');
    res.set('Content-Type', 'text/plain');
    res.send(urls);
  });
});

// check log file
app.get('/admin/logs', (req, res) => {
  const logFilePath = path.join(logDir, 'access.log');

  // check log file exists
  if (!fs.existsSync(logFilePath)) {
    return res.status(404).json({ error: 'log file not found' });
  }

  // read log file
  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      logger.error('cannot read log file:', err.message);
      return res.status(500).json({ error: 'cannot read log file', message: err.message });
    }

    const logs = data
      .split('\n')
      .filter(line => line.trim() !== '');

    if (logs.length === 0) {
      return res.status(200).json({ message: 'log file is empty' });
    }

    res.set('Content-Type', 'text/plain');
    res.send(logs.join('\n'));
  });
});

// add URL
app.post('/add-url', (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL cannot empty' });
  }

  db.get('SELECT url FROM urls WHERE url = ?', [url], (err, row) => {
    if (err) {
      logger.error('database search faild:', err.message);
      return res.status(500).json({ error: 'database search faild', message: err.message });
    }
    if (row) {
      return res.status(200).json({ message: 'URL already exists，no need add it again' });
    }

    db.run('INSERT INTO urls (url) VALUES (?)', [url], function (err) {
      if (err) {
        logger.error('cannot add URL:', err.message);
        return res.status(500).json({ error: 'cannot add URL', message: err.message });
      }
      res.status(200).json({ message: 'URL add successfully', id: this.lastID });
    });
  });
});

// delete URL
app.delete('/delete-url', (req, res) => {
  const { id, url } = req.body;

  if (!id && !url) {
    return res.status(400).json({ error: 'need id or url' });
  }

  let query;
  let params;
  if (id) {
    query = 'DELETE FROM urls WHERE id = ?';
    params = [id];
  } else {
    query = 'DELETE FROM urls WHERE url = ?';
    params = [url];
  }

  db.run(query, params, function (err) {
    if (err) {
      logger.error('cannot delete the URL:', err.message);
      return res.status(500).json({ error: 'cannot delete the URL', message: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: 'cannot find the URL' });
    }
    res.status(200).json({ message: 'URL delelte successfully' });
  });
});

// get UTC+8 time
function getUTCTime() {
  return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

// access URL
async function accessUrl(url) {
  try {
    const response = await axios.get(url, {
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      timeout: 10000
    });

    logger.info(`access successfully: ${url} | status-code: ${response.status}`);

    return { success: true, status: response.status };
  } catch (error) {
    logger.error(`access error: ${url} | error: ${error.response ? error.response.status : 'access faild'}`);

    return { success: false, status: error.response ? error.response.status : 'access faild' };
  }
}


// max URL numbers
const MAX_CONCURRENT_REQUESTS = 100;
const BATCH_SIZE = 1000;

const processBatch = async (batch) => {
  const promises = batch.map((row) => {
    const { id, url, consecutive_fail_count } = row;
    return accessUrl(url).then((result) => {
      if (result.success) {
        db.run('UPDATE urls SET consecutive_fail_count = 0 WHERE id = ?', [id]);
      } else {
        db.run('UPDATE urls SET consecutive_fail_count = consecutive_fail_count + 1 WHERE id = ?', [id], function (err) {
          if (err) {
            logger.error('cannot update count:', err.message);
          } else if (consecutive_fail_count + 1 >= 50) {
            db.run('DELETE FROM urls WHERE id = ?', [id], function (err) {
              if (err) {
                logger.error('cannot delete URL:', err.message);
              } else {
                logger.info(`URL delete successfully: ${url} [${getUTCTime()}]`);
              }
            });
          }
        });
      }
    });
  });

  await Promise.allSettled(promises.slice(0, MAX_CONCURRENT_REQUESTS));
};

setInterval(async () => {
  logger.info('start access URL...');
  db.all('SELECT id, url, consecutive_fail_count FROM urls WHERE consecutive_fail_count < 50', async (err, rows) => {
    if (err) {
      logger.error('cannot get URL list:', err.message);
      return;
    }

    // split the URL
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await processBatch(batch);
    }
  });
}, 2 * 60 * 1000); 

// start server
app.listen(PORT, () => {
  console.log(`sesrver is running: http://localhost:${PORT}`);
});
