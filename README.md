## How to make NodeJS run faster

1. Set NODE_ENV=production
2. Enable Gzip Compression

```js
// $ npm i compression
const compression = require("compression");
const express = require("express");
const app = express();
app.use(compression());
```

3. Always use async functions

```js
async function foo() {
	try {
		const baz = await bar();
		return baz;
	} catch (err) {
		stLogger.error("Function 'bar' threw an exception.", err);
	}
}
```

catch-all error middleware

```js
function errorHandler(err, req, res, next) {
	stLogger.error("Catch-All error handler.", err);
	res.status(err.status || 500).send(err.message);
}

router.use(errorHandler);
module.exports = router;
```

error listeners

```js
process.on("uncaughtException", err => {
	stLogger.error("Uncaught exception", err);
	throw err;
});

process.on("unhandledRejection", err => {
	stLogger.error("unhandled rejection", err);
});
```

## Linting

-   Max line length of 100 characters
-   Aim for ~100 lines of code per file

## Restarting NodeJS Server

1. Create `/lib/systemd/system/fooapp.service`
2. Reload your daemon and start the script

```sh
systemctl daemon-reload
systemctl start fooapp
systemctl enable fooapp
systemctl status fooapp
```

```sh
npm i -g pm2
pm2 start server.js -i max
```

`-i max` starts app in cluster-mode. Spawns as many workers as there are CPUs on the server

## Using Nginx as a reverse proxy and load balancer

-   Never expose Nodejs app on port 80 or 443

```sh
apt update
apt install nginx
```

```sh
systemctl status nginx
​
[Output]
nginx.service - A high performance web server and a reverse proxy server
  Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)
  Active: active (running) since Fri 2018-04-20 16:08:19
UTC; 3 days ago
    Docs: man:nginx(8)
Main PID: 2369 (nginx)
  Tasks: 2 (limit: 1153)
  CGroup: /system.slice/nginx.service
          ├─2369 nginx: master process /usr/sbin/nginx -g daemon on; master_process on;
          └─2380 nginx: worker process
```

if not loaded, run

```sh
systemctl start nginx
```

Edit the `/etc/nginx/nginx.conf`
Other snippets are in `/etc/nginx/sites-available/default.conf`

Edit `default.conf`
Routes all traffic hitting port 80 (http) to your express app

```conf
server {
   listen 80;
   location / {
       proxy_pass http://localhost:3000; #change the port if needed
  }
}
```

Save the file and restart Nginx

```sh
systemctl restart nginx
```

### Load balancing

Edit `/etc/nginx/nginx.conf`

```conf
http {
   upstream fooapp {
       server localhost:3000;
       server domain2;
       server domain3;
      ...
  }
  ...
}
```

Edit default config file to point reverse proxy to this upstream

```conf
server {
   listen 80;
   location / {
       proxy_pass http://fooapp;
  }
}
```

Save and restart nginx

```sh
systemctl restart nginx
```

### Enable Caching with Nginx

Edit `nginx.conf`

```conf
http {
   proxy_cache_path /data/nginx/cache levels=1:2   keys_zone=STATIC:10m
  inactive=24h max_size=1g;
  ...
}
```

Edit `default.conf` and add

```conf
server {
   listen 80;
   location / {
       proxy_pass             http://fooapp;
       proxy_set_header       Host $host;
       proxy_buffering       on;
       proxy_cache           STATIC;
       proxy_cache_valid      200 1d;
       proxy_cache_use_stale  error timeout invalid_header updating
            http_500 http_502 http_503 http_504;
  }
}
```

Save both files and restart Nginx again

### Enable Gzip with Nginx

Edit `nginx.conf`

```
server {
   gzip on;
   gzip_types     text/plain application/xml;
   gzip_proxied    no-cache no-store private expired auth;
   gzip_min_length 1000;
  ...
}
```

## Enable caching with Redis

```sh
apt update
apt install redis-server
```

Edit `/etc/redis/redis.conf` and change `supervised no` to

```
supervised systemd
```

Save, close and restart

```sh
systemctl restart redis
systemctl status redis

[Output]
● redis-server.service - Advanced key-value store
  Loaded: loaded (/lib/systemd/system/redis-server.service; enabled; vendor preset: enabled)
  Active: active (running) since Wed 2018-06-27 18:48:52
UTC; 12s ago
    Docs: http://redis.io/documentation,
          man:redis-server(1)
Process: 2421 ExecStop=/bin/kill -s TERM $MAINPID (code=exited, status=0/SUCCESS)
Process: 2424 ExecStart=/usr/bin/redis-server
/etc/redis/redis.conf (code=exited, status=0/SUCCESS)
Main PID: 2445 (redis-server)
  Tasks: 4 (limit: 4704)
  CGroup: /system.slice/redis-server.service
          └─2445 /usr/bin/redis-server 127.0.0.1:6379
```

### Using redis in your app

```sh
npm i redis
```

```js
const express = require('express')
const app = express()
const redis = require('redis')
​
const redisClient = redis.createClient(6379)
​
async function getSomethingFromDatabase (req, res, next) {
  try {
    const { id } = req.params;
    const data = await database.query()
​
    // Set data to Redis
    redisClient.setex(id, 3600, JSON.stringify(data))

    res.status(200).send(data)
  } catch (err) {
    console.error(err)
    res.status(500)
  }
}
​
function cache (req, res, next) {
  const { id } = req.params
​
  redisClient.get(id, (err, data) => {
    if (err) {
      return res.status(500).send(err)
    }

    // If data exists return the cached value
    if (data != null) {
      return res.status(200).send(data)
    }
​
   // If data does not exist, proceed to the getSomethingFromDatabase function
   next()
  })
}
​
​
app.get('/data/:id', cache, getSomethingFromDatabase)
app.listen(3000, () => console.log(`Server running on Port ${port}`))
```

## How to Structure NodeJS Files

```
src/
  config/
    - configuration files
  controllers/
    - routes with provider functions as callback functions
  providers/
    - business logic for controller routes // handling routes
  services/
    - common business logic used in the provider functions // utils
  models/
    - database models
  routes.js
    - load all routes
  db.js
    - load all models
  app.js
    - load all of the above
test/
  unit/
    - unit tests
  integration/
    - integration tests
server.js
  - load the app.js file and listen on a port
(cluster.js)
  - load the app.js file and create a cluster that listens on a port
test.js
  - main test file that will run all test cases under the test/ directory
```

[NodeJS Error Handling](https://sematext.com/blog/node-js-error-handling/) \
[Express Best Practices](https://sematext.com/blog/expressjs-best-practices/#toc-how-to-improve-expressjs-performance-and-reliability-1) \
[NodeJS Open Source Monitoring Tools](https://sematext.com/blog/nodejs-open-source-monitoring-tools/) \
