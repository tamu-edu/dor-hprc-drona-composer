var fields = {};
var dependencyControl = {};

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

function calculate_walltime(days, hours, mins) {
  if (days.value == 0 && hours.value == 0 && mins.value == 0) {
    return;
  }

  var runtime_hours = Number(days.value) * 24 + Number(hours.value);
  return `${runtime_hours}:${Number(mins.value)}`;
}

function submit_job(action, formData) {
  var request = new XMLHttpRequest();

  add_submission_loading_indicator();
  request.open("POST", action, true);
  request.onload = function (event) {
    remove_submission_loading_indicator();
    if (request.status == 200) {
      alert(request.responseText);
      window.location.reload();
    } else {
      alert(`Error ${request.status}. Try again!`);
      window.location.reload();
    }
  };
  request.onerror = function (event) {
    remove_submission_loading_indicator();
    alert("An error has occured. Please try again!");
    window.location.reload();
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
    // init_job_files_table();
  };

  request.onerror = function () {
    hide_global_loading_indicator();
    alert("Failed to fetch your job file: " + file_name);
    // init_job_files_table();
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

uploadedFiles = [];

function setup_uploader_and_submit_button() {
  let slurm_form = document.getElementById("slurm-config-form");
  if (slurm_form == null) {
    return;
  }

  // let uploaderCheckbox = $("#uploaderCheckbox");
  // let uploader = $("#uploader-section");
  // uploaderCheckbox.change(function () {
  //   if (uploaderCheckbox.is(":checked")) {
  //     uploader.show();
  //   } else {
  //     uploader.hide();
  //   }
  // });

  // let inputFile = $("#fileInput");
  // let inputFolder = $("#folderInput");
  // let addButton = $("#addButton");
  // let filesContainer = $("#myFiles");
  // let files = [];

  // inputFile.change(function () {
  //   let newFiles = [];
  //   for (let index = 0; index < inputFile[0].files.length; index++) {
  //     let file = inputFile[0].files[index];
  //     newFiles.push(file);
  //     files.push(file);
  //   }

  //   newFiles.forEach((file) => {
  //     let fileElement = $(`<p>${file.name}</p>`);
  //     fileElement.data("fileData", file);
  //     filesContainer.append(fileElement);

  //     fileElement.click(function (event) {
  //       let fileElement = $(event.target);
  //       let indexToRemove = files.indexOf(fileElement.data("fileData"));
  //       fileElement.remove();
  //       files.splice(indexToRemove, 1);
  //     });
  //   });
  // });

  // inputFolder.change(function () {
  //   let newFiles = [];
  //   // console.log(inputFolder);
  //   for (let index = 0; index < inputFolder[0].files.length; index++) {
  //     let file = inputFolder[0].files[index];
  //     newFiles.push(file);
  //     files.push(file);
  //   }

  //   newFiles.forEach((file) => {
  //     let fileElement = $(`<p>${file.webkitRelativePath}</p>`);
  //     fileElement.data("fileData", file);
  //     filesContainer.append(fileElement);

  //     fileElement.click(function (event) {
  //       let fileElement = $(event.target);
  //       let indexToRemove = files.indexOf(fileElement.data("fileData"));
  //       fileElement.remove();
  //       files.splice(indexToRemove, 1);
  //     });
  //   });
  // });

  // addButton.click(function () {
  //   var option = $("#mySelect").val();
  //   if (option == "file") {
  //     inputFile.click();
  //   } else if (option == "folder") {
  //     inputFolder.click();
  //   } else {
  //     alert("Please select a file or folder");
  //   }
  // });

  // Setup Custom Submit Event
  slurm_form.onsubmit = function (event) {
    event.preventDefault();

    $("#run_command").val($("#job-script-preview").val());
    $("<input />")
      .attr("type", "hidden")
      .attr("name", "module_list")
      .attr("value", collect_modules_to_load())
      .appendTo("#slurm-config-form");

    for (let fieldName in fields) {
      let field = fields[fieldName];
      if (field.type == "time") {
        let days = document.querySelector(
          "#" + field.name + " input[name=days]"
        );
        let hours = document.querySelector(
          "#" + field.name + " input[name=hours]"
        );
        let mins = document.querySelector(
          "#" + field.name + " input[name=minutes]"
        );
        let walltime = calculate_walltime(days, hours, mins);
        $(slurm_form)
          .find("input[name=" + field.name + "]")
          .remove();
        $("<input />")
          .attr("type", "hidden")
          .attr("name", field.name)
          .attr("value", walltime)
          .appendTo("#slurm-config-form");
      }

      if (field.type == "unit") {
        let number = document.querySelector(
          "#" + field.name + " input[name=" + field.name + "_number]"
        );
        let unit = document.querySelector(
          "#" + field.name + " select[name=" + field.name + "_unit]"
        );
        let value = number.value + unit.value;
        $(slurm_form)
          .find("input[name=" + field.name + "]")
          .remove();
        $("<input />")
          .attr("type", "hidden")
          .attr("name", field.name)
          .attr("value", value)
          .appendTo("#slurm-config-form");
      }
    }

    let formData = new FormData(slurm_form);

    uploadedFiles.forEach((file) => {
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

      $(slurm_form).find("input[name=module_list]").remove();
      $("<input />")
        .attr("type", "hidden")
        .attr("name", "module_list")
        .attr("value", collect_modules_to_load())
        .appendTo("#slurm-config-form");

      for (let fieldName in fields) {
        let field = fields[fieldName];
        if (field.type == "time") {
          let days = document.querySelector(
            "#" + field.name + " input[name=days]"
          );
          let hours = document.querySelector(
            "#" + field.name + " input[name=hours]"
          );
          let mins = document.querySelector(
            "#" + field.name + " input[name=minutes]"
          );
          let walltime = calculate_walltime(days, hours, mins);
          $(slurm_form)
            .find("input[name=" + field.name + "]")
            .remove();
          $("<input />")
            .attr("type", "hidden")
            .attr("name", field.name)
            .attr("value", walltime)
            .appendTo("#slurm-config-form");
        }

        if (field.type == "unit") {
          let number = document.querySelector(
            "#" + field.name + " input[name=" + field.name + "_number]"
          );
          let unit = document.querySelector(
            "#" + field.name + " select[name=" + field.name + "_unit]"
          );
          let value = number.value + unit.value;
          $(slurm_form)
            .find("input[name=" + field.name + "]")
            .remove();
          $("<input />")
            .attr("type", "hidden")
            .attr("name", field.name)
            .attr("value", value)
            .appendTo("#slurm-config-form");
        }
      }

      let formData = new FormData(slurm_form);

      // change the action to preview
      action = document.dashboard_url + "/jobs/composer/preview";

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
  if (field.value) inputField.attr("value", field.value);
  if (field.placeholder) inputField.attr("placeholder", field.placeholder);
  if (field.min) inputField.attr("min", field.min);
  if (field.max) inputField.attr("max", field.max);
  // if (field.dependsOn)
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
  if (field.dependencyType && field.dependencyType == "master") {
    dependencyControl[field.dependencyGroup] = [];
  }
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
  if (field.dependencyType && field.dependencyType == "master") {
    selectField.on("change", function () {
      var selection = $(this).val();
      // get option matching selection
      var matchOption = field.options.find(
        (option) => option.value == selection
      );
      var dependentField = matchOption.dependFor;

      console.log("Adding: " + dependentField);
      if (!dependencyControl[field.dependencyGroup].includes(dependentField)) {
        for (
          var index = dependencyControl[field.dependencyGroup].length - 1;
          index >= 0;
          index--
        ) {
          var fieldName = dependencyControl[field.dependencyGroup][index];
          console.log("Removing: " + fieldName);
          dependencyControl[field.dependencyGroup].splice(index, 1);
          $("#" + fieldName).remove();
        }
        createdField = create_field(
          fields[dependentField],
          (ignoreDependency = true)
        );
        dependencyControl[field.dependencyGroup].push(dependentField);
        createdField.insertAfter(selectGroup);
      }
    });
  }
  selectContainer.append(selectField);
  selectGroup.append(selectLabel);
  selectGroup.append(selectContainer);
  return selectGroup;
}

function create_radio_group(field, classes) {
  if (field.dependencyType && field.dependencyType == "master") {
    dependencyControl[field.dependencyGroup] = [];
  }
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
      if (field.dependencyType && field.dependencyType == "master") {
        radioField.on("click", function () {
          if (
            !dependencyControl[field.dependencyGroup].includes(value.dependFor)
          ) {
            for (
              var index = dependencyControl[field.dependencyGroup].length - 1;
              index >= 0;
              index--
            ) {
              var fieldName = dependencyControl[field.dependencyGroup][index];
              console.log(fieldName);
              dependencyControl[field.dependencyGroup].splice(index, 1);
              $("#" + fieldName).remove();
            }
            createdField = create_field(
              fields[value.dependFor],
              (ignoreDependency = true)
            );
            dependencyControl[field.dependencyGroup].push(value.dependFor);
            createdField.insertAfter(radioGroup);
          }
        });
      }
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

function create_time_component(field) {
  var timeComponent = $("<div>");
  timeComponent.attr("class", "form-group row");

  var timeLabel = create_input_label(
    field,
    "col-lg-3 col-form-label form-control-label"
  );

  var timeContainer = $("<div>");
  timeContainer.attr("class", "col-lg-9");

  var timeGroups = $("<div>");
  timeGroups.attr("class", "input-group");
  timeGroups.attr("id", field.name);

  var days = $("<input>");
  days.attr("type", "number");
  days.attr("name", "days");
  days.attr("class", "form-control");
  days.attr("min", "0");
  days.attr("placeholder", "Days");

  var hours = $("<input>");
  hours.attr("type", "number");
  hours.attr("name", "hours");
  hours.attr("class", "form-control");
  hours.attr("min", "0");
  hours.attr("max", "23");
  hours.attr("placeholder", "Hours");

  var minutes = $("<input>");
  minutes.attr("type", "number");
  minutes.attr("name", "minutes");
  minutes.attr("class", "form-control");
  minutes.attr("min", "0");
  minutes.attr("max", "59");
  minutes.attr("placeholder", "Minutes");

  timeGroups.append(days);
  timeGroups.append(hours);
  timeGroups.append(minutes);

  timeContainer.append(timeGroups);
  timeComponent.append(timeLabel);
  timeComponent.append(timeContainer);

  return timeComponent;
}

function create_unit_component(field) {
  var unitComponent = $("<div>");
  unitComponent.attr("class", "form-group row");

  var unitLabel = create_input_label(
    field,
    "col-lg-3 col-form-label form-control-label"
  );

  var unitContainer = $("<div>");
  unitContainer.attr("class", "col-lg-9");

  var unitGroup = $("<div>");
  unitGroup.attr("class", "input-group");
  unitGroup.attr("id", field.name);

  var numberField = $("<input>");
  numberField.attr("type", "number");
  numberField.attr("name", field.name + "_number");
  numberField.attr("class", "form-control");

  var div = $("<div>");
  div.attr("class", "input-group-append");
  var unitField = $("<select>");
  unitField.attr("name", field.name + "_unit");
  $.each(field.units, function (key, value) {
    var option = $("<option>");
    option.attr("value", value.value);
    option.text(value.label);
    unitField.append(option);
  });

  unitGroup.append(numberField);
  div.append(unitField);
  unitGroup.append(div);

  unitContainer.append(unitGroup);
  unitComponent.append(unitLabel);
  unitComponent.append(unitContainer);

  return unitComponent;
}

function create_uploader(field) {
  var uploader = $("<div>");
  uploader.attr("class", "form-group row mt-2");

  var uploaderLabel = create_input_label(
    field,
    "col-lg-3 col-form-label form-control-label"
  );

  var uploaderContainer = $("<div>");
  uploaderContainer.attr("class", "col-lg-9");

  var fileTypes = $("<select>");
  fileTypes.attr("name", "mySelect");

  var defaultOption = $("<option>");
  defaultOption.attr("value", "none");
  defaultOption.text("Select an option");
  defaultOption.attr("disabled", true);
  defaultOption.attr("selected", true);

  var fileOption = $("<option>");
  fileOption.attr("value", "file");
  fileOption.text("File");

  var folderOption = $("<option>");
  folderOption.attr("value", "folder");
  folderOption.text("Folder");

  fileTypes.append(defaultOption);
  fileTypes.append(fileOption);
  fileTypes.append(folderOption);

  var fileInput = $("<input>");
  fileInput.attr("type", "file");
  fileInput.attr("style", "display: none;");
  fileInput.attr("multiple", true);

  var folderInput = $("<input>");
  folderInput.attr("type", "file");
  folderInput.attr("multiple", true);
  folderInput.attr("webkitdirectory", true);
  folderInput.attr("directory", true);
  folderInput.attr("style", "display: none;");

  var addButton = $("<button>");
  addButton.attr("type", "button");
  addButton.attr("class", "maroon-button");
  addButton.text("Add");

  var filesContainer = $("<div>");
  filesContainer.attr("class", "form-group");
  filesContainer.attr(
    "style",
    "height: 75px; border: 1px solid #ccc; font: 16px/26px Georgia, Garamond, Serif; overflow: auto;"
  );

  uploaderContainer.append(fileTypes);
  uploaderContainer.append(fileInput);
  uploaderContainer.append(folderInput);
  uploaderContainer.append(addButton);
  uploaderContainer.append(filesContainer);

  uploader.append(uploaderLabel);
  uploader.append(uploaderContainer);

  // Setup Uploader
  fileInput.change(function () {
    let newFiles = [];
    for (let index = 0; index < fileInput[0].files.length; index++) {
      let file = fileInput[0].files[index];
      newFiles.push(file);
      uploadedFiles.push(file);
    }

    newFiles.forEach((file) => {
      let fileElement = $(`<p>${file.name}</p>`);
      fileElement.data("fileData", file);
      filesContainer.append(fileElement);

      fileElement.click(function (event) {
        let fileElement = $(event.target);
        let indexToRemove = uploadedFiles.indexOf(fileElement.data("fileData"));
        fileElement.remove();
        uploadedFiles.splice(indexToRemove, 1);
      });
    });
  });

  folderInput.change(function () {
    let newFiles = [];
    for (let index = 0; index < folderInput[0].files.length; index++) {
      let file = folderInput[0].files[index];
      newFiles.push(file);
      uploadedFiles.push(file);
    }

    newFiles.forEach((file) => {
      let fileElement = $(`<p>${file.webkitRelativePath}</p>`);
      fileElement.data("fileData", file);
      filesContainer.append(fileElement);

      fileElement.click(function (event) {
        let fileElement = $(event.target);
        let indexToRemove = uploadedFiles.indexOf(fileElement.data("fileData"));
        fileElement.remove();
        uploadedFiles.splice(indexToRemove, 1);
      });
    });
  });

  addButton.click(function () {
    var option = $(fileTypes).val();
    if (option == "file") {
      fileInput.click();
    } else if (option == "folder") {
      folderInput.click();
    } else {
      alert("Please select a file or folder");
    }
  });

  return uploader;
}

function create_picker_modal(field, endpoint) {
  var modal = $("<div>");
  modal.attr("class", "modal fade bd-example-modal-lg");
  modal.attr("id", endpoint + "-file-picker-modal-" + field.name);
  modal.attr("tabindex", "-1");
  modal.attr("role", "dialog");
  modal.attr("aria-labelledby", endpoint + "-filePickerModal");
  modal.attr("aria-hidden", "true");

  var modalDialog = $("<div>");
  modalDialog.attr("class", "modal-dialog modal-lg");

  var modalContent = $("<div>");
  modalContent.attr("class", "modal-content");

  var modalHeader = $("<div>");
  modalHeader.attr("class", "modal-header");

  var modalTitle = $("<h5>");
  modalTitle.attr("class", "modal-title");
  modalTitle.text(endpoint + " - " + field.label);

  var modalCloseButton = $("<button>");
  modalCloseButton.attr("type", "button");
  modalCloseButton.attr("class", "close");
  modalCloseButton.attr("data-dismiss", "modal");
  modalCloseButton.attr("aria-label", "Close");

  var modalCloseButtonSpan = $("<span>");
  modalCloseButtonSpan.attr("aria-hidden", "true");
  modalCloseButtonSpan.html("&times;");
  modalCloseButton.append(modalCloseButtonSpan);

  modalHeader.append(modalTitle);
  modalHeader.append(modalCloseButton);

  var modalBody = $("<div>");
  modalBody.attr("class", "modal-body");

  var div = $("<div>");
  div.attr("class", "form-group");

  var label = $("<label>");
  label.text(field.label + " - " + endpoint);

  var currentPath = $("<input>");
  currentPath.attr("type", "text");
  currentPath.attr("class", "form-control");
  if (endpoint == "local") currentPath.attr("placeholder", "/");
  currentPath.attr("readonly", true);

  div.append(label);
  div.append(currentPath);

  var pathComponents = $("<div>");

  var subDirsContainer = $("<div>");

  modalBody.append(div);
  modalBody.append(pathComponents);
  modalBody.append(subDirsContainer);

  var modalFooter = $("<div>");
  modalFooter.attr("class", "modal-footer");

  var container = $("<div>");
  container.attr("class", "container");
  var row = $("<div>");
  row.attr("class", "row");
  var col6_1 = $("<div>");
  col6_1.attr("class", "col-6");
  var col6_2 = $("<div>");
  col6_2.attr("class", "col-6 text-left");

  var backButton = $("<button>");
  backButton.attr("class", "btn btn-outline-secondary");
  backButton.text("Previous");
  col6_1.append(backButton);

  var saveChange = $("<button>");
  saveChange.attr("class", "btn btn-primary");
  saveChange.text("Save Changes");
  var close = $("<button>");
  close.attr("class", "btn btn-secondary");
  close.attr("data-dismiss", "modal");
  close.text("Close");
  col6_2.append(saveChange);
  col6_2.append(close);

  row.append(col6_1);
  row.append(col6_2);
  container.append(row);
  modalFooter.append(container);

  modalContent.append(modalHeader);
  modalContent.append(modalBody);
  modalContent.append(modalFooter);
  modalDialog.append(modalContent);
  modal.append(modalDialog);

  return [
    modal,
    currentPath,
    subDirsContainer,
    pathComponents,
    saveChange,
    backButton,
  ];
}

function create_file_picker(field) {
  var remote = create_picker_modal(field, "remote");
  var local = create_picker_modal(field, "local");

  // Form Field
  var formGroup = $("<div>");
  formGroup.attr("class", "form-group row");

  var formLabel = $("<label>");
  formLabel.attr("class", "col-lg-3 col-form-label form-control-label");
  formLabel.text(field.label);

  var formContainer = $("<div>");
  formContainer.attr("class", "col-lg-9");
  formContainer.css("display", "flex");

  var formInput = $("<input>");
  formInput.attr("type", "text");
  formInput.attr("class", "form-control");
  formInput.attr("name", field.name);
  formInput.attr("readonly", true);

  var remoteButton = $("<button>");
  remoteButton.attr("type", "button");
  remoteButton.attr("id", "remote-button-" + field.name);
  remoteButton.attr("class", "btn btn-primary maroon-button");
  remoteButton.attr("style", "margin-left: 5px;");
  if (field.remoteLabel) remoteButton.text(field.remoteLabel);
  else remoteButton.text("Remote");

  var localButton = $("<button>");
  localButton.attr("type", "button");
  localButton.attr("id", "local-button-" + field.name);
  localButton.attr("class", "btn btn-primary maroon-button");
  localButton.attr("style", "margin-left: 5px;");
  if (field.localLabel) localButton.text(field.localLabel);
  else localButton.text("Local");

  formContainer.append(remoteButton);
  formContainer.append(localButton);
  formContainer.append(formInput);
  formGroup.append(formLabel);
  formGroup.append(formContainer);

  setup_file_picker(remote, local, formInput, remoteButton, localButton);

  return [formGroup, remote[0], local[0]];
}

function create_field(field, ignoreDependency) {
  if (
    ignoreDependency == false &&
    field.dependencyType &&
    field.dependencyType == "slave"
  ) {
    return;
  }

  if (field.type == "select") {
    selectField = create_select_field(field, "form-group row mt-2");
    return selectField;
  } else if (field.type == "radioGroup") {
    radioGroup = create_radio_group(field, "form-group row");
    return radioGroup;
  } else if (field.type == "module") {
    moduleComponent = create_module_component(field.label);
    return moduleComponent;
  } else if (field.type == "time") {
    timeComponent = create_time_component(field);
    return timeComponent;
  } else if (field.type == "unit") {
    unitComponent = create_unit_component(field);
    return unitComponent;
  } else if (field.type == "uploader") {
    uploader = create_uploader(field);
    return uploader;
  } else if (field.type == "picker") {
    filePicker = create_file_picker(field);
    return filePicker;
  } else {
    var inputGroup = $("<div>");
    inputGroup.attr("class", "form-group row");
    inputGroup.attr("id", field.name);

    var inputLabel = create_input_label(
      field,
      "col-lg-3 col-form-label form-control-label"
    );

    var inputContainer = $("<div>");
    inputContainer.attr("class", "col-lg-9");

    var inputField = create_input_field(field, "col-lg-9 form-control");

    // Add the form field to the container
    inputGroup.append(inputLabel);
    inputContainer.append(inputField);
    inputGroup.append(inputContainer);
    return inputGroup;
  }
}

function setup_dynamic_form() {
  $(document).ready(function () {
    // var fields = {};
    $("#runtime_env").change(function () {
      var selectedType = $(this).val();

      // Fetch the corresponding JSON file from the backend
      $.ajax({
        url: document.dashboard_url + "/jobs/composer/schema/" + selectedType,
        method: "GET",
        dataType: "json",
        success: function (data) {
          fields = data;
          // Clear existing form fields
          $("#dynamicFieldsContainer").empty();
          $("#dynamicModalContainer").empty();

          // Loop through the JSON data and create form fields
          // for (var i = 0; i < Object.keys(data).length; i++) {
          for (var fieldname in fields) {
            // var field = data[Object.keys(data)[i]];
            // console.log(fieldname);
            var field = fields[fieldname];

            if (field.type == "picker") {
              [createdField, remoteModal, localModal] = create_field(
                field,
                (ignoreDependency = false)
              );
              $("#dynamicModalContainer").append(remoteModal);
              $("#dynamicModalContainer").append(localModal);
              $("#dynamicFieldsContainer").append(createdField);
            } else {
              createdField = create_field(field, (ignoreDependency = false));
              $("#dynamicFieldsContainer").append(createdField);
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

function printFields() {
  console.log(fields);
}
function printDependencyControl() {
  console.log(dependencyControl);
}

function fetchAndPopulateSubdirectories(
  fullPath,
  currentPath,
  subDirsContainer,
  endpoint
) {
  if (endpoint == "local") {
    $.ajax({
      url: document.dashboard_url + "/jobs/composer/subdirectories",
      method: "GET",
      data: { path: fullPath },
      dataType: "json",
      success: function (response) {
        // Clear and populate subdirectories in a container (e.g., subdirs-container)
        subDirs = response.subdirectories;
        subFiles = response.subfiles;
        subDirsContainer.empty();

        for (var j = 0; j < subDirs.length; j++) {
          var subDir = subDirs[j];
          var subDirButton = $("<button>");
          subDirButton.attr("class", "btn btn-outline-primary subdir-button");
          subDirButton.text(subDir);
          // Attach a click event handler to fetch subdirectories for the clicked subdirectory
          subDirButton.click(function () {
            var clickedSubDir = $(this).text();
            var newFullPath = fullPath + "/" + clickedSubDir;
            $(currentPath).val(newFullPath);
            fetchAndPopulateSubdirectories(
              newFullPath,
              currentPath,
              subDirsContainer,
              endpoint
            ); // Recursively fetch subdirectories
          });
          subDirsContainer.append(subDirButton);
        }

        for (var j = 0; j < subFiles.length; j++) {
          var subFile = subFiles[j];
          var subFileButton = $("<button>");
          subFileButton.attr(
            "class",
            "btn btn-outline-secondary subdir-button"
          );
          subFileButton.text(subFile);
          // Attach a click event handler to fetch subdirectories for the clicked subdirectory
          subFileButton.click(function () {
            var clickedSubFile = $(this).text();
            var newFullPath = fullPath + "/" + clickedSubFile;
            $(currentPath).val(newFullPath);
          });
          subDirsContainer.append(subFileButton);
        }
      },
      error: function () {
        console.error("Error fetching subdirectories");
      },
    });
  } else if (endpoint == "remote") {
    let paths = construct_remote_path();
    let current = fetch_path(paths, fullPath);
    subDirsContainer.empty();
    let keys = Object.keys(current);
    for (let i in keys) {
      if (keys[i] === "type") {
        continue;
      }
      let subDir = keys[i];
      let subDirButton = $("<button>");
      if (current[subDir].type === "directory") {
        subDirButton.attr("class", "btn btn-outline-primary subdir-button");
      } else {
        subDirButton.attr("class", "btn btn-outline-secondary subdir-button");
      }
      subDirButton.text(subDir);
      // Attach a click event handler to fetch subdirectories for the clicked subdirectory
      subDirButton.click(function () {
        let clickedSubDir = $(this).text();
        let newFullPath = fullPath + "/" + clickedSubDir;
        $(currentPath).val(newFullPath);
        fetchAndPopulateSubdirectories(
          newFullPath,
          currentPath,
          subDirsContainer,
          endpoint
        ); // Recursively fetch subdirectories
      });
      subDirsContainer.append(subDirButton);
    }
  }
}

function construct_remote_path() {
  // create nested json for paths
  let paths = { type: "directory" };
  for (let i in uploadedFiles) {
    let file = uploadedFiles[i];
    let path = file.webkitRelativePath.split("/");
    let current = paths;
    for (let j in path) {
      if (j == path.length - 1) {
        // If file is at root, set key to "File"
        let key = path[j] === "" ? file.name : path[j];
        current[key] = { type: "file" };
      } else {
        if (current[path[j]] === undefined) {
          current[path[j]] = { type: "directory" };
        }
        current = current[path[j]];
      }
    }
  }
  return paths;
}

function fetch_path(paths, path) {
  if (path === "") {
    return paths;
  }
  node = path.split("/");
  let keys = Object.keys(paths);
  for (let i in keys) {
    if (keys[i] === node[0]) {
      if (node.length === 1) {
        return paths[keys[i]];
      } else {
        return fetch_path(paths[keys[i]], node.slice(1).join("/"));
      }
    }
  }
}

function setup_file_picker(
  remote,
  local,
  formInput,
  remoteButton,
  localButton
) {
  [
    remoteModal,
    remoteCurrentPath,
    remoteSubDirsContainer,
    remotePathComponents,
    remoteSaveChange,
    remoteBackButton,
  ] = remote;
  [
    localModal,
    localCurrentPath,
    localSubDirsContainer,
    localPathComponents,
    localSaveChange,
    localBackButton,
  ] = local;

  $(remoteSaveChange).click(
    (function (formInput, CurrentPath, modal) {
      return function () {
        $(formInput).val($(CurrentPath).val());
        $(modal).modal("toggle");
      };
    })(formInput, remoteCurrentPath, remoteModal)
  );

  $(localSaveChange).click(
    (function (formInput, CurrentPath, modal) {
      return function () {
        $(formInput).val($(CurrentPath).val());
        $(modal).modal("toggle");
      };
    })(formInput, localCurrentPath, localModal)
  );

  $(localButton).click(
    (function (
      localModal,
      localCurrentPath,
      localSubDirsContainer,
      localPathComponents,
      localBackButton
    ) {
      return function () {
        $(localModal).modal("toggle");
        $.ajax({
          url: document.dashboard_url + "/jobs/composer/mainpaths",
          method: "GET",
          dataType: "json",
          success: function (data) {
            $(localPathComponents).empty();
            for (var i = 0; i < Object.keys(data).length; i++) {
              var pathname = Object.keys(data)[i];
              var fullpath = data[Object.keys(data)[i]];

              var path = $("<button>");
              path.attr("class", "btn btn-primary subdir-button");
              path.text(Object.keys(data)[i]);
              path.data("fullpath", fullpath);

              path.click(function () {
                // Remove the "active" class from all buttons in the same container
                $(localPathComponents).find("button").removeClass("active");

                // Add the "active" class to the clicked button
                $(this).addClass("active");

                var fullPath = $(this).data("fullpath");
                $(localCurrentPath).val(fullPath);
                $(localSubDirsContainer).empty();

                fetchAndPopulateSubdirectories(
                  fullPath,
                  localCurrentPath,
                  localSubDirsContainer,
                  "local"
                );
              });

              $(localPathComponents).append(path);
            }
          },
          error: function () {
            console.error("Error fetching JSON data for paths");
          },
        });

        localBackButton.click(function () {
          // Navigate to the parent directory
          var fullPath = $(localCurrentPath).val();
          var parentPath = fullPath.substring(0, fullPath.lastIndexOf("/"));
          $(localCurrentPath).val(parentPath);
          fetchAndPopulateSubdirectories(
            parentPath,
            localCurrentPath,
            localSubDirsContainer,
            "local"
          );
        });
      };
    })(
      localModal,
      localCurrentPath,
      localSubDirsContainer,
      localPathComponents,
      localBackButton
    )
  );

  $(remoteButton).click(
    (function (
      remoteModal,
      remoteCurrentPath,
      remoteSubDirsContainer,
      remotePathComponents,
      remoteBackButton
    ) {
      return function () {
        $(remoteModal).modal("toggle");
        let paths = construct_remote_path();
        $(remotePathComponents).empty();
        for (var i = 0; i < Object.keys(paths).length; i++) {
          var fullpath = Object.keys(paths)[i];

          if (fullpath === "type") {
            continue;
          }
          var path = $("<button>");
          if (paths[fullpath].type === "directory") {
            path.attr("class", "btn btn-primary subdir-button");
          } else {
            path.attr("class", "btn btn-outline-secondary subdir-button");
          }
          path.text(Object.keys(paths)[i]);
          path.data("fullpath", fullpath);

          path.click(function () {
            // Remove the "active" class from all buttons in the same container
            $(remotePathComponents).find("button").removeClass("active");

            // Add the "active" class to the clicked button
            $(this).addClass("active");

            var fullPath = $(this).data("fullpath");
            $(remoteCurrentPath).val(fullPath);
            $(remoteSubDirsContainer).empty();

            fetchAndPopulateSubdirectories(
              fullPath,
              remoteCurrentPath,
              remoteSubDirsContainer,
              "remote"
            );
          });

          $(remotePathComponents).append(path);
        }
        remoteBackButton.click(function () {
          // Navigate to the parent directory
          var fullPath = $(remoteCurrentPath).val();
          var parentPath = fullPath.substring(0, fullPath.lastIndexOf("/"));
          if (parentPath === "") {
            return;
          }
          console.log(fullPath);
          console.log(parentPath);
          $(remoteCurrentPath).val(parentPath);
          fetchAndPopulateSubdirectories(
            parentPath,
            remoteCurrentPath,
            remoteSubDirsContainer,
            "remote"
          );
        });
      };
    })(
      remoteModal,
      remoteCurrentPath,
      remoteSubDirsContainer,
      remotePathComponents,
      remoteBackButton
    )
  );
}

// function setup_file_picker() {
//   $(document).ready(function () {
//     $("#file-picker-modal").on("hidden.bs.modal", function () {
//       $("#currentPath").val("");
//       $("#subdirs-container").empty();
//       $("#path-components button").removeClass("active");
//     });

//     $("#changeLocation").click(function () {
//       $("#location").val($("#currentPath").val());
//     });

//     $("#file-picker-button").click(function () {
//       $("#file-picker-modal").modal("toggle");

//       $.ajax({
//         url: document.dashboard_url + "/jobs/composer/mainpaths",
//         method: "GET",
//         dataType: "json",
//         success: function (data) {
//           $("#path-components").empty();
//           for (var i = 0; i < Object.keys(data).length; i++) {
//             var pathname = Object.keys(data)[i];
//             var fullpath = data[Object.keys(data)[i]];

//             var path = $("<button>");
//             path.attr("class", "btn btn-primary subdir-button");
//             path.text(Object.keys(data)[i]);
//             path.data("fullpath", fullpath);

//             path.click(function () {
//               // Remove the "active" class from all buttons in the same container
//               $("#path-components button").removeClass("active");

//               // Add the "active" class to the clicked button
//               $(this).addClass("active");

//               var fullPath = $(this).data("fullpath");
//               $("#currentPath").val(fullPath);
//               $("#subdirs-container").empty();

//               fetchAndPopulateSubdirectories(fullPath);
//             });

//             $("#path-components").append(path);
//           }
//         },
//         error: function () {
//           console.error("Error fetching JSON data for paths");
//         },
//       });

//       var backButton = $("#backButton");
//       backButton.click(function () {
//         // Navigate to the parent directory
//         var fullPath = $("#currentPath").val();
//         var parentPath = fullPath.substring(0, fullPath.lastIndexOf("/"));
//         $("#currentPath").val(parentPath);
//         fetchAndPopulateSubdirectories(parentPath);
//       });
//     });
//   });
// }

// anonymous function to sync the name of upload file with the value of hidden input

(() => {
  // setup job composer
  //   register_autocomplete_for_module_search();
  //   register_add_module_handler();
  register_on_file_changed_listener();
  register_on_runtime_change_listener();
  // init_job_files_table();
  sync_job_name();
  setup_dynamic_form();
  // setup_file_picker();
  setup_uploader_and_submit_button();
  setup_job_script_preview();
})();
