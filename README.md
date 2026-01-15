# nanbyodata
## Prerequisites
* Docker
* Docker Compose

## Download source code
Download source code from this repository
```
$ cd /your/path/src/
$ git clone https://github.com/aidrd/nanbyodata.git
$ cd nanbyodata
```

## Configuration environment
Create `.env` file and set values for your environment.
```
$ cp templete.env .env
```
### `CONTAINER_NAME`
(default: `nanbyodata-app`)

The name of the docker container. Must be unique in the system.

### `PORT`
(default: `8888`)

Port to listen on. Must be unique in the system.

### `BASE_URI`
(default: `https://nanbyodata.jp`)

The URL of the server. Specifically, the base URL of the SPARQList to connect to.

### `NGINX_PORT`
See `Local development environment` section.

## Opration
NOTE: If you are using a version prior to Docker Compose v2.0.0, use the `docker-compose` command instead of `docker compose`
### Create and start container
```
$ docker compose up -d
```
### Check status
```
$ docker compose ps
NAME                SERVICE             STATUS              PORTS
nanbyodata-app      app                 running             0.0.0.0:8000->8000/tcp, :::8000->8000/tcp
```
Check the application page can be displayed from a browser on the port number specified in the `.env` file. e.g. `http://localhost:8000`


### Stop container
```
$ docker-compose stop
```
If the source code is changed, it must be `stop` and then `start`; this can also be done with the `restart` command.

### Delete container
```
$ docker-compose down
```
If `.env` or `docker-compose.yml` is changed, delete the container and start it with `up -d`


## Local development environment

Procedure for preparing a development environment on the local PC instead of on the server.  
Almost the same as the server environment but use `docker-compose_for_dev.yml` instead of the default `docker-compose.yml`. Specify the YML file with the `-f` option.  
Local development environment also includes the nginx container, so also specify the `NGINX_PORT` port in the `.env` file.(see below)

### `NGINX_PORT`
(default: `8888`)  
Nginx port to listen on. Must be unique in the system.  
Only required in the local development environment.

### Create network
Run only once when building the environment
```
$ docker network create nanbyodata_dev
```
If you have not created a network, you may get the following error
```
$ docker compose -f docker-compose_for_dev.yml up -d
Error response from daemon: network nanbyodata_dev not found
```

### Create and start container
```
$ docker compose -f docker-compose_for_dev.yml up -d
```
### Check status
```
$ docker-compose -f docker-compose_for_dev.yml ps   
NAME                 IMAGE            COMMAND                   SERVICE   CREATED         STATUS         PORTS
nanbyodata-app     nanbyodata-app   "pipenv run uwsgi --…"   app       15 hours ago   Up 9 minutes   0.0.0.0:8000->8000/tcp
nanbyodata-mysql   mysql:5.7.13     "docker-entrypoint.s…"   mysql     15 hours ago   Up 15 hours    0.0.0.0:13306->3306/tcp
nanbyodata-nginx   nginx:1.27.1     "/docker-entrypoint.…"   nginx     15 hours ago   Up 15 hours    0.0.0.0:8888->80/tcp
```

### Load db data
```
$ cp -a /your/path/nanbyodata_nando_panel.dump.sql mysql/sql/nanbyodata_nando_panel.dump.sql
$ docker-compose exec -T mysql sh /scripts/exec_sql_file.sh /scripts/sql/nanbyodata_nando_panel.dump.sql
```

### Stop container
```
$ docker compose -f docker-compose_for_dev.yml stop
```
If the source code is changed, it must be `stop` and then `start`; this can also be done with the `restart` command.

### Delete container
```
$ docker compose -f docker-compose_for_dev.yml down
```
If `.env` or `docker-compose.yml` is changed, delete the container and start it with `up -d`
