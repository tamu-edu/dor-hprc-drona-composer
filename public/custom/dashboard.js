function populate_allocations() {
    $('#allocation_table').DataTable({
        "scrollY": "200px",
        "scrollCollapse": true,
        "paging": false,
        ajax: {
            dataType: "json",
            url: '/pun/dev/dashboard/allocations.json',
            method: "GET",
         },
        "columns": [
            { "data": "account" },
            { "data": "fy" },
            { "data": "default" },
            { "data": "allocation" },
            { "data": "used_pending_su" },
            { "data": "balance" },
            { "data": "pi"}
        ]
    });
}

function load_json(request_url) {
    let request = new XMLHttpRequest();
    request.open('GET', request_url);
    request.responseType = 'json';
    request.send();

    request.onload = function() {
        const data = request.response;
        console.log(data);
    }
}

(() => {
    populate_allocations();
})()