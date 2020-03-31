function populate_allocations(json) {
  data = json["data"];
  $('#allocation_table').DataTable({
    "scrollY": "200px",
    "scrollCollapse": true,
    "paging": false,
    "searching": false,
    "info": false,
    "data": data,
    "columns": [
      {
        "data": "account", render: function (data, type, allocation) {
          return `<a href="#" data-toggle="modal" data-target="account${allocation.account}Modal">${allocation.account}</a>`
        }
      },
      // { "data": "fy" },
      { "data": "default" },
      // { "data": "allocation" },
      { "data": "used_pending_su" },
      { "data": "balance" },
      // { "data": "pi"}
    ]
  });

  data.forEach((allocation) =>  {
    insert_account_details_modal(allocation);
  });
}

function insert_account_details_modal(allocation) {
  console.log("appending allocation modal");
  template = 
  `
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h4 class="modal-title">
          ${allocation.account}
        </h4>
      </div>
      <div class="modal-body">
        <table id="classTable" class="table table-bordered">
          <thead class="thead-dark">
            <tr>
              <th>Account</th>
              <th>FY</th>
              <th>Default</th>
              <th>Allocation</th>
              <th>Used and Pending</th>
              <th>Balance</th>
              <th>PI</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>${allocation.account}</td>
              <td>${allocation.fy}</td>
              <td>${allocation.default}</td>
              <td>${allocation.allocation}</td>
              <td>${allocation.used_pending_su}</td>
              <td>${allocation.balance}</td>
              <td>${allocation.pi}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-danger" onclick="confirm_job_kill('<%= job.id %>')">Kill</button>
        <button type="button" class="btn btn-primary" data-dismiss="modal">
          Close
        </button>
      </div>
    </div>
</div>`

  container = document.getElementById("main-container");
  var div = document.createElement('div');
  div.setAttribute('id', `account${allocation.account}Modal`);
  div.setAttribute('class', "modal fade bs-example-modal-lg");
  div.setAttribute('tabindex', "-1" );
  div.setAttribute('role', "dialog");
  div.setAttribute('aria-labelledby', "classInfo");
  div.setAttribute('aria-hidden', "true");

  div.innerHTML = template.trim();
  container.appendChild(div);
}

function populate_quota() {
  $('#quota_table').DataTable({
    "scrollY": "200px",
    "scrollCollapse": true,
    "paging": false,
    "searching": false,
    "info": false,
    "ordering": false,
    ajax: {
      dataType: "json",
      url: '/pun/dev/dashboard/resources/disk/quota',
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
  AlLOCATION_ENDPOINT = HOST_PATH + "/resources/allocations"


  load_json(AlLOCATION_ENDPOINT, populate_allocations);
  setup_request_sender(SOFTWARE_REQUEST_ENDPOINT, "modalSoftwareRequestForm", "#requestSoftwareModal");
  setup_request_sender(QUOTA_REQUEST_ENDPOINT, "modalQuotaRequestForm", "#requestQuotaModal");
  draw_utilization();
  populate_quota();
})()