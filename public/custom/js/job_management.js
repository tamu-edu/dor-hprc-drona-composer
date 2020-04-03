// this file need to be loaded before the html
function kill_job(job_id) {
  const XHR = new XMLHttpRequest();

  // Define what happens on successful data submission
  XHR.addEventListener("load", function (event) {
    console.log(event.target.responseText);
    $(`#job${job_id}Modal`).modal('hide');

    // Here we reload to update our data (not efficient!!!)
    location.reload();
  });

  // Define what happens in case of error
  XHR.addEventListener("error", function (event) {
    alert('Oops! Something went wrong.');
  });

  // Set up our request
  XHR.open("DELETE", `/pun/dev/dashboard/jobs/${job_id}`);

  // The data sent is what the user provided in the form
  XHR.send();
}

function confirm_job_kill(job_id) {

  let result = confirm(`Are you sure you want to kill Job ${job_id}?`);
  if (result == true) {
    kill_job(job_id);
  }

  $(`job${job_id}Modal`).modal('hide');
}

function init_job_table() {
  var job_table = $('#job_table').DataTable({
    "scrollY": "200px",
    "scrollCollapse": false,
    "paging": false,
    "searching": false,
    "info": false,
    "processing": true,
    "columns": [
      {
        "data": "id", render: function (data, type, job) {
          return `<a href="#" data-toggle="modal" data-target="#job${job.id}Modal">${job.id}</a>`
        }
      },
      { "data": "name" },
      { "data": "state" },
    ],
    "language": {
      "emptyTable": "You have no active jobs"
    }
  });
  return job_table;
}

function populate_job_table(json, table) {
  table.clear();

  data = json["data"];
  table.rows
    .add(data)
    .draw();

  data.forEach((allocation) => {
    insert_job_details_modal(allocation);
  });
}

function insert_job_details_modal(job) {
  template =
    `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h4 class="modal-title">
              Job #${job.id}
            </h4>
          </div>
          <div class="modal-body">
            <table id="classTable" class="table table-bordered">
                <thead class="thead-dark">
                    <tr>
                        <th style="width: fit-content;">Job ID</th>
                        <th>Partition</th>
                        <th>Name</th>
                        <th>State</th>
                        <th># Cores</th>
                    </tr>
              </thead>
    
              <tbody>
                <tr>
                  <td>${job.id}</td>
                  <td>${job.partition}</td>
                  <td>${job.name}</td>
                  <td>${job.state}</td>
                  <td>${job.nodes}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-danger" onclick="confirm_job_kill('${job.id}')">Kill</button>
            <button type="button" class="btn btn-primary" data-dismiss="modal">Close</button>
      </div>
        </div>
    </div>`

  container = document.getElementById("main-container");
  var div = document.createElement('div');
  div.setAttribute('id', `job${job.id}Modal`);
  div.setAttribute('class', "modal fade bs-example-modal-lg");
  div.setAttribute('tabindex', "-1");
  div.setAttribute('role', "dialog");
  div.setAttribute('aria-labelledby', "classInfo");
  div.setAttribute('aria-hidden', "true");

  div.innerHTML = template.trim();
  container.appendChild(div);
}

(() => {
  allocation_url = "/pun/dev/dashboard/jobs"

  let request = new XMLHttpRequest();
  request.open('GET', allocation_url);
  request.responseType = 'json';
  request.send();

  var job_table = init_job_table();

  request.onload = function () {
    const data = request.response;
    populate_job_table(data, job_table);
  }

  request.onerror = function () {
    alert("Failed to fetch your jobs details. Please try again later.");
  }
})()

