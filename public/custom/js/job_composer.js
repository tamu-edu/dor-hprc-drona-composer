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
        return true;
    }
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

function register_on_file_changed_listener() {
    let file_upload = document.getElementById("executable_file_input");
    if (file_upload == null) {
        return;
    }

    file_upload.onchange = function(event) {
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


(() => {
    // setup job composer 
    register_autocomplete_for_module_search();
    register_add_module_handler();
    register_slurm_submit_button();
    register_on_file_changed_listener();
    register_on_runtime_change_listener();
})();