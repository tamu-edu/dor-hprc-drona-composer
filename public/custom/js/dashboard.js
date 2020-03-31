function populate_allocations() {
  $('#allocation_table').DataTable({
    "scrollY": "200px",
    "scrollCollapse": true,
    "paging": false,
    "searching": false,
    "info": false,
    ajax: {
      dataType: "json",
      url: '/pun/dev/dashboard/resources/allocations',
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

  request.onload = function () {
    const data = request.response;
    callback(data);
  }
}

function draw_utilization() {
  load_json("/pun/dev/dashboard/resources/cluster/utilization", setup_utilization_chart)
}

function setup_utilization_chart(json_data) {
  var node_util_chart = document.getElementById("node_utilization_chart").getContext('2d');
  var core_util_chart = document.getElementById("core_utilization_chart").getContext('2d');

  // {"data":[{"resource":"Nodes","used":"305","total":"317","percent":"96.21"},{"resource":"Cores","used":"6829","total":"9468","percent":"72.13"}]}
  data = json_data["data"]
  node_util_data = data[0]
  core_util_data = data[1]

  // node
  used_node = node_util_data["used"]
  total_node = node_util_data["total"]
  var node_chart = new Chart(node_util_chart, {
    type: 'pie',
    data: {
      labels: ["Used", "Free"],
      datasets: [{
        backgroundColor: [
          "#ff0000",
          "#66ff33"
        ],
        data: [used_node, total_node - used_node]
      }]
    },
    options: {
      title: {
        display: true,
        text: 'Node Utilization'
      }
    }
  });


  used_core = core_util_data["used"]
  total_core = core_util_data["total"]
  var core_chart = new Chart(core_util_chart, {
    type: 'pie',
    data: {
      labels: ["Used", "Free"],
      datasets: [{
        backgroundColor: [
          "#ffcc33",
          "#33ccff"
        ],
        data: [used_core, total_core - used_core]
      }]
    },
    options: {
      title: {
        display: true,
        text: 'Core Utilization'
      }
    }
  });
}

function setup_request_sender(request_endpoint, form_id, modal_id) {
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
        alert('Oops! Something went wrong.');
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
      dismiss_modal(modal_id);
    });
  });
}

function dismiss_modal(modal_id) {
  $(modal_id).modal('hide');
}


(() => {
  HOST_PATH = "/pun/dev/dashboard"
  SOFTWARE_REQUEST_ENDPOINT = HOST_PATH + "/request/software"
  QUOTA_REQUEST_ENDPOINT = HOST_PATH + "/request/quota"

  populate_allocations();
  setup_request_sender(SOFTWARE_REQUEST_ENDPOINT, "modalSoftwareRequestForm", "#requestSoftwareModal");
  setup_request_sender(QUOTA_REQUEST_ENDPOINT, "modalQuotaRequestForm", "#requestQuotaModal");
  draw_utilization();
})()