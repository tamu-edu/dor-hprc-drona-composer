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
  XHR.open("DELETE", document.dashboard_url + `/jobs/${job_id}`);

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

function show_log_modal(job_id, log_str) {
  let template =
    `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-primary text-light">
            <h4 class="modal-title">
              Job #${job_id} Log
            </h4>
          </div>
          <div class="modal-body">
            <pre>
            ${log_str}
            </pre>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" data-dismiss="modal">Close</button>
      </div>
        </div>
    </div>`

  var container = document.getElementById("main-container");
  var div = document.createElement('div');
  div.setAttribute('id', `job-${job_id}-log-modal`);
  div.setAttribute('class', "modal fade bs-example-modal-lg");
  div.setAttribute('tabindex', "-1");
  div.setAttribute('role', "dialog");
  div.setAttribute('aria-labelledby', "classInfo");
  div.setAttribute('aria-hidden', "true");

  div.innerHTML = template.trim();
  container.appendChild(div);

  // show the model after built
  $(`#job-${job_id}-log-modal`).modal();

  // we need to clean up the model after it is dismissed
  $(`#job-${job_id}-log-modal`).on('hidden.bs.modal', function () {
    removeElement(`job-${job_id}-log-modal`);
  });
}

function removeElement(elementId) {
  // Removes an element from the document
  var element = document.getElementById(elementId);
  element.parentNode.removeChild(element);
}


function show_job_log(job_id) {
  toggle_log_loading_spinner(job_id, true);

  let n_lines = 10;
  let job_log_url = document.dashboard_url + `/jobs/${job_id}/log?n_lines=${n_lines}`;
  var req = new XMLHttpRequest();
  req.open('GET', job_log_url, true);
  req.onload = function () {
    toggle_log_loading_spinner(job_id, false);
    show_log_modal(job_id, req.response);
    // alert(req.response);
  };

  req.onerror = function () {
    toggle_log_loading_spinner(job_id, false);
    alert("Failed to load job's log. Please try again.");
  }

  req.send(null);

  console.log("Showing log for job " + job_id);
}

function toggle_log_loading_spinner(job_id, show) {
  // if the spinner present, show log button should hide and vice versa
  let spinner_id = `log-button-${job_id}-spinner`;
  var spinner = document.getElementById(spinner_id);
  if (show) {
    spinner.style.display = "block";
  } else {
    spinner.style.display = "none";
  }

  let show_log_button_id = `log-button-${job_id}`;
  var show_log_button = document.getElementById(show_log_button_id);
  if (show) {
    show_log_button.style.display = "none";
  } else {
    show_log_button.style.display = "inline";
  }
}

function init_job_table() {
  var job_table = $('#job_table').DataTable({
    "scrollY": "200px",
    "scrollCollapse": false,
    "paging": false,
    "searching": false,
    "info": false,
    "processing": true,
    "columns": [{
        "data": "id",
        render: function (data, type, job) {
          return `<a href="#" data-toggle="modal" data-target="#job${job.id}Modal">${job.id}</a>`
        }
      },
      {
        "data": "name"
      },
      {
        "data": "state"
      },
      {
        "data": null,
        render: function (data, type, job) {
          let logButton = `<a id='log-button-${job.id}' href='javascript:' onclick='show_job_log(${job.id});'>log</a>
                          <span style="display: none;" id='log-button-${job.id}-spinner' class="spinner-border" role="status"></span>`;
          return logButton
        },
      }
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
          <div class="modal-header bg-primary text-light">
            <h4 class="modal-title">
              Job #${job.id}
            </h4>
          </div>
          <div class="modal-body">
            <table class="table table-bordered">
                <thead>
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

function collect_modules_to_load() {
  var module_elems = document.getElementsByClassName("module-to-load");
  var module_list = "";
  for (let module of module_elems) {
      var module_name = module.textContent;
      module_name = module_name.replace('(×)', "");
      module_name = module_name.trim();
      module_list += `${module_name}\n`;
  }
  // console.log(module_list);
  return module_list;
}

function register_slurm_submit_button() {
  var slurm_form = document.getElementById('slurm-config-form');
  slurm_form.onsubmit = function (event) {
      // since we don't have an input element for module list,
      // we have to add it at the end just before the user submit
      $("<input />").attr("type", "hidden")
          .attr("name", "module-list")
          .attr("value", collect_modules_to_load())
          .appendTo("#slurm-config-form");
      return true;
  }
}

function register_add_module_handler() {
  var add_module_button = document.getElementById("add_module_button");
  add_module_button.onclick = function (event) {
      event.preventDefault();

      let module_to_add = document.getElementById("module-search").value;

      if (module_to_add === "") {
          return;
      }
      
      var container = document.getElementById("module-list");
      var span = document.createElement('span');
      span.setAttribute('class', "badge badge-pill badge-primary module-to-load");
      span.innerHTML = module_to_add.trim() + " (&times;)";
      span.onclick = function (event) {
          var elem = event.target;
          elem.parentNode.removeChild(elem);
      }

      container.appendChild(span);

      document.getElementById("module-search").value = "";
  }
}

function register_autocomplete_for_module_search() {
  // this setup autocomplete input box for module search
  $("#module-search").autocomplete({
      delay: 40,

      source: function (request, response) {
          // Suggest URL
          //http://api.railwayapi.com/suggest_train/trains/190/apikey/1234567892/
          // The above url did not work for me so using some existing one
          var suggestURL =
            window.location.href + "/modules?query=%QUERY";
          suggestURL = suggestURL.replace('%QUERY', request.term);

          // JSONP Request
          $.ajax({
              method: 'GET',
              dataType: 'json',
              jsonpCallback: 'jsonCallback',
              url: suggestURL,
              success: function (data) {
                  response(data['data']);
              }
          });
      }
  });
}

$(document).ready(function () {
 
});

(() => {
  let allocation_url = document.dashboard_url + "/jobs";

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

  // setup job composer 
  register_autocomplete_for_module_search();
  register_add_module_handler();
  register_slurm_submit_button();
})()