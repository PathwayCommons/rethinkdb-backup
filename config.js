import _ from 'lodash';

const env = (key, defaultVal) => {
  if( process.env[key] != null ){
    let val =  process.env[key];

    if( _.isInteger(defaultVal) ){
      val = parseInt(val);
    }
    else if( _.isBoolean(defaultVal) ){
      val = JSON.parse(val);
    }

    return val;
  } else {
    return defaultVal;
  }
};

// General
export const NODE_ENV = env( 'NODE_ENV', undefined );
export const BASE_URL = env( 'BASE_URL', 'http://localhost' );
export const PORT = env( 'PORT', 3000 );
export const LOG_LEVEL = env('LOG_LEVEL', 'info');
export const DUMP_DIRECTORY = env('DUMP_DIRECTORY', 'archives');
export const DUMP_PATH = env('DUMP_PATH', 'archives/');
export const API_KEY = env('API_KEY', '');

// Database
export const DB_NAME = env( 'DB_NAME', 'factoid' );
export const DB_HOST = env( 'DB_HOST', 'localhost' );
export const DB_PORT = env( 'DB_PORT', 28015 );
export const DB_USER = env( 'DB_USER', undefined ); // username if db uses auth
export const DB_PASS = env( 'DB_PASS', undefined ); // password if db uses auth
export const DB_CERT = env( 'DB_CERT', undefined );  // path to a certificate (cert) file if db uses ssl

// Backup
export const DUMP_DATE_FORMAT = env( 'DUMP_DATE_FORMAT', 'yyyy-MM-dd_HH-mm-ss-SSS' );
export const BACKUP_DELAY_HOURS = env( 'BACKUP_DELAY_HOURS', 0.01 );

// Sync Service
export const SYNC_HOST = env( 'SYNC_HOST', 'localhost' );
export const SYNC_PORT = env( 'SYNC_HOST', 5572 );
export const SYNC_PASSWORD = env( 'SYNC_PASSWORD', undefined );
export const SYNC_LOGIN = env( 'SYNC_LOGIN', undefined );
export const SYNC_CMD = env( 'SYNC_CMD', 'sync/copy' );
export const SYNC_SRC = env( 'SYNC_SRC', '/data' );
export const SYNC_DST = env( 'SYNC_DST', 'dropbox:archives' );

