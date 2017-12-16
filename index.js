// write alfred workflows in node
const alfy = require( 'alfy' );
const request = require( 'request' );
const fs = require( 'fs' );
const path = require('path');

// directory where we will store our thumbnails
const directory = 'images';

// this script gets called a bunch of times, and our cache of stored
// images will grow really, really fast. This function will remove all
// previously cached images upon execution, so the folder will only contain
// new images for the latest query.
removeFilesFromDirectory();

// user input to alfred
const input = alfy.input.replace( / /g, '_' );
// const input = 'robot';

// construct imdb autocomplete api endpoint
const base  = 'https://v2.sg.media-imdb.com/suggests';
const endpoint = `${ base }/${ input.charAt( 0 ) }/${ input }.json`;

// make request
request.get( { url: endpoint, json: false }, ( err, res, body ) => {
  // generate default response text
  let items = [ { title: 'Nothing found!' } ];

  if ( err ) return items;

  // parse raw html into json object
  const cleanedData = clean( body );

  // if we have a valid response, map it
  if ( cleanedData && cleanedData.d ) {
    items = cleanedData.d.map( ( d ) => {
      const path = generateIcon( d.i && d.i[ 0 ], d.id );

      return {
        title: d.l,
        subtitle: [ d.y, d.s ].filter( ( i ) => i ).join( ' - ' ),
        icon: { path },
        arg: getURL( d.id ),
      };
    } );
  }

  // resolve to alfy so we can display
  alfy.output( items );
} );

// clean json we get back from IMDB, because its not actually json...
function clean( json ) {
  // make the weird json look like real json, then parse it
  let res = json;
  res = res.substr( res.indexOf( '(' ) + 1 ); // replace weird stuff at the beginning of the response
  res = res.slice( 0, -1 ); // remove trailing ')'
  return JSON.parse( res );
}

// make result tiles link out to the corresponding imdb page
function getURL( id ) {
  const base = 'http://www.imdb.com';
  const prefix = id.substr( 0, 2 );

  switch ( prefix ) {
    case 'nm':
      return `${ base }/name/${ id }`;
    case 'tt':
    default:
      return `${ base }/title/${ id }`;
  }
}

// request the image from the url, write it to local file system
function generateIcon( src = '', id ) {
  if ( ! src ) return;

  // don't use the full res imdb crop
  const croppedSrc = src.replace( '@._V1_.jpg', '@._V1._SX40_CR0,0,40,54_.jpg' );

  // construct a filename from the movie/actor/whatever id
  const fileName = `${ directory }/${ id }.jpg`;

  // request the image buffer
  request.get( { url: croppedSrc, encoding: null }, ( requestErr, res, buffer ) => {
    if ( requestErr ) return;
    fs.writeFileSync( fileName, buffer, 'binary' );
  } );

  return fileName;
}

function removeFilesFromDirectory() {
  // list all the files in our image directory
  fs.readdir( directory, ( err, files ) => {
    if ( err ) return;

    // delete every single one of em
    files.forEach( ( file ) => {
      // except the readme
      if ( file.includes( 'readme' ) ) return;

      fs.unlink( path.join( directory, file ), ( err ) => {
        if ( err ) return;
      } )
    } );
  });
}