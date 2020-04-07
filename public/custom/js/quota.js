function colorize_percentage_value(percent) {
  if (percent < 30.0) {
    return `${percent} %`.fontcolor('green');
  } else if (percent >= 70.0) {
    return `${percent} %`.fontcolor('red');
  } else {
    return `${percent} %`.fontcolor('orange');
  }
}


// borrow from this answer: https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatKBytes(data) {
  bytes = data * 1024;
  return formatBytes(bytes);
}


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
    "columns": [{
        "data": "name"
      },
      {
        "data": "disk_usage", "sClass":  "text-right",
        render: function (data, type, row) {
          percent = (row.disk_usage / row.disk_limit) * 100
          return `${formatKBytes(data)} (${colorize_percentage_value(percent.toFixed(2))})`;
        }
      },
      {
        "data": "disk_limit", "sClass":  "text-right",
        render: formatKBytes
      },

      {
        "data": "file_usage", "sClass":  "text-right",
        render: function (data, type, row) {
          percent = (row.file_usage / row.file_limit) * 100
          return `${data} (${colorize_percentage_value(percent.toFixed(2))})`;
        }
      },
      {
        "data": "file_limit", "sClass":  "text-right",
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