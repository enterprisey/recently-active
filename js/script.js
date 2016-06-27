document.addEventListener( "DOMContentLoaded", function() {
    const API_ROOT = "https://en.wikipedia.org/w/api.php",
          API_SUFFIX = "&format=json&callback=?&continue=",
          EDIT_COUNT_THRESHOLD = 10000;
    loadJsonp( API_ROOT + "?action=query&list=recentchanges&rcprop=user&rcshow=!bot|!anon&rctype=edit&rclimit=500" + API_SUFFIX )
        .then( function ( data ) {
            if ( !data.query || !data.query.recentchanges ) {
                document.getElementById( "error" ).innerHTML = "Error loading recent changes!";
                return;
            }

            // Get list of users
            var users = uniq( data.query.recentchanges.map( function ( entry ) { return entry.user; } ) );

            var editCountPromises = users.map( function ( user ) {
                return loadJsonp( API_ROOT + "?action=query&list=users&usprop=editcount&ususers=" + user + API_SUFFIX );
            } );
            Promise.all(editCountPromises).then( function( results ) {
                var highCountUsers = [];
                results.forEach( function ( result ) {
                    if ( result.query.users[0].editcount > EDIT_COUNT_THRESHOLD ) {
                        highCountUsers.push( result.query.users[0].name );
                    }
                } );
                var table = document.getElementById( "result" );
                highCountUsers.forEach( function ( user ) {
                    var newRow = document.createElement( "tr" );
                    newRow.innerHTML = makeUserCell( user );
                    table.appendChild( newRow );
                } );
                document.getElementById( "loading" ).remove();
            } );
        } ); // end loadJsonp

    /**
     * Makes a <td> with all sorts of fun links.
     */
    function makeUserCell ( username ) {
        return "<td><a href='https://en.wikipedia.org/wiki/User:" + username + "' title='Wikipedia user page of " + username + "'>" + username + "</a> (<a href='https://en.wikipedia.org/wiki/User talk:" + username + "' title='Wikipedia user talk page of " + username + "'>talk</a> &middot; <a href='https://en.wikipedia.org/wiki/Special:Contributions/" + username + "' title='Wikipedia contributions of " + username + "'>contribs</a>)</td>";
    }

    // Utility functions
    // -------------------------------------------

    // Adapted from https://gist.github.com/gf3/132080/110d1b68d7328d7bfe7e36617f7df85679a08968
    var jsonpUnique = 0;
    function loadJsonp(url) {
        var unique = jsonpUnique++;
        return new Promise( function ( resolve, reject ) {
            var name = "_jsonp_" + unique;
            if (url.match(/\?/)) url += "&callback="+name;
            else url += "?callback="+name;
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = url;
            window[name] = function(data) {
                resolve(data);
                document.getElementsByTagName('head')[0].removeChild(script);
                script = null;
                delete window[name];
            };
            document.getElementsByTagName('head')[0].appendChild(script);
        } );
    }

    // From http://stackoverflow.com/a/9229821/1757964
    function uniq(a) {
        var seen = {};
        var out = [];
        var len = a.length;
        var j = 0;
        for(var i = 0; i < len; i++) {
            var item = a[i];
            if(seen[item] !== 1) {
                seen[item] = 1;
                out[j++] = item;
            }
        }
        return out;
    }
} );
