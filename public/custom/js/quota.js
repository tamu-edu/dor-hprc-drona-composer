
function populate_quota() {
    var quota_table = document.querySelector("#quota_table");

    $('#quota_table').DataTable({
        "paging": false,
        "searching": false,
        "info": false,
        "ordering": false,
        "scrolling": false,
        ajax: {
            dataType: "json",
            url: document.dashboard_url + '/resources/disk/quota',
            method: "GET",
        },
        "columns": [
            { "data": "disk_name" },
            { "data": "disk_usage" },
            { "data": "disk_limit" },
            { "data": "file_usage" },
            { "data": "file_limit" },
            {
                "data": null, render: function (data, type, row) {
                    percent = (row.file_usage / row.file_limit) * 100
                    return percent.toFixed(2);
                }
            },
        ]
    });
}

function setup_quota_request_sender(request_endpoint, form_id, modal_id) {
    // Source: https://developer.mozilla.org/en-US/docs/Learn/Forms/Sending_forms_through_JavaScript
    window.addEventListener("load", function () {
      function sendData() {
        const XHR = new XMLHttpRequest();
  
        // Bind the FormData object and the form element
        const FD = new FormData(form);
  
        // Define what happens on successful data submission
        XHR.addEventListener("load", function (event) {
          alert(event.target.responseText);
        });
  
        // Define what happens in case of error
        XHR.addEventListener("error", function (event) {
          alert(`Oops! ${event.target.responseText}`);
        });
  
        // Set up our request
        XHR.open("POST", request_endpoint);
  
        // The data sent is what the user provided in the form
        XHR.send(FD);
      }
  
      // Access the form element...
      let form = document.getElementById(form_id);
  
      // ...and take over its submit event.
      form.addEventListener("submit", function (event) {
        event.preventDefault();
  
        sendData();

        // dismiss our modal
        $(modal_id).modal('hide');
      });
    });
  }

(() => {
    quota_request_endpoint = document.dashboard_url + "/request/quota";

    populate_quota();
    setup_quota_request_sender(quota_request_endpoint, "modalQuotaRequestForm", "#requestQuotaModal");

})()