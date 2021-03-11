// import _ from 'lodash';
import express from 'express';
import path from 'path';
import serveIndex from 'serve-index';
import favicon from 'serve-favicon';

import logger from './logger';
import {
  BASE_URL,
  PORT,
  DUMP_DIRECTORY,
  DUMP_PATH,
  API_KEY
} from './config';
import { backup, registerChangefeedsListeners } from  './backup';

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
      logger.info('Sent:', fileName);
    }
  });
});


// Initialize app
Promise.resolve()
  .then( registerChangefeedsListeners )
  .then( () => {
    app.listen( PORT, () => {
      logger.info(`Listening at ${BASE_URL}:${PORT}`);
    });
  });

export default app;