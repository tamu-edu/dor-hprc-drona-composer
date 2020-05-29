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

function register_slurm_submit_button() {
    var slurm_form = document.getElementById('slurm-config-form');
    if (slurm_form == null) {
        return;
    }
    slurm_form.onsubmit = function (event) {
        // since we don't have an input element for module list,
        // we have to add it at the end just before the user submit
        $("<input />").attr("type", "hidden")
            .attr("name", "module-list")
            .attr("value", collect_modules_to_load())
            .appendTo("#slurm-config-form");

        submit_job(slurm_form);
        event.preventDefault();
        return false;
    }
}

function submit_job(form) {
    var request = new XMLHttpRequest();

    add_submission_loading_indicator();
    request.open('POST', form.action, true);
    request.onload = function (event) {
        remove_submission_loading_indicator();
        if (request.status == 200) {
            alert(request.responseText);
            init_job_files_table();
        } else {
            alert(`Error ${request.status}. Try again!`);
        }
    }
    request.onerror = function (event) {
        remove_submission_loading_indicator();
        alert("An error has occured. Please try again!");
    }

    let data = new FormData(form);
    request.send(data);
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

        var container = document.getElementById("module-list");
        var span = document.createElement('span');
        span.setAttribute('class', "badge badge-pill badge-primary module-to-load");
        span.innerHTML = module_to_add.trim();


        var div = document.createElement('div');
        div.appendChild(span);
        div.onclick = function (event) {
            var elem = event.target;
            elem.parentNode.removeChild(elem);
        }

        container.appendChild(div);
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
            var suggestURL = document.dashboard_url + "/jobs/composer/modules?query=%QUERY";
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
    var run_cmd_input = document.getElementById('run_command');

    if (run_cmd_input == null) {
        return;
    }

    run_cmd_input.value = command;
}

function set_run_command_placeholder(message) {
    var run_cmd_input = document.getElementById('run_command');

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

    let file_picker = document.getElementById('executable_file_input');
    if (file_picker == null || file_picker.files.length === 0) {
        return;
    }
    let file_name = file_picker.files.item(0).name;

    let runtime = runtime_env_selector.value;
    switch (runtime) {
        case 'shell':
            set_run_command(`./${file_name}`);
            break;
        case 'python':
            set_run_command(`python ${file_name}`);
            break;
        case 'matlab':
            set_run_command(`matlab ${file_name}`);

            break;
        case 'other':
            // console.log("Other");
            set_run_command_placeholder(`Please enter your run command. Use `);
            break;
        default:
            console.error("Runtime nort supported error.");
    }
}

function register_on_runtime_change_listener() {
    var runtime_env_selector = document.getElementById("runtime_env");
    if (runtime_env_selector == null) {
        return;
    }
    runtime_env_selector.onchange = update_run_command;
}

function add_submission_loading_indicator() {
    var submission_section = document.getElementById("job-submit-button-section");
    if (submission_section == null) {
        return;
    }

    var spinner = document.createElement('span');
    spinner.id = 'submission-loading-spinner';
    spinner.className = 'spinner-border text-primary';

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
    let delete_job_file_url = document.dashboard_url + "/jobs/composer/job_files/" + file_name;

    let request = new XMLHttpRequest()
    request.open('DELETE', delete_job_file_url, true);

    request.onload = function () {
        hide_global_loading_indicator();
        $('#job-file-modal').modal('toggle');
        init_job_files_table();
    }

    request.onerror = function () {
        hide_global_loading_indicator();
        alert("Failed to fetch your job file: " + file_name);
        init_job_files_table();
    }

    request.send(null);
}

function delete_job_file_action(file_name) {
    var confirmed_delete = confirm(`Are you sure you want to delete ${file_name}`);
    if (confirmed_delete) {
        delete_job_file(file_name);
    }
}

function show_job_file_detail_modal(file_name, file_path, file_last_modified) {
    console.log(`Call show job file details with ${file_name + " " + file_path + " " + file_last_modified}`);
    let template =
        `
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-primary text-light">
              <h4 class="modal-title">
                ${file_name}
              </h4>
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
                    <button type="button" class="btn btn-primary">Resubmit</button>
                    <button type="button" class="btn btn-danger" onclick="delete_job_file_action('${file_name}')">Delete</button>
                    ${generate_file_editor_anchor(file_path)}
                    <button type="button" class="btn btn-info" data-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
      </div>`

    var container = document.getElementById("main-container");
    var div = document.createElement('div');
    div.setAttribute('id', `job-file-modal`);
    div.setAttribute('class', "modal fade bs-example-modal-lg");
    div.setAttribute('tabindex', "-1");
    div.setAttribute('role', "dialog");
    div.setAttribute('aria-labelledby', "classInfo");
    div.setAttribute('aria-hidden', "true");

    div.innerHTML = template.trim();
    container.appendChild(div);

    // show the model after built
    $(`#job-file-modal`).modal();

    // we need to clean up the model after it is dismissed
    $(`#job-file-modal`).on('hidden.bs.modal', function () {
        removeElement(`job-file-modal`);
    });
}

function show_global_loading_indicator() {
    $('#overlay').fadeIn();
}

function hide_global_loading_indicator() {
    $('#overlay').fadeOut();
}

function generate_job_file_detail_modal_anchor(job_file) {
    return `<a href="javascript:show_job_file_detail_modal('${job_file.name}', '${job_file.path}', ${job_file.last_modified})">${job_file.name}</a>`;

}

function populate_job_file_table(json) {
    $("#job_file_table").DataTable({
        "data": json.data,
        "destroy": true,
        "scrollY": "200px",
        "scrollCollapse": false,
        "paging": false,
        "searching": false,
        "info": false,
        "processing": true,
        "columns": [{
            "data": "name",
            render: function (data, type, job_file) {
                return generate_job_file_detail_modal_anchor(job_file);
            }
        }, {
            "data": "last_modified",
            render: get_date_string
        }],
        "language": {
            "emptyTable": "You have no job files."
        }
    });
}

function init_job_files_table() {
    let job_files_url = document.dashboard_url + "/jobs/composer/job_files";

    let request = new XMLHttpRequest()
    request.open('GET', job_files_url);
    request.responseType = 'json';

    request.onload = function () {
        const data = request.response;
        populate_job_file_table(data);
    }

    request.onerror = function () {
        alert("Failed to fetch your job file list. Please try again later.");
    }

    request.send();

}



(() => {
    // setup job composer 
    register_autocomplete_for_module_search();
    register_add_module_handler();
    register_slurm_submit_button();
    register_on_file_changed_listener();
    register_on_runtime_change_listener();
    init_job_files_table();
})();