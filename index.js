// write alfred workflows in node
const alfy = require( 'alfy' );
const https = require( 'https' );

// user input to alfred
const input = alfy.input.replace( / /g, '_' );

// construct imdb api endpoint
const base  = 'https://v2.sg.media-imdb.com/suggests';
const endpoint = `${ base }/${ input.charAt( 0 ) }/${ input }.json`;

// make request
https.get( endpoint, ( res ) => {
  res.setEncoding( 'utf8' );
  let rawData = '';

  // generate response text
  res.on( 'data', ( chunk ) => { rawData = `${ rawData }${ chunk }` } );

  // once request is finished
  res.on( 'end', () => {
    let items = [ { title: 'Nothing found!' } ];

    // parse raw html into json object
    const cleanedData = clean( rawData );

    // if we have a valid response, map it
    if ( cleanedData && cleanedData.d ) {
      items = cleanedData.d.map( ( d ) => {
        return {
          title: d.l,
          subtitle: [ d.y, d.s ].filter( ( i ) => i ).join( ' - ' ),
          arg: getURL( d.id ),
        };
      } );
    }

    // resolve to alfy so we can display
    alfy.output( items );
  } );
} );

// clean json we get back from IMDB, because its not actually json...
function clean( json ) {
  let res = json;
  res = res.substr( res.indexOf( '(' ) + 1 );
  res = res.slice( 0, -1 );
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