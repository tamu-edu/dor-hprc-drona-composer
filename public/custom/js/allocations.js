function populate_allocations(json, table) {
  table.clear();

  data = json["data"];
  table.rows
    .add(data)
    .draw();

  data.forEach((allocation) => {
    insert_account_details_modal(allocation);
  });
}

function insert_account_details_modal(allocation) {
  template =
    `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-primary text-light">
          <h4 class="modal-title">
            Allocation #${allocation.account}
          </h4>
        </div>
        <div class="modal-body">
          <table class="table">
            <thead>
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

function init_allocation_table() {
  var alloc_table = $('#allocation_table').DataTable({
    "scrollY": "200px",
    "scrollCollapse": true,
    "paging": false,
    "searching": false,
    "info": false,
    "processing": true,
    "columns": [{
        "data": "account","sClass":  "text-right",
        render: function (data, type, allocation) {
          return `<a href="#" data-toggle="modal" data-target="#account${allocation.account}Modal">${allocation.account}</a>`
        }
      },
      {
        "data": "default","sClass":  "text-right"
      },
      {
        "data": "allocation", "sClass":  "text-right"
      },
      {
        "data": "used_pending_su", "sClass":  "text-right"
      },
      {
        "data": "balance", "sClass":  "text-right"
      },
    ],
    "language": {
      "emptyTable": "Loading ..."
    }
  });
  return alloc_table;
}

(() => {
  allocation_url = document.dashboard_url + "/resources/allocations";

  let request = new XMLHttpRequest();
  request.open('GET', allocation_url);
  request.responseType = 'json';
  request.send();

  var alloc_table = init_allocation_table();

  request.onload = function () {
    const data = request.response;
    populate_allocations(data, alloc_table);
  }

  request.onerror = function () {
    alert("Failed to fetch your account details. Please try again later.");
  }
})()