import _ from 'lodash';
import path from 'path';
import { format } from 'date-fns';
import util from 'util';
import { exec as execRaw } from 'child_process';
import addMilliseconds from 'date-fns/addMilliseconds';
import formatDistance from 'date-fns/formatDistance';
import fetch from 'node-fetch';

import logger from './logger';
import {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DUMP_DIRECTORY,
  DUMP_DATE_FORMAT,
  DUMP_PATH,
  DUMP_DELAY_HOURS,
  SYNC_HOST,
  SYNC_MODE,
  SYNC_SRC,
  SYNC_DST,
  SYNC_PORT
} from './config';
import db from './db';

const exec = util.promisify( execRaw );

const MS_PER_SECOND = 1000;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const DUMP_DELAY_MS = DUMP_DELAY_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

// rclone
const SYNC_DEFAULTS = {
  _async: true
};

const checkHTTPStatus = res => {
  const { statusText, status, ok } = res;
  if ( !ok ) {
    throw new Error( `${statusText} (${status})` );
  }
  return res;
};
/**
 * sync
 * Sync to a remote via rClone remote control. See {@link https://rclone.org/rc/}
 * @param {*} opts options to configure the command
 * @returns an object with rClone "jobid"
 */
const sync = async opts => {
  const body = _.defaults( opts, {
    srcFs: SYNC_SRC,
    dstFs: SYNC_DST
  }, SYNC_DEFAULTS );
  let url = `http://${SYNC_HOST}:${SYNC_PORT}/sync/${SYNC_MODE}`;

  logger.info( `Attempting ${SYNC_MODE} from ${_.get( body, 'srcFs') } to ${_.get( body, 'dstFs') }` );

  return fetch( url, {
    method: 'POST',
    body: JSON.stringify( body ),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })
  .then( checkHTTPStatus )
  .then( res => res.json() )
  .then( json => {
    logger.info( `Sync request sent` );
    logger.info( JSON.stringify( json, null, 2 ) );
  })
  .catch( err => {
    logger.error( `Problem with Sync: ${err}` ); // swallow
  });
};

// RethinkDB
let loadTable = name => db.accessTable( name );

/**
 * dump
 * Dump the RethinkDB database
 * The result is a zipped archive named `${DB_NAME}_dump_${DATETIME}.tar.gz` in DUMP_DIRECTORY
 *
 * @return location the path to the dump file
 */
const dump = async () => {
  const DATETIME = format(new Date(), DUMP_DATE_FORMAT);
  const FILENAME = `${DB_NAME}_dump_${DATETIME}.tar.gz`;
  const DUMP_FOLDER = path.join( __dirname, DUMP_DIRECTORY );
  const CMD = `cd ${DUMP_FOLDER} && rethinkdb dump --connect ${DB_HOST}:${DB_PORT} --export ${DB_NAME} --file ${FILENAME}`;
  const location = `/${DUMP_PATH}${FILENAME}`;

  try {
    const { stdout } = await exec( CMD );
    logger.info( stdout );
    logger.info( `Successful dump to: ${location}` );
    return location;

  } catch ( err ) {
    logger.error( `dump error: ${err}` ); // swallow
  }
};

let dumpScheduled = false;
let dumpTime = null;

const scheduleDump = async ( delay, next = () => {} ) => {
  let now = new Date();
  logger.info( `A dump request has been received` );

  if( dumpScheduled ){
    logger.info( `A dump has already been scheduled for ${dumpTime} (${formatDistance( now, dumpTime )})` );
  } else {

    dumpTime = addMilliseconds( new Date(), delay );
    logger.info( `A dump was scheduled for ${dumpTime} (${formatDistance( now, dumpTime )})` );
    dumpScheduled = true;

    setTimeout( async () => {
      await dump();
      await next();
      dumpTime = null;
      dumpScheduled = false;
    }, delay );
  }
};

/**
 * backup
 * dump the database and sync to remote
 *
 * @param {number} delay ms delay for dumping (default none)
 * @return url location of the dump, possibly null if scheduled
 */
 const backup = async ( delay = 0 )=> {
  let location = null;
  if( delay == 0 ){
    location = await dump();
    await sync();
  } else {
    await scheduleDump( delay, sync );
  }
  return location;
};

// Configure Changefeeds for the document table
const docChangefeeds = async delay => {
  const docOpts = { includeTypes: true };
  const { rethink: r, conn, table } = await loadTable( 'document' );

  // Status changed to 'submitted'
  const toPublicStatus = r.row( 'new_val' )( 'status' ).eq( 'public' ).and( r.row( 'old_val' )( 'status' ).ne( 'public' ) );
  // Document 'add'
  const addedItem = r.row( 'type' ).eq( 'add' );
  const docFilter = addedItem.or( toPublicStatus );

  const cursor = await table.changes( docOpts ).filter( docFilter ).run( conn );
  cursor.each( () => backup( delay ) );
};

/**
 * registerChangefeedsListeners
 * Set up listeners for the specified Changefeeds
 */
const registerChangefeedsListeners = async () => {
  await docChangefeeds( DUMP_DELAY_MS );
};

export {
  registerChangefeedsListeners,
  backup
};