function populate_allocations() {
    $('#allocation_table').DataTable({
        "scrollY": "200px",
        "scrollCollapse": true,
        "paging": false,
        ajax: {
            dataType: "json",
            url: '/pun/dev/dashboard/allocations.json',
            method: "GET",
         },
        "columns": [
            { "data": "account" },
            { "data": "fy" },
            { "data": "default" },
            { "data": "allocation" },
            { "data": "used_pending_su" },
            { "data": "balance" },
            { "data": "pi"}
        ]
    });
}

function load_json(request_url) {
    let request = new XMLHttpRequest();
    request.open('GET', request_url);
    request.responseType = 'json';
    request.send();

    request.onload = function() {
        const data = request.response;
        console.log(data);
    }
}

function setup_quota_request_sender() {
    // Source: https://developer.mozilla.org/en-US/docs/Learn/Forms/Sending_forms_through_JavaScript
    window.addEventListener( "load", function () {
        function sendData() {
          const XHR = new XMLHttpRequest();
      
          // Bind the FormData object and the form element
          const FD = new FormData( form );
      
          // Define what happens on successful data submission
          XHR.addEventListener( "load", function(event) {
            alert( event.target.responseText );
          } );
      
          // Define what happens in case of error
          XHR.addEventListener( "error", function( event ) {
            alert( 'Oops! Something went wrong.' );
          } );
      
          // Set up our request
          XHR.open( "POST", "https://portal-terra.hprc.tamu.edu/pun/dev/dashboard/request_quota" );
      
          // The data sent is what the user provided in the form
          XHR.send();
        }
       
        // Access the form element...
        let form = document.getElementById( "modalQuotaRequestForm" );
      
        // ...and take over its submit event.
        form.addEventListener( "submit", function ( event ) {
          event.preventDefault();
      
          sendData();
        } );
      } );
}

(() => {
    populate_allocations();
    setup_quota_request_sender();
})()