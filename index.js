import express from 'express';
import path from 'path';
import fs from 'fs';
import serveIndex from 'serve-index';
import { exec } from 'child_process';
import { format } from 'date-fns';

import logger from './logger';
import {
  BASE_URL,
  PORT,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DUMP_DIRECTORY,
  DUMP_DATE_FORMAT
} from './config';

const app = express();

// Allow: GET, HEAD, POST
app.use(`/`,  serveIndex( path.join( __dirname, DUMP_DIRECTORY ), { 'icons': true } ) );

app.get('/dump', ( req, res, next ) => {
  const DATETIME = format(new Date(), DUMP_DATE_FORMAT);
  const FILENAME = `${DB_NAME}_dump_${DATETIME}.tar.gz`;
  const DUMP_FOLDER = path.join( __dirname, DUMP_DIRECTORY );
  const CMD = `cd ${DUMP_FOLDER} && rethinkdb dump --connect ${DB_HOST}:${DB_PORT} --export ${DB_NAME} --file ${FILENAME}`;

  exec( CMD, (error, stdout, stderr) => {
    if ( error ) {
      logger.error(`error: ${error.message}`);
      return next( error );
    }

    if ( stderr ) {
      logger.error(`stderr: ${stderr}`);
      return next( stderr );
    }

    logger.info(`stdout:\n${stdout}`);
    res.location(`/${FILENAME}`);
    return res.status(201).end();
  });
});

app.get(`/:fileName`, ( req, res, next ) => {
  const { fileName } = req.params;
  var options = {
    root: path.join( __dirname, DUMP_DIRECTORY ),
    dotfiles: 'deny',
    headers: {
      'x-timestamp': Date.now(),
      'x-sent': true
    }
  };
  res.sendFile( fileName, options, function ( err ) {
    if ( err ) {
      next( err );
    } else {
      logger.info('Sent:', fileName);
    }
  });
});

new Promise(
  resolve => resolve()
)
.then( () => {
  app.listen( PORT, () => {
    logger.info(`Listening at ${BASE_URL}:${PORT}`);
  });
});


export default app;