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

function populate_job_table() {
    
}