function setup_request_form_sender(request_endpoint, form_id, modal_id) {
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

        // ...and take over its submit event.
        form.addEventListener("submit", function (event) {
            event.preventDefault();

            sendData();
            $(modal_id).modal('hide');
        });
    });
}

(() => {
    SOFTWARE_REQUEST_ENDPOINT = document.dashboard_url + "/request/software";
    setup_request_sender(SOFTWARE_REQUEST_ENDPOINT, "modalSoftwareRequestForm", "#requestSoftwareModal");
})()