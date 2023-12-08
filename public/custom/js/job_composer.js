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

function preview_job(action, formData, callback) {
  var request = new XMLHttpRequest();

  request.open("POST", action, true);
  request.onload = function (event) {
    if (request.status == 200) {
      var jobScript = request.responseText;
      callback(null, jobScript); // Pass the result to the callback
    } else {
      callback(`Error ${request.status}. Try again!`); // Pass the error to the callback
    }
  };
  request.onerror = function (event) {
    callback("An error has occurred. Please try again!"); // Pass the error to the callback
  };

  request.send(formData);
}

function register_add_module_handler(
  add_module_button,
  module_input,
  module_list
) {
  //   var add_module_button = document.getElementById("add_module_button");
  console.log("Registering add module handler");

  add_module_button.click(function (event) {
    event.preventDefault();

    let module_to_add = module_input.val();

    if (module_to_add === "") {
      return;
    }

    var container = module_list;
    var span = $("<span>", {
      class: "badge badge-pill badge-primary module-to-load",
      html: module_to_add.trim(),
    });

    var div = $("<div>").append(span);

    div.click(function (event) {
      var elem = event.target;
      $(elem).parent().remove();
    });

    container.append(div);
    module_input.val("");
  });
}

// Flow for the composer

// function show_module_component() {
//   var module_component = document.getElementById("module-component");
//   // console.log(module_component);
//   module_component.style.display = "block";
// }

function register_autocomplete_for_module_search(module_input) {
  // this setup autocomplete input box for module search
  $(module_input).autocomplete({
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
  // if (runtime != "matlab") show_module_component();
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

  let uploaderCheckbox = $("#uploaderCheckbox");
  let uploader = $("#uploader-section");
  uploaderCheckbox.change(function () {
    if (uploaderCheckbox.is(":checked")) {
      uploader.show();
    } else {
      uploader.hide();
    }
  });

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

    $("#run_command").val($("#job-script-preview").val());
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

function setup_job_script_preview() {
  $(document).ready(function () {
    $("#job-preview-button").click(function () {
      $("#job-preview-modal").modal("toggle");
      let slurm_form = document.getElementById("slurm-config-form");
      if (slurm_form == null) {
        return;
      }

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

      // change the action to preview
      action = document.dashboard_url + "/jobs/preview";

      preview_job(action, formData, function (error, jobScript) {
        if (error) {
          alert(error);
        } else {
          var jobScriptContainer = $("<textarea>");
          jobScriptContainer.attr("id", "job-script-preview");
          jobScriptContainer.attr("class", "form-control");
          jobScriptContainer.attr("rows", "20");
          jobScriptContainer.val(jobScript);
          $("#job-preview-container").empty();
          $("#job-preview-container").append(jobScriptContainer);
        }
      });
    });
  });
}

function create_input_field(field, classes) {
  var inputField = $("<input>");
  inputField.attr("class", classes);
  inputField.attr("type", field.type);
  inputField.attr("name", field.name);
  inputField.attr("value", field.value);
  return inputField;
}

function create_input_label(field, classes) {
  var inputLabel = $("<label>");
  inputLabel.attr("class", classes);
  inputLabel.attr("for", field.name);
  if (field.type == "radio") inputLabel.text(field.value);
  else inputLabel.text(field.label);
  return inputLabel;
}

function create_select_field(field, classes) {
  var selectGroup = $("<div>");
  selectGroup.attr("class", classes);

  var selectLabel = create_input_label(
    field,
    "col-lg-3 col-form-label form-control-label"
  );
  var selectContainer = $("<div>");
  selectContainer.attr("class", "col-lg-9");

  var selectField = $("<select>");
  selectField.attr("name", field.name);

  var defaultOption = $("<option>");
  defaultOption.text("Select an option");
  defaultOption.attr("disabled", true);
  defaultOption.attr("selected", true);
  selectField.append(defaultOption);

  $.each(field.options, function (key, value) {
    var option = $("<option>");
    option.attr("value", value.value);
    option.text(value.label);
    selectField.append(option);
  });

  selectContainer.append(selectField);
  selectGroup.append(selectLabel);
  selectGroup.append(selectContainer);
  return selectGroup;
}

function create_radio_group(field, classes) {
  var radioGroup = $("<div>");
  radioGroup.attr("class", classes);

  var radioGroupLabel = create_input_label(
    field,
    "col-lg-3 col-form-label form-control-label"
  );

  var radioGroupContainer = $("<div>");
  radioGroupContainer.attr("class", "col-lg-9");

  $.each(field, function (key, value) {
    if (typeof value == "object") {
      var radioContainer = $("<div>");
      radioContainer.attr("class", "form-check form-check-inline");
      var radioField = create_input_field(value, "form-check-input");
      var radioLabel = create_input_label(value, "form-check-label");
      radioContainer.append(radioField);
      radioContainer.append(radioLabel);
      radioGroupContainer.append(radioContainer);
    }
  });

  radioGroup.append(radioGroupLabel);
  radioGroup.append(radioGroupContainer);
  return radioGroup;
}

function create_module_component(label) {
  var moduleComponent = $("<div>");
  moduleComponent.attr("id", "module-component");

  var moduleSearch = $("<div>");
  moduleSearch.attr("class", "form-group row");

  var moduleLabel = $("<label>");
  moduleLabel.attr("class", "col-lg-3 col-form-label form-control-label");
  moduleLabel.attr("for", "module-search");
  moduleLabel.text(label);

  var moduleContainer = $("<div>");
  moduleContainer.attr("class", "col-lg-6 ui-widget");

  var moduleInput = $("<input>");
  moduleInput.attr("class", "form-control");
  moduleInput.attr("id", "module-search");

  var moduleButton = $("<button>");
  moduleButton.attr("type", "button");
  moduleButton.attr("class", "btn btn-primary mt-2 maroon-button");
  moduleButton.attr("id", "add_module_button");
  moduleButton.text("Add");

  moduleContainer.append(moduleInput);
  moduleContainer.append(moduleButton);
  moduleSearch.append(moduleLabel);
  moduleSearch.append(moduleContainer);

  var moduleList = $("<div>");
  moduleList.attr("id", "module_list");
  moduleList.attr("class", "row");

  register_autocomplete_for_module_search(moduleInput);
  register_add_module_handler(moduleButton, moduleInput, moduleList);

  moduleComponent.append(moduleSearch);
  moduleComponent.append(moduleList);

  return moduleComponent;
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

          // Loop through the JSON data and create form fields
          for (var i = 0; i < Object.keys(data).length; i++) {
            var field = data[Object.keys(data)[i]];
            if (field.type == "select") {
              selectField = create_select_field(field, "form-group row mt-2");
              $("#dynamicFieldsContainer").append(selectField);
            } else if (field.type == "radioGroup") {
              radioGroup = create_radio_group(field, "form-group row");
              $("#dynamicFieldsContainer").append(radioGroup);
            } else if (field.type == "module") {
              moduleComponent = create_module_component(field.label);
              $("#dynamicFieldsContainer").append(moduleComponent);
            } else {
              var inputGroup = $("<div>");
              inputGroup.attr("class", "form-group row");

              var inputLabel = create_input_label(
                field,
                "col-lg-3 col-form-label form-control-label"
              );

              var inputContainer = $("<div>");
              inputContainer.attr("class", "col-lg-9");

              var inputField = create_input_field(
                field,
                "col-lg-9 form-control"
              );

              // Add the form field to the container
              inputGroup.append(inputLabel);
              inputContainer.append(inputField);
              inputGroup.append(inputContainer);
              $("#dynamicFieldsContainer").append(inputGroup);
            }
          }
        },
        error: function () {
          console.error("Error fetching JSON data");
        },
      });
    });
  });
}

function fetchAndPopulateSubdirectories(fullPath) {
  $.ajax({
    url: document.dashboard_url + "/jobs/composer/subdirectories",
    method: "GET",
    data: { path: fullPath },
    dataType: "json",
    success: function (subDirs) {
      // Clear and populate subdirectories in a container (e.g., subdirs-container)
      var subDirsContainer = $("#subdirs-container");
      subDirsContainer.empty();

      for (var j = 0; j < subDirs.length; j++) {
        var subDir = subDirs[j];
        var subDirButton = $("<button>");
        subDirButton.attr("class", "btn btn-outline-secondary subdir-button");
        subDirButton.text(subDir);
        // Attach a click event handler to fetch subdirectories for the clicked subdirectory
        subDirButton.click(function () {
          var clickedSubDir = $(this).text();
          var newFullPath = fullPath + "/" + clickedSubDir;
          $("#currentPath").val(newFullPath);
          fetchAndPopulateSubdirectories(newFullPath); // Recursively fetch subdirectories
        });

        subDirsContainer.append(subDirButton);
      }
    },
    error: function () {
      console.error("Error fetching subdirectories");
    },
  });
}

function setup_file_picker() {
  $(document).ready(function () {
    $("#file-picker-modal").on("hidden.bs.modal", function () {
      $("#currentPath").val("");
      $("#subdirs-container").empty();
      $("#path-components button").removeClass("active");
    });

    $("#changeLocation").click(function () {
      $("#location").val($("#currentPath").val());
    });

    $("#file-picker-button").click(function () {
      $("#file-picker-modal").modal("toggle");

      $.ajax({
        url: document.dashboard_url + "/jobs/composer/mainpaths",
        method: "GET",
        dataType: "json",
        success: function (data) {
          $("#path-components").empty();
          for (var i = 0; i < Object.keys(data).length; i++) {
            var pathname = Object.keys(data)[i];
            var fullpath = data[Object.keys(data)[i]];

            var path = $("<button>");
            path.attr("class", "btn btn-outline-primary subdir-button");
            path.text(Object.keys(data)[i]);
            path.data("fullpath", fullpath);

            path.click(function () {
              // Remove the "active" class from all buttons in the same container
              $("#path-components button").removeClass("active");

              // Add the "active" class to the clicked button
              $(this).addClass("active");

              var fullPath = $(this).data("fullpath");
              $("#currentPath").val(fullPath);
              $("#subdirs-container").empty();

              fetchAndPopulateSubdirectories(fullPath);
            });

            $("#path-components").append(path);
          }
        },
        error: function () {
          console.error("Error fetching JSON data for paths");
        },
      });

      var backButton = $("#backButton");
      backButton.click(function () {
        // Navigate to the parent directory
        var fullPath = $("#currentPath").val();
        var parentPath = fullPath.substring(0, fullPath.lastIndexOf("/"));
        $("#currentPath").val(parentPath);
        fetchAndPopulateSubdirectories(parentPath);
      });
    });
  });
}

// anonymous function to sync the name of upload file with the value of hidden input

(() => {
  // setup job composer
  //   register_autocomplete_for_module_search();
  //   register_add_module_handler();
  register_on_file_changed_listener();
  register_on_runtime_change_listener();
  init_job_files_table();
  sync_job_name();
  setup_dynamic_form();
  setup_file_picker();
  setup_uploader_and_submit_button();
  setup_job_script_preview();
})();
