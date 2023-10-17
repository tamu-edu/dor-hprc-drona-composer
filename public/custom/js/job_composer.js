function collect_modules_to_load() {
  var module_elems = document.getElementsByClassName("module-to-load");
  var module_list = "";
  for (let module of module_elems) {
    var module_name = module.textContent;
    // module_name = module_name.replace('(×)', "");
    module_name = module_name.trim();
    module_list += `${module_name}\t`;
  }
  // console.log(module_list);
  return module_list;
}

function calculate_walltime() {
  var days = document.getElementById("days");
  var hours = document.getElementById("hours");
  var mins = document.getElementById("mins");

  // console.log(days.value);
  // console.log(hours.value);
  // console.log(mins.value);
  if (days.value == 0 && hours.value == 0 && mins.value == 0) {
    return;
  }

  var runtime_hours = Number(days.value) * 24 + Number(hours.value);
  return `${runtime_hours}:${Number(mins.value)}:00`;
}

function submit_job(action, formData) {
  var request = new XMLHttpRequest();

  add_submission_loading_indicator();
  request.open("POST", action, true);
  request.onload = function (event) {
    remove_submission_loading_indicator();
    if (request.status == 200) {
      alert(request.responseText);
      init_job_files_table();
      load_job_table();
    } else {
      alert(`Error ${request.status}. Try again!`);
    }
  };
  request.onerror = function (event) {
    remove_submission_loading_indicator();
    alert("An error has occured. Please try again!");
  };

  request.send(formData);
}

function register_add_module_handler() {
  var add_module_button = document.getElementById("add_module_button");
  if (add_module_button == null) {
    return;
  }

  add_module_button.onclick = function (event) {
    event.preventDefault();

    let module_to_add = document.getElementById("module-search").value;

    if (module_to_add === "") {
      return;
    }

    var container = document.getElementById("module_list");
    var span = document.createElement("span");
    span.setAttribute("class", "badge badge-pill badge-primary module-to-load");
    span.innerHTML = module_to_add.trim();

    var div = document.createElement("div");
    div.appendChild(span);
    div.onclick = function (event) {
      var elem = event.target;
      elem.parentNode.removeChild(elem);
    };

    container.appendChild(div);
    document.getElementById("module-search").value = "";

    // add to run command window
    // var run_command = document.getElementById("run_command");
    // run_command.value = "module load sth\n" + run_command.value;
  };
}

// Flow for the composer

function show_module_component() {
  var module_component = document.getElementById("module-component");
  // console.log(module_component);
  module_component.style.display = "block";
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
        document.dashboard_url + "/jobs/composer/modules?query=%QUERY";
      suggestURL = suggestURL.replace("%QUERY", request.term);

      // JSONP Request
      $.ajax({
        method: "GET",
        dataType: "json",
        jsonpCallback: "jsonCallback",
        url: suggestURL,
        success: function (data) {
          response(data["data"]);
        },
      });
    },
  });
}

function register_on_file_changed_listener() {
  let file_upload = document.getElementById("executable_file_input");
  if (file_upload == null) {
    return;
  }

  file_upload.onchange = function (event) {
    let file_picker = event.target;
    var runtime_config = document.getElementById("runtime_config");
    if (runtime_config == null) {
      return;
    }

    if (file_picker.files.length === 0) {
      runtime_config.style.display = "none";
      return;
    } else {
      runtime_config.style.display = "block";
      update_run_command();
    }
  };
}

function set_run_command(command) {
  var run_cmd_input = document.getElementById("run_command");

  if (run_cmd_input == null) {
    return;
  }

  run_cmd_input.value = command;
}

function set_template(environment) {
  let template =
    document.dashboard_url + "/jobs/composer/environment/" + environment;
  fetch(template)
    .then((x) => x.text())
    .then((y) => set_run_command(y));
}

function set_run_command_placeholder(message) {
  var run_cmd_input = document.getElementById("run_command");

  if (run_cmd_input == null) {
    return;
  }
  run_cmd_input.value = "";
  run_cmd_input.placeholder = message;
}

function update_run_command() {
  var runtime_env_selector = document.getElementById("runtime_env");
  if (runtime_env_selector == null) {
    return;
  }

  // var module_component = document.getElementById("module-component");
  // module_component.style.display = "block";

  let file_picker = document.getElementById("executable_file_input");
  if (file_picker == null || file_picker.files.length === 0) {
    return;
  }
  let file_name = file_picker.files.item(0).name;

  let runtime = runtime_env_selector.value;
  // let template = document.dashboard_url + "/jobs/composer/environment/" + runtime;
  // fetch(template)
  // .then(x => x.text())
  // .then(y => console.log(y));
  // switch (runtime) {
  //     case 'shell':
  //         set_run_command(`chmod +x ${file_name} && ./${file_name}`);
  //         break;
  //     case 'python':
  //         set_run_command(`python ${file_name}`);
  //         break;
  //     case 'matlab':
  //         set_run_command(`matlabsubmit [Flags] ${file_name}`);
  //         break;
  //     case 'r':
  //             set_run_command(`r -f ${file_name}`);
  //     case 'other':
  //         // console.log("Other");
  //         set_run_command_placeholder(`Please enter your run command. Use `);
  //         break;
  //     default:
  //         console.error("Runtime nort supported error.");
  // }
  set_template(runtime);
}

function runtime_onchange() {
  let runtime = document.getElementById("runtime_env").value;
  if (runtime != "matlab") show_module_component();
  // if (runtime == "python")
  //     show_venv_component();
  set_template(runtime);
  // update_run_command();
}

function register_on_runtime_change_listener() {
  var runtime_env_selector = document.getElementById("runtime_env");
  if (runtime_env_selector == null) {
    return;
  }
  // let runtime = runtime_env_selector.value;
  runtime_env_selector.onchange = runtime_onchange;
}

function add_submission_loading_indicator() {
  var submission_section = document.getElementById("job-submit-button-section");
  if (submission_section == null) {
    return;
  }

  var spinner = document.createElement("span");
  spinner.id = "submission-loading-spinner";
  spinner.className = "spinner-border text-primary";

  submission_section.appendChild(spinner);
}

function remove_submission_loading_indicator() {
  var spinner = document.getElementById("submission-loading-spinner");
  if (spinner == null) {
    return;
  }

  spinner.remove();
}

function get_date_string(unix_time) {
  let date = new Date(unix_time * 1000);
  return date.toLocaleString();
}

function generate_file_editor_anchor(job_file_path) {
  let file_editor_path = `${document.file_editor_url}${job_file_path}`;
  return `<a type="button" class="btn btn-secondary" target="_blank" href="${file_editor_path}">Edit</a>`;
}

function delete_job_file(file_name) {
  show_global_loading_indicator();
  let delete_job_file_url =
    document.dashboard_url + "/jobs/composer/job_files/" + file_name;

  let request = new XMLHttpRequest();
  request.open("DELETE", delete_job_file_url, true);

  request.onload = function () {
    hide_global_loading_indicator();
    $("#job-file-modal").modal("toggle");
    init_job_files_table();
  };

  request.onerror = function () {
    hide_global_loading_indicator();
    alert("Failed to fetch your job file: " + file_name);
    init_job_files_table();
  };

  request.send(null);
}

function delete_job_file_action(file_name) {
  var confirmed_delete = confirm(
    `Are you sure you want to delete ${file_name}? This will remove the job file and any files associate with this job (output, executable script, etc.). Proceed with caution!`
  );
  if (confirmed_delete) {
    delete_job_file(file_name);
  }
}

function submit_job_file(file_name) {
  show_global_loading_indicator();
  let sub_job_file_url =
    document.dashboard_url + "/jobs/composer/submit/" + file_name;

  let request = new XMLHttpRequest();
  request.open("GET", sub_job_file_url, true);

  request.onload = function (event) {
    hide_global_loading_indicator();
    $("#job-file-modal").modal("toggle");
    alert(request.responseText);
    load_job_table();
  };

  request.onerror = function () {
    hide_global_loading_indicator();
    alert("Failed to submit your job file: " + file_name);
  };

  request.send(null);
}

function resubmit_job_file_action(file_name) {
  var confirmed_submit = confirm(
    `Are you sure you want to submit ${file_name}`
  );
  if (confirmed_submit) {
    submit_job_file(file_name);
  }
}

function show_job_file_detail_modal(file_name, file_path, file_last_modified) {
  console.log(
    `Call show job file details with ${
      file_name + " " + file_path + " " + file_last_modified
    }`
  );
  let template = `
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header text-light">
              <h5 class="modal-title">
                ${file_name}
              </h5>
            </div>
            <div class="modal-body">
              <ul>
                <li>Name: ${file_name}</li>
                <li>Last Modified: ${get_date_string(file_last_modified)}</li>
                <li>Location: ${file_path}</li>
              </ul>
            </div>
            <div class="modal-footer">
                <div class="btn-group" role="group">
                    <button type="button" class="btn btn-primary" onclick="resubmit_job_file_action('${file_name}')">Resubmit</button>
                    <button type="button" class="btn btn-danger" onclick="delete_job_file_action('${file_name}')">Delete</button>
                    ${generate_file_editor_anchor(file_path)}
                    <button type="button" class="btn btn-info" data-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
      </div>`;

  var container = document.getElementById("main-container");
  var div = document.createElement("div");
  div.setAttribute("id", `job-file-modal`);
  div.setAttribute("class", "modal fade bs-example-modal-lg");
  div.setAttribute("tabindex", "-1");
  div.setAttribute("role", "dialog");
  div.setAttribute("aria-labelledby", "classInfo");
  div.setAttribute("aria-hidden", "true");

  div.innerHTML = template.trim();
  container.appendChild(div);

  // show the model after built
  $(`#job-file-modal`).modal();

  // we need to clean up the model after it is dismissed
  $(`#job-file-modal`).on("hidden.bs.modal", function () {
    removeElement(`job-file-modal`);
  });
}

function show_global_loading_indicator() {
  $("#overlay").fadeIn();
}

function hide_global_loading_indicator() {
  $("#overlay").fadeOut();
}

function generate_job_file_detail_modal_anchor(job_file) {
  return `<a href="javascript:show_job_file_detail_modal('${job_file.name}', '${job_file.path}', ${job_file.last_modified})">${job_file.name}</a>`;
}

function populate_job_file_table(json) {
  $("#job_file_table").DataTable({
    data: json.data,
    destroy: true,
    scrollY: "200px",
    scrollCollapse: false,
    paging: false,
    searching: false,
    info: false,
    processing: true,
    columns: [
      {
        data: "name",
        render: function (data, type, job_file) {
          return generate_job_file_detail_modal_anchor(job_file);
        },
      },
      {
        data: "last_modified",
        render: get_date_string,
      },
    ],
    language: {
      emptyTable: "You have no job files.",
    },
  });
}

function init_job_files_table() {
  let job_files_url = document.dashboard_url + "/jobs/composer/job_files";

  let request = new XMLHttpRequest();
  request.open("GET", job_files_url);
  request.responseType = "json";

  request.onload = function () {
    const data = request.response;
    populate_job_file_table(data);
  };

  request.onerror = function () {
    alert("Failed to fetch your job file list. Please try again later.");
  };

  request.send();
}

function allow_edit_location() {
  var location_component = document.getElementById("location-path");
  if (location_component.hasAttribute("readonly") == true)
    location_component.removeAttribute("readonly");
  else location_component.setAttribute("readonly", true);
}

function testing() {
  console.log("Testing in Progress");
}

function sync_job_name() {
  console.log($("#job-name").val());
  let path = $("#location").val();
  $("#job-name").on("input", function () {
    $("#location").val(path + this.value);
  });
}

function setup_uploader_and_submit_button() {
  let slurm_form = document.getElementById("slurm-config-form");
  if (slurm_form == null) {
    return;
  }

  let inputFile = $("#fileInput");
  let inputFolder = $("#folderInput");
  let addButton = $("#addButton");
  let filesContainer = $("#myFiles");
  let files = [];

  inputFile.change(function () {
    let newFiles = [];
    for (let index = 0; index < inputFile[0].files.length; index++) {
      let file = inputFile[0].files[index];
      newFiles.push(file);
      files.push(file);
    }

    newFiles.forEach((file) => {
      let fileElement = $(`<p>${file.name}</p>`);
      fileElement.data("fileData", file);
      filesContainer.append(fileElement);

      fileElement.click(function (event) {
        let fileElement = $(event.target);
        let indexToRemove = files.indexOf(fileElement.data("fileData"));
        fileElement.remove();
        files.splice(indexToRemove, 1);
      });
    });
  });

  inputFolder.change(function () {
    let newFiles = [];
    // console.log(inputFolder);
    for (let index = 0; index < inputFolder[0].files.length; index++) {
      let file = inputFolder[0].files[index];
      newFiles.push(file);
      files.push(file);
    }

    newFiles.forEach((file) => {
      let fileElement = $(`<p>${file.webkitRelativePath}</p>`);
      fileElement.data("fileData", file);
      filesContainer.append(fileElement);

      fileElement.click(function (event) {
        let fileElement = $(event.target);
        let indexToRemove = files.indexOf(fileElement.data("fileData"));
        fileElement.remove();
        files.splice(indexToRemove, 1);
      });
    });
  });

  addButton.click(function () {
    var option = $("#mySelect").val();
    if (option == "file") {
      inputFile.click();
    } else if (option == "folder") {
      inputFolder.click();
    } else {
      alert("Please select a file or folder");
    }
  });

  // Setup Custom Submit Event
  slurm_form.onsubmit = function (event) {
    event.preventDefault();

    $("#mainscript").val($("#executable_file_input").val().split("\\").pop());

    $("<input />")
      .attr("type", "hidden")
      .attr("name", "module_list")
      .attr("value", collect_modules_to_load())
      .appendTo("#slurm-config-form");

    $("<input />")
      .attr("type", "hidden")
      .attr("name", "walltime")
      .attr("value", calculate_walltime())
      .appendTo("#slurm-config-form");
    let formData = new FormData(slurm_form);

    files.forEach((file) => {
      formData.append("files[]", file);
    });
    action = $("#slurm-config-form").prop("action");
    submit_job(action, formData);
  };
}

function setup_dynamic_form() {
  $(document).ready(function () {
    $("#runtime_env").change(function () {
      var selectedType = $(this).val();

      // Fetch the corresponding JSON file from the backend
      $.ajax({
        url: document.dashboard_url + "/jobs/composer/schema/" + selectedType,
        method: "GET",
        dataType: "json",
        success: function (data) {
          // Clear existing form fields
          $("#dynamicFieldsContainer").empty();
          //   console.log(Object.keys(data));
          //   for (field in data){
          //       for (key in field){
          //           console.log(key);
          //       }
          //   }

          // Loop through the JSON data and create form fields
          for (var i = 0; i < Object.keys(data).length; i++) {
            var field = data[Object.keys(data)[i]];

            // Create form field based on the JSON data
            var inputGroup = $("<div>");
            inputGroup.attr("class", "form-group row");

            var inputLabel = $("<label>");
            inputLabel.attr(
              "class",
              "col-lg-3 col-form-label form-control-label"
            );
            inputLabel.attr("for", field.name);
            inputLabel.text(field.name);

            var inputContainer = $("<div>");
            inputContainer.attr("class", "col-lg-9");

            var inputField = $("<input>");
            inputField.attr("class", "col-lg-9 form-control");
            inputField.attr("type", field.type);
            inputField.attr("name", field.name);
            inputField.attr("value", field.value);

            // Add the form field to the container
            inputGroup.append(inputLabel);
            inputContainer.append(inputField);
            inputGroup.append(inputContainer);
            $("#dynamicFieldsContainer").append(inputGroup);
          }
        },
        error: function () {
          console.error("Error fetching JSON data");
        },
      });
    });
  });
}

// anonymous function to sync the name of upload file with the value of hidden input

(() => {
  // setup job composer
  register_autocomplete_for_module_search();
  register_add_module_handler();
  register_on_file_changed_listener();
  register_on_runtime_change_listener();
  init_job_files_table();
  sync_job_name();
  setup_dynamic_form();
  setup_uploader_and_submit_button();
})();
