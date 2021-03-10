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
export const DB_HOST = env( 'DB_HOST', 'localhost' );
export const DB_PORT = env( 'DB_PORT', 28015 );
export const DB_NAME = env( 'DB_NAME', 'factoid' );
export const DUMP_DATE_FORMAT = env( 'DUMP_DATE_FORMAT', 'yyyy-MM-dd_HH-mm-ss-SSS' );
export const DUMP_DELAY_HOURS = env( 'DUMP_DELAY_HOURS', 0.05 );
