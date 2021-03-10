import _ from 'lodash';
import express from 'express';
import path from 'path';
import serveIndex from 'serve-index';
import { format } from 'date-fns';
import favicon from 'serve-favicon';
import r from 'rethinkdb';
import util from 'util';
import { exec as execRaw } from 'child_process';

import logger from './logger';
import {
  BASE_URL,
  PORT,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DUMP_DIRECTORY,
  DUMP_DATE_FORMAT,
  DUMP_PATH,
  API_KEY
} from './config';

// RethinkDB: dump
const exec = util.promisify( execRaw );
const dump = async () => {
  const DATETIME = format(new Date(), DUMP_DATE_FORMAT);
  const FILENAME = `${DB_NAME}_dump_${DATETIME}.tar.gz`;
  const DUMP_FOLDER = path.join( __dirname, DUMP_DIRECTORY );
  const CMD = `cd ${DUMP_FOLDER} && rethinkdb dump --connect ${DB_HOST}:${DB_PORT} --export ${DB_NAME} --file ${FILENAME}`;
  const location = `/${DUMP_PATH}${FILENAME}`;

  try {
    const { stdout } = await exec( CMD );
    logger.info( `dump: ${stdout}` );
    return location;

  } catch ( err ) {
    logger.error( `dump error: ${err}` );
    throw err;
  }
};

// RethinkDB: changefeed
const onDocChange = ( err, row ) => {
  if (err) throw err;

  let type = _.get( row, ['type'] );
  let old_status = _.get( row, ['old_val', 'status'] );
  let new_status = _.get( row, ['new_val', 'status'] );

  if( old_status !== new_status ){
    console.log( `old_status: ${old_status}` );
    console.log( `new_status: ${new_status}` );
  }
  if( type === 'add'  ){
    console.log( `type: ${type}` );
  }
};

const statusUpdateFilter = r.row( 'new_val' )( 'status' ).ne( r.row( 'old_val' )( 'status' ) );
const addFilter = r.row( 'type' ).eq( 'add' );
const docFilter = addFilter.or( statusUpdateFilter );

const addDocListener = async () => {
  const conn = await r.connect({ host: DB_HOST, port: DB_PORT });
  const cursor = await r.db( DB_NAME )
      .table( 'document' )
      .changes({
        includeTypes: true
      })
      .filter( docFilter )
      .run( conn );
  cursor.each( onDocChange );
};

const addDbListeners = () => addDocListener();

// ExpressJS: routes
const app = express();

const checkApiKey = function (req, res, next) {
  if( API_KEY && req.query.apiKey != API_KEY ){
    res.send( 401, "Unauthorized" );
  } else {
    next();
  }
};

app.use(favicon(path.join(__dirname, 'logo.png')));

app.use(`/${DUMP_PATH}`,  serveIndex( path.join( __dirname, DUMP_DIRECTORY ), { 'icons': true } ) );

app.get(`/${DUMP_PATH}dump`, checkApiKey, ( req, res, next ) => {
  dump()
    .then( url => {
      res.location( url );
      return res.status( 201 ).end();
    })
    .catch( next );
});

app.get(`/${DUMP_PATH}:fileName`, ( req, res, next ) => {
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


// Initialize app
Promise.resolve()
  .then( addDbListeners )
  .then( () => {
    app.listen( PORT, () => {
      logger.info(`Listening at ${BASE_URL}:${PORT}`);
    });
  });

export default app;