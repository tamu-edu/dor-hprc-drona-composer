function populate_allocations(json) {
    data = json["data"];
    $('#allocation_table').DataTable({
        "scrollY": "200px",
        "scrollCollapse": true,
        "paging": false,
        "searching": false,
        "info": false,
        "data": data,
        "columns": [
            {
                "data": "account", render: function (data, type, allocation) {
                    return `<a href="#" data-toggle="modal" data-target="#account${allocation.account}Modal">${allocation.account}</a>`
                }
            },
            { "data": "default" },
            { "data": "used_pending_su" },
            { "data": "balance" },
        ]
    });

    data.forEach((allocation) => {
        insert_account_details_modal(allocation);
    });
}

function insert_account_details_modal(allocation) {
    console.log("appending allocation modal");
    template =
        `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h4 class="modal-title">
            Allocation #${allocation.account}
          </h4>
        </div>
        <div class="modal-body">
          <table id="classTable" class="table table-bordered">
            <thead class="thead-dark">
              <tr>
                <th>Account</th>
                <th>FY</th>
                <th>Default</th>
                <th>Allocation</th>
                <th>Used and Pending</th>
                <th>Balance</th>
                <th>PI</th>
              </tr>
            </thead>
  
            <tbody>
              <tr>
                <td>${allocation.account}</td>
                <td>${allocation.fy}</td>
                <td>${allocation.default}</td>
                <td>${allocation.allocation}</td>
                <td>${allocation.used_pending_su}</td>
                <td>${allocation.balance}</td>
                <td>${allocation.pi}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" data-dismiss="modal">
            Close
          </button>
        </div>
      </div>
  </div>`

    container = document.getElementById("main-container");
    var div = document.createElement('div');
    div.setAttribute('id', `account${allocation.account}Modal`);
    div.setAttribute('class', "modal fade bs-example-modal-lg");
    div.setAttribute('tabindex', "-1");
    div.setAttribute('role', "dialog");
    div.setAttribute('aria-labelledby', "classInfo");
    div.setAttribute('aria-hidden', "true");

    div.innerHTML = template.trim();
    container.appendChild(div);
}

(() => {
    allocation_url = "/pun/dev/dashboard/resources/allocations"

    let request = new XMLHttpRequest();
    request.open('GET', allocation_url);
    request.responseType = 'json';
    request.send();

    request.onload = function () {
        const data = request.response;
        populate_allocations(data);
    }

    request.onerror = function () {
        alert("Failed to fetch your account details. Please try again later.");
    }
})()