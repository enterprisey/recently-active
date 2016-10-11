document.addEventListener( "DOMContentLoaded", function() {
    console.log("script.js has loaded");
    const API_ROOT = "https://en.wikipedia.org/w/api.php",
          API_SUFFIX = "&format=json&callback=?&continue=",
          EDIT_COUNT_THRESHOLD = 10000;

    function load() {
        var filterRadioBtns = document.getElementsByName( "filter" );
        for(var i = 0; i < filterRadioBtns.length; i++) {
            filterRadioBtns[i].disabled = "disabled";
        }

        var table = document.getElementById( "result" );

        // Clear out table
        while ( table.firstChild ) {
            table.removeChild( table.firstChild );
        }

        // Clear error
        document.getElementById( "error" ).innerHTML = "";

        // Loading image
        document.getElementById( "loading" ).innerHTML = "<img src='images/loading.gif' /><br />Loading...";

        loadJsonp( API_ROOT + "?action=query&list=recentchanges&rcprop=user&rcshow=!bot|!anon&rctype=edit&rclimit=500" + API_SUFFIX )
            .then( function ( data ) {
                if ( !data.query || !data.query.recentchanges ) {
                    document.getElementById( "error" ).innerHTML = "Error loading recent changes!";
                    return;
                }

                // Get list of users
                var users = uniq( data.query.recentchanges.map( function ( entry ) { return entry.user; } ) );

                var userInfoPromises = users.map( function ( user ) {
                    return loadJsonp( API_ROOT + "?action=query&list=users&usprop=editcount|groups&ususers=" + user + API_SUFFIX );
                } );
                Promise.all( userInfoPromises ).then( function( results ) {
                    var filteredUsers = [];
                    var requiredGroup = document.querySelector( 'input[name="filter"]:checked' ).value;
                    results.forEach( function ( result ) {
                        var user = result.query.users[0],
                            highEditCount = user.editcount > EDIT_COUNT_THRESHOLD,
                            notBot = user.groups.indexOf( "bot" ) === -1,
                            hasGroup = user.groups.indexOf( requiredGroup ) !== -1;
                        if ( highEditCount && notBot && hasGroup ) {
                            filteredUsers.push( result.query.users[0].name );
                        }
                    } );

                    if(filteredUsers.length) {
                        var newRow = document.createElement( "tr" );
                        newRow.innerHTML = "<th>User</th>";
                        table.appendChild( newRow );
                        filteredUsers.forEach( function ( user ) {
                            newRow = document.createElement( "tr" );
                            newRow.innerHTML = makeUserCell( user );
                            table.appendChild( newRow );
                        } );
                    } else {
                        document.getElementById( "error" ).innerHTML = "No user in the <tt>" + requiredGroup + "</tt> group has edited very recently.";
                    }
                    document.getElementById( "loading" ).innerHTML = "";
                    for(var i = 0; i < filterRadioBtns.length; i++) {
                        filterRadioBtns[i].disabled = "";
                    }
                } );
            } ); // end loadJsonp
    }

    load();


    var filterRadioBtns = document.getElementsByName( "filter" );
    for(var i = 0; i < filterRadioBtns.length; i++) {
        filterRadioBtns[i].addEventListener( 'click', load );
    }

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
