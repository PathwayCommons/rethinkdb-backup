import _ from 'lodash';
import path from 'path';
import { format } from 'date-fns';
import util from 'util';
import { exec as execRaw } from 'child_process';
import addMilliseconds from 'date-fns/addMilliseconds';
import formatDistance from 'date-fns/formatDistance';
import fetch from 'node-fetch';
import base64 from 'base-64';

import logger from './logger';
import {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DUMP_DIRECTORY,
  DUMP_DATE_FORMAT,
  BACKUP_DELAY_MIN,
  SYNC_HOST,
  SYNC_LOGIN,
  SYNC_PASSWORD,
  SYNC_CMD,
  SYNC_SRC,
  SYNC_DST,
  SYNC_PORT,
  SYNC_ENABLED
} from './config';
import db from './db';

const exec = util.promisify( execRaw );
const setTimeoutPromise = util.promisify( setTimeout );

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const BACKUP_DELAY_MS = BACKUP_DELAY_MIN * SECONDS_PER_MINUTE * MS_PER_SECOND;

const checkHTTPStatus = res => {
  const { statusText, status, ok } = res;
  if ( !ok ) {
    throw new Error( `${statusText} (${status})` );
  }
  return res;
};

// rclone
const SYNC_DEFAULT_OPTS = {
  _async: true
};

/**
 * syncService
 * Wrapper for the rClone remote control. See {@link https://rclone.org/rc/}
 *
 * @param {string} cmd the remote control command to run
 * @param {object} opts options to configure the command
 * @returns if _async = true, an object with rClone "jobid" else nothing
 */
const syncService = ( cmd, opts ) => {
  const payload = _.defaults( opts, SYNC_DEFAULT_OPTS );
  const body = JSON.stringify( payload );
  let url = `http://${SYNC_HOST}:${SYNC_PORT}/${cmd}`;

  return fetch( url, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${base64.encode(SYNC_LOGIN + ":" + SYNC_PASSWORD)}`
    }
  })
  .then( checkHTTPStatus )
  .then( res => res.json() )
  .then( json => {
    logger.info( `Sync request sent` );
    logger.info( JSON.stringify( json, null, 2 ) );
  })
  .catch( err => {
    logger.error( `sync: ${err}` );
    throw err;
  });
};

// RethinkDB
let loadTable = name => db.accessTable( name );

/**
 * dump
 * Dump the RethinkDB database
 * The result is a zipped archive named `${DB_NAME}_dump_${DATETIME}.tar.gz` in DUMP_DIRECTORY
 */
const dump = async () => {
  const DATETIME = format(new Date(), DUMP_DATE_FORMAT);
  const FILENAME = `${DB_NAME}_dump_${DATETIME}.tar.gz`;
  const DUMP_FOLDER = path.join( __dirname, DUMP_DIRECTORY );
  const CMD = `cd ${DUMP_FOLDER} && rethinkdb dump --connect ${DB_HOST}:${DB_PORT} --export ${DB_NAME} --file ${FILENAME}`;

  try {
    const { stdout } = await exec( CMD );
    logger.info( stdout );
    return Promise.resolve();

  } catch ( err ) {
    logger.error( `dump error: ${err}` );
    throw err;
  }
};

let dumpScheduled = false;
let dumpTime = null;
let resetDump = () => { dumpScheduled = false; dumpTime = null; };

/**
 * scheduleDump
 * Schedule a dump in 'delay' ms. Ignore additional requests while scheduled.
 *
 * @param {number} delay ms delay for dumping (default 0)
 * @param {object} next The callback to run after a dump
 */
const scheduleDump = async ( delay = 0, next = () => {} ) => {
  let now = new Date();
  logger.info( `A dump request has been received` );

  if( dumpScheduled ){
    logger.info( `A dump has already been scheduled for ${dumpTime} (${formatDistance( now, dumpTime )})` );

  } else {
    dumpTime = addMilliseconds( new Date(), delay );
    logger.info( `A dump was scheduled for ${dumpTime} (${formatDistance( now, dumpTime )})` );
    dumpScheduled = true;

    setTimeoutPromise( delay )
      .then( dump )
      .then( next )
      .catch( () => {} ) // swallow
      .finally( resetDump ); // allow another backup request
  }

  return Promise.resolve();
};

const dumpNext = SYNC_ENABLED ?
  () => syncService( SYNC_CMD, { srcFs: SYNC_SRC, dstFs: SYNC_DST } ) :
  () => { logger.info(`SYNC_ENABLED: ${SYNC_ENABLED}`); };

/**
 * backup
 * Wrapper for the scheduleDump, using syncService as callaback
 *
 * @param {number} delay set a ms delay
 */
const backup = delay => scheduleDump( delay, dumpNext );

// Configure Changefeeds for the document table
const docChangefeeds = async delay => {
  const docOpts = { includeTypes: true };
  const { rethink: r, conn, table } = await loadTable( 'document' );

  // Document not 'demo'
  const notDemo = r.row( 'new_val' )( 'id' ).ne( 'demo' ).and( r.row( 'new_val' )( 'secret' ).ne( 'demo' ) );

  // Document 'add'
  const addedItem = r.row( 'type' ).eq( 'add' );

  // Status changed to 'public' from other
  const toPublicStatus = r.row( 'new_val' )( 'status' ).eq( 'public' ).and( r.row( 'old_val' )( 'status' ).ne( 'public' ) );

  // Status is 'public' and updated
  const publicUpdated = r.row( 'new_val' )( 'status' ).eq( 'public' )
    .and( r.row( 'old_val' )( 'status' ).eq( 'public' ) );

  const docFilter = notDemo.and( addedItem.or( toPublicStatus ).or( publicUpdated ) );

  const cursor = await table.changes( docOpts ).filter( docFilter ).run( conn );
  cursor.each( () => backup( delay ) );
  // cursor.each( (err, item) => {
  //   const type = _.get( item, 'type' );
  //   console.log( type );
  // });
};

/**
 * setupChangefeeds
 * Set up listeners for the specified Changefeeds
 */
const setupChangefeeds = async () => {
  await docChangefeeds( BACKUP_DELAY_MS );
};

export {
  setupChangefeeds,
  backup
};