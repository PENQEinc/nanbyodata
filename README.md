# nanbyodata

## Prerequisites

- Docker
- Docker Compose

## Setup & Usage

### 1. Download source code

Download source code from this repository

```
$ cd /your/path/src/
$ git clone https://github.com/aidrd/nanbyodata.git
$ cd nanbyodata
```

### 2. Configuration environment

Create `.env` file and set values for your environment.

```
$ cp templete.env .env
```

#### `UID`
(default: None)

Host user id for the docker container. You can find your user id by `id -u`.

#### `GID`

(default: None)

Host group id for the docker container. You can find your group id by `id -g`.

#### `CONTAINER_NAME`

(default: `nanbyodata-app`)

The name of the docker container. Must be unique in the system.

#### `PORT`

(default: `8888`)

Port to listen on. Must be unique in the system.

#### `CONTAINER_NAME_MYSQL`
(default: `nanbyodata-mysql`)

The name of the docker container for the MySQL database. Must be unique in the system.

#### `MYSQL_PORT`
(default: `3306`)

Port for the MySQL to listen on. Must be unique in the system.

#### `MYSQL_ROOT_PASSWORD`
(default: None)

This variable is mandatory and specifies the password that will be set for the MySQL root superuser account.  
seeAlso: https://hub.docker.com/_/mysql

#### `MYSQL_DATABASE`
(default: None)

This variable allows you to specify the name of a database to be created on image startup.  
seeAlso: https://hub.docker.com/_/mysql

#### `MYSQL_USER`, `MYSQL_PASSWORD`
(default: None)

These variables used in conjunction to create a new user and to set that user's password.  
seeAlso: https://hub.docker.com/_/mysql


#### `MYSQL_DATA_DIR`
(default: `./mysql/data`)

Directory for MySQL data storage. For better performance, it is recommended to place the database files on an SSD.


#### `BASE_URI`

(default: `https://nanbyodata.jp`)

The URL of the server. Specifically, the base URL of the SPARQList to connect to.

#### `NGINX_PORT`

See `Local development environment` section.

### 3. Opration

NOTE: If you are using a version prior to Docker Compose v2.0.0, use the `docker-compose` command instead of `docker compose`

### 4. Create and start container

```
$ docker compose up -d
```

### 5. Check status

```
$ docker compose ps
NAME                SERVICE             STATUS              PORTS
nanbyodata-app      app                 running             0.0.0.0:8000->8000/tcp, :::8000->8000/tcp
```

Check the application page can be displayed from a browser on the port number specified in the `.env` file. e.g. `http://localhost:8000`

### 6. Stop container

```
$ docker-compose stop
```

If the source code is changed, it must be `stop` and then `start`; this can also be done with the `restart` command.

### 7. Delete container

```
$ docker-compose down
```

If `.env` or `docker-compose.yml` is changed, delete the container and start it with `up -d`


### 8. Execution and Operation  
Operational workflows are detailed in the following documentation:  

* [MySQL Update Procedure](https://docs.google.com/spreadsheets/d/12JjDHkd4k9oI5Xme_Isyg9nqUsHU1PZvmvz5DQPKNZc/edit?gid=1150718828#gid=1150718828)
* [NANDO Ontology Update Procedure](https://docs.google.com/spreadsheets/d/12JjDHkd4k9oI5Xme_Isyg9nqUsHU1PZvmvz5DQPKNZc/edit?gid=1914005581#gid=1914005581)  

[!IMPORTANT]  
If you are unable to access the documentation links above, please contact the DBCLS team.  
