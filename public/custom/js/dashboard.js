function populate_allocations() {
    $('#allocation_table').DataTable({
        "scrollY": "200px",
        "scrollCollapse": true,
        "paging": false,
        "searching": false,
        "info": false,
        ajax: {
            dataType: "json",
            url: '/pun/dev/dashboard/allocations.json',
            method: "GET",
         },
        "columns": [
            { "data": "account" },
            // { "data": "fy" },
            { "data": "default" },
            // { "data": "allocation" },
            { "data": "used_pending_su" },
            { "data": "balance" },
            // { "data": "pi"}
        ]
    });
}

function load_json(request_url, callback) {
  let request = new XMLHttpRequest();
  request.open('GET', request_url);
  request.responseType = 'json';
  request.send();

  request.onload = function() {
      const data = request.response;
      callback(data);
  }
}

function setup_request_sender(request_endpoint, form_id, modal_id) {
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
        XHR.open( "POST", request_endpoint );
    
        // The data sent is what the user provided in the form
        XHR.send(FD);
      }
     
      // Access the form element...
      let form = document.getElementById( form_id );
    
      // ...and take over its submit event.
      form.addEventListener( "submit", function ( event ) {
        event.preventDefault();
    
        sendData();
        dismiss_modal(modal_id);
      } );
    } );
}

function dismiss_modal(modal_id) {
  $(modal_id).modal('hide');
}


(() => {
    HOST_PATH = "/pun/dev/dashboard"
    SOFTWARE_REQUEST_ENDPOINT = HOST_PATH + "/request_software"
    QUOTA_REQUEST_ENDPOINT = HOST_PATH + "/request_quota"

    populate_allocations();
    setup_request_sender(SOFTWARE_REQUEST_ENDPOINT, "modalSoftwareRequestForm", "#requestSoftwareModal");
    setup_request_sender(QUOTA_REQUEST_ENDPOINT, "modalQuotaRequestForm", "#requestQuotaModal");
})()