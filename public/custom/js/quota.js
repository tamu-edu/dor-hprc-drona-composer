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

function generate_file_explorer_path_for_disk(disk_name) {
  disk_name = disk_name.trim()
  var disk_path = ""
  if (disk_name === '/home') {
    disk_path = document.file_app_url + `/home/${document.username}`;
  } else if (disk_name == "/scratch") {
    disk_path = document.file_app_url + `/scratch/user/${document.username}`; 
  } else {
    // default is scratch 
    disk_path = document.file_app_url + `/scratch/user/${document.username}`
  }

  return `<a target="_blank" href="${disk_path}">${disk_name}</a>`

}

function populate_quota() {
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
        "data": "name",
        render: function(disk_name, type, row) {
          return generate_file_explorer_path_for_disk(disk_name);
        }
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
    if (form === null) {
      return;
    }

    // ...and take over its submit event.
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var scratch_storage = form.desired_disk;
      var file_limit = form.total_file_limit;
      if ((!scratch_storage.value) && (!file_limit.value)) {
        alert("Either Scratch Storage or File Limit must be filled");
        return;
      }
      

      sendData();

      // dismiss our modal
      $(modal_id).modal('hide');
    });
  });
}

function populate_request_quota_form(quota) {

}

function setup_quota_request_form(quota_request_endpoint) {
  fetch(quota_request_endpoint)
  .then((response) => {
    return response.json();
  })
  .then((data) => {
    var quotas = data['data'];
    // quotas = quotas.filter(quota => quota["name"] === '/scratch');
    var scratch_quota = null;

    quotas.forEach(quota => {
      disk_name = quota["name"].trim();
      
      if (disk_name === '/scratch') {
        scratch_quota = quota;
      }
    });

    if (scratch_quota === null) {
      console.error("Cannot fetch scratch quota");
      return;
    }

    // find and set current values of quota and file limit
    var current_disk_quota = document.getElementById("current_quota");
    if (current_disk_quota === null) {
      return;
    }
    current_disk_quota.value = formatKBytes(scratch_quota["disk_limit"]);

    var current_file_limit = document.getElementById("current_file_limit");
    current_file_limit.value = scratch_quota["file_limit"];

    // invisible form components (needs this for RT email)
    $("#current_used_disk_quota").val(formatKBytes(scratch_quota["disk_usage"]));
    $("#current_used_file").val(scratch_quota["file_usage"]);

  });
}

(() => {
  let quota_request_endpoint = document.dashboard_url + "/request/quota";
  let disk_quota_endpoint = document.dashboard_url + "/resources/disk/quota";

  populate_quota();
  setup_quota_request_sender(quota_request_endpoint, "modalQuotaRequestForm", "#requestQuotaModal");
  setup_quota_request_form(disk_quota_endpoint);
})()