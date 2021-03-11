import path from 'path';
import { format } from 'date-fns';
import util from 'util';
import { exec as execRaw } from 'child_process';
import addMilliseconds from 'date-fns/addMilliseconds';
import formatDistance from 'date-fns/formatDistance';

import logger from './logger';
import {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DUMP_DIRECTORY,
  DUMP_DATE_FORMAT,
  DUMP_PATH,
  DUMP_DELAY_HOURS
} from './config';
import db from './db';

const exec = util.promisify( execRaw );

const MS_PER_SECOND = 1000;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const DUMP_DELAY_MS = DUMP_DELAY_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

// RethinkDB
let loadTable = name => db.accessTable( name );

/**
 * dump
 * Dump the RethinkDB database
 * The result is a zipped archive named `${DB_NAME}_dump_${DATETIME}.tar.gz` in DUMP_FOLDER
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
    logger.info( `dump: ${stdout}` );
    logger.info( `Successful dump to: ${location}` );
    return location;

  } catch ( err ) {
    logger.error( `dump error: ${err}` );
    throw err;
  }
};

let dumpScheduled = false;
let dumpTime = null;

const requestDump = async ( delay = 0 ) => {
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
      dumpTime = null;
      dumpScheduled = false;
    }, delay );

  }
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
  cursor.each( () => requestDump( delay ) );
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
  dump
};