# rethinkdb-backup

## Introduction

This app enables a client application to dump and retrieve from a running [RethinkDB](https://rethinkdb.com/) instance:
- list zipped archives (`/`)
- dump a database (`/dump`)
- download an archive (`/:fileName`)

## Requirements

- [NodeJS](https://nodejs.org/en/) (>=14.16.0 LTS)

You must also have access to a running instance of RethinkDB.

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

3. Run the app (specify RethinkDB host `DB_HOST`, defaults to `localhost`)
    ```sh
    DB_HOST="localhost" npm run start
    ```

4. To dump, GET [http://localhost:3000/dump](http://localhost:3000/dump)

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
- `DUMP_DIRECTORY` : name of the directory where zipped archives are placed (`archives`)

Database:

- `DB_HOST` : hostname or ip address of the database host (default `localhost`)
- `DB_PORT` : port for the database host (default: `28015`)
- `DB_NAME` : name of the db (default factoid)
- `DUMP_DATE_FORMAT` : format for the date stamp used in naming the zipped archive - i.e. `${DB_NAME}_dump_<date stamp>.tar.gz` (default `yyyy-MM-dd_HH-mm-ss-SSS`)

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

