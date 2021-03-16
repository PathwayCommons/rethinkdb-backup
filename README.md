# rethinkdb-backup

## Introduction

This app provides a capability to backup a [RethinkDB](https://rethinkdb.com/) instance. Data is dumped to a compressed archive. This app can attach to a file synchronization service (e.g. [rClone](https://rclone.org/)) and initate a request to copy dumps to a remote store.

The system is configured to initiate a backup when changes are made to the RethinkDB `factoid` database `document` table:
- A `document` is added
- A `document`'s `status` field is updated to `public`
- A `document` with `status = public` is updated (//TODO)

Each backup request can be configured to occur with a given delay (default is 3 hours). When a backup is scheduled, further requests are ignored during this period enabling the system to aggregate or 'batch' changes.

A built-in webserver provides the following HTTP endpoints:
- `/`: list the database dumps (naming convention `<DB_NAME>_dump_<DATETIME>.tar.gz`)
- `/backup`: initiate a backup (requires `apiKey` as URL param, when configured)
- `/<dump name>`: download a database dump

## Requirements

- [NodeJS](https://nodejs.org/en/) (>=14.16.0 LTS)

You must also have access to a running instance of RethinkDB and a file synchronization service like rClone.

## Getting Started

1. Clone this remote
    ```sh
    git clone https://github.com/PathwayCommons/rethinkdb-backup.git
    ```

2. Install packages
    ```sh
    cd rethinkdb-backup
    npm install
    ```

3. Run the app
    ```sh
    npm run start
    ```

4. Point your browser at [http://localhost:3000/](http://localhost:3000/)

## Required software

- [Node.js](https://nodejs.org/en/) >=10
- [RethinkDB](http://rethinkdb.com/) ^2.3.0

## Configuration

The following environment variables can be used to configure the server:

General:

- `NODE_ENV` : the environment mode; either `production` or `development` (default)
- `BASE_URL` : used for logging currently
- `PORT` : the port on which the server runs (default `3000`)
- `LOG_LEVEL` : minimum log level; one of `info` (default), `warn`, `error`
- `DUMP_DIRECTORY` : name of the directory where database dumps are placed (`archives`)
- `DUMP_PATH` : the url path prefix to add
- `API_KEY` : the API key for protected endpoints (i.e. `/backup`)

Database:

- `DB_NAME` : name of the db (default `factoid`)
- `DB_HOST` : hostname or ip address of the database host (default `localhost`)
- `DB_PORT` : port for the database host (default: `28015`)
- `DB_USER` : the db user
- `DB_PASS` : the db password
- `DB_CERT` : the path to the certificate if db uses TLS

Backup:

- `DUMP_DATE_FORMAT` : format for the date stamp used in naming the zipped archive - i.e. `${DB_NAME}_dump_<date stamp>.tar.gz` (default `yyyy-MM-dd_HH-mm-ss-SSS`)
- `BACKUP_DELAY_MIN` : the time to wait before triggering a backup (default `180`)

Sync Service:

- `SYNC_ENABLED` : Use the Sync service (default `true`)
- `SYNC_HOST` : Sync service host name (default `localhost`)
- `SYNC_PORT` : Port that the sync service is bound to (default `5572`)
- `SYNC_LOGIN` : User name for authentication.
- `SYNC_PASSWORD` : Password for authentication.
- `SYNC_CMD` : Sync service commmand to execute (for rClone its `sync/copy`)
- `SYNC_SRC` : A remote name string e.g. "drive:src" for the source
- `SYNC_DST` : A remote name string e.g. "drive:dst" for the destination

## Docker

Images are maintained on [Docker Hub](https://hub.docker.com/).

## Publishing a release

1. Make sure the linting is passing: `npm run lint`
1. Bump the version number with `npm version`, in accordance with [semver](http://semver.org/).  The `version` command in `npm` updates both `package.json` and git tags, but note that it uses a `v` prefix on the tags (e.g. `v1.2.3`).
  1. For a bug fix / patch release, run `npm version patch`.
  1. For a new feature release, run `npm version minor`.
  1. For a breaking API change, run `npm version major.`
  1. For a specific version number (e.g. 1.2.3), run `npm version 1.2.3`.
1. Push the release: `git push origin --tags`

