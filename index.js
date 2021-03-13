// import _ from 'lodash';
import express from 'express';
import path from 'path';
import serveIndex from 'serve-index';
import favicon from 'serve-favicon';
import process from 'process';

import logger from './logger';
import {
  BASE_URL,
  PORT,
  DUMP_DIRECTORY,
  DUMP_PATH,
  API_KEY
} from './config';
import { backup, setupChangefeeds } from  './backup';
import db from './db';

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

app.get(`/${DUMP_PATH}backup`, checkApiKey, ( req, res, next ) => {
  backup().then( () => res.status( 202 ).end() ).catch( next );
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
      logger.info(`Sent ${fileName}`);
    }
  });
});


// Initialize app
Promise.resolve()
  .then( () => db.tryForTable( 'document' ) )
  .then( setupChangefeeds )
  .then( () => {
    app.listen( PORT, () => {
      logger.info(`Listening at ${BASE_URL}:${PORT}`);
    });
  })
  .catch( err => {
    logger.error(`Init: ${err}`);
    process.exit( 1 );
  });

export default app;