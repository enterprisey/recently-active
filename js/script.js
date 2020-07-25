document.addEventListener( "DOMContentLoaded", function() {
    const API_ROOT = "https://en.wikipedia.org/w/api.php",
          API_SUFFIX = "&formatversion=2&format=json&callback=?&continue=",
          OPT_OUT_LIST = "User:Enterprisey/recently-active-opt-out.json",
          EDIT_COUNT_THRESHOLD = 10000;

    function applyUrlFilter() {
        var filterRadioBtns = document.getElementsByName( "filter" );

        // Get the selected filter from the query string
        var search = document.location.search.replace ("?", "" );
        var equalsIdx = search.lastIndexOf( "=" );
        var chosenFilter = search
                ? ( ( equalsIdx >= 0 ) ? search.substr( equalsIdx ) : search )
                : "";
        for(var i = 0; i < filterRadioBtns.length; i++) {
            if( chosenFilter === filterRadioBtns[i].id ) {
                filterRadioBtns[i].checked = true;
            }
        }
    }

    function load() {
        var filterRadioBtns = document.getElementsByName( "filter" );

        for(var i = 0; i < filterRadioBtns.length; i++) {
            filterRadioBtns[i].disabled = "disabled";
        }

        var table = document.getElementById( "result" );
        while ( table.firstChild ) {
            table.removeChild( table.firstChild );
        }

        // Clear error
        document.getElementById( "error" ).innerHTML = "";

        // Loading image
        document.getElementById( "loading" ).innerHTML = "<img src='images/loading.gif' /><br />Loading...";

        Promise.all( [
            loadJsonp( API_ROOT + "?action=query&list=recentchanges&rcprop=user&rcshow=!bot|!anon&rctype=edit&rclimit=500" + API_SUFFIX ),
            loadJsonp( API_ROOT + "?action=query&prop=revisions&titles=" + OPT_OUT_LIST + "&rvslots=main&rvprop=content" + API_SUFFIX )
        ] ).then( function ( data ) {
            var rcData = data[0],
                optOutData = data[1];

            if ( !rcData.query || !rcData.query.recentchanges ) {
                console.error(rcData);
                document.getElementById( "error" ).innerHTML = "Error loading recent changes!";
                return;
            }

            if( !optOutData.query || !optOutData.query.pages[0].revisions[0].slots.main.content ) {
                console.error(optOutData);
                document.getElementById( "error" ).innerHTML = "Error loading opt-out list at <a href='https://en.wikipedia.org/wiki/" + OPT_OUT_LIST + "'>" + OPT_OUT_LIST + "</a>!";
                return;
            }

            // Get list of users
            var users = uniq( rcData.query.recentchanges.map( function ( entry ) { return entry.user; } ) );

            // Apply opt-out
            var optOutList = JSON.parse( optOutData.query.pages[0].revisions[0].slots.main.content );
            users = users.filter( function ( user ) {
                return optOutList.indexOf( user ) < 0;
            } );

            var userInfoPromises = users.map( function ( user ) {
                return loadJsonp( API_ROOT + "?action=query&list=users&usprop=editcount|groups&ususers=" + encodeURIComponent( user ) + API_SUFFIX );
            } ).map( function( promise ) {

                // If a call fails, we really don't care
                return new Promise( function ( resolve ) {
                    promise
                        .then( function ( x ) { resolve( x ); } )
                        .catch( function ( x ) { resolve( null ); } );
                } );
            } );
            Promise.all( userInfoPromises ).then( function( results ) {
                var filteredUsers = [];
                var requiredGroup = document.querySelector( 'input[name="filter"]:checked' ).value;
                results.forEach( function ( result ) {
                    if( result === null ) return;
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

    applyUrlFilter();
    load();


    var filterRadioBtns = document.getElementsByName( "filter" );
    for(var i = 0; i < filterRadioBtns.length; i++) {
        filterRadioBtns[i].addEventListener( 'click', load );
    }

    /**
     * Makes a <td> with all sorts of fun links.
     */
    function makeUserCell ( username ) {
        var encUsername = encodeURIComponent( username ).replace( "'", "%27" ),
            escQuotUsername = username.replace( "'", "&#39" );
        return "<td><a href='https://en.wikipedia.org/wiki/User:" + encUsername +
            "' title='Wikipedia user page of " + escQuotUsername + "'>" +
            username + "</a> (<a href='https://en.wikipedia.org/wiki/User talk:" +
            encUsername + "' title='Wikipedia user talk page of " +
            escQuotUsername + "'>talk</a> &middot; <a " +
            "href='https://en.wikipedia.org/wiki/Special:Contributions/" +
            encUsername + "' title='Wikipedia contributions of " +
            escQuotUsername + "'>contribs</a>)</td>";
    }

    // Utility functions
    // -------------------------------------------

    // Adapted from https://gist.github.com/gf3/132080/110d1b68d7328d7bfe7e36617f7df85679a08968
    var jsonpUnique = 0;
    function loadJsonp(url) {
        jsonpUnique = ( jsonpUnique || 0 ) + 1;
        var unique = jsonpUnique;
        return new Promise( function ( resolve, reject ) {
            var name = "_jsonp_" + unique;
            if (url.match(/\?/)) url += "&callback="+name;
            else url += "?callback="+name;
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = url;
            script.onerror = function() { reject(); };
            window[name] = function(data) {
                resolve(data);
                document.getElementsByTagName('head')[0].removeChild(script);
                script = null;
                delete window[name];
            };
            document.getElementsByTagName('head')[0].appendChild(script);
        }.bind( this ) );
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
