function draw_core_usage_chart(core_util_data) {
  var core_util_chart = document.getElementById("core_utilization_chart").getContext('2d');

  used_core = core_util_data["used"]
  total_core = core_util_data["total"]
  var core_chart = new Chart(core_util_chart, {
    type: 'pie',
    data: {
      labels: ["Used", "Free"],
      datasets: [{
        backgroundColor: [
          "#ffcc33",
          "#33ccff"
        ],
        data: [used_core, total_core - used_core]
      }]
    },
    options: {
      title: {
        display: true,
        text: 'Core Utilization'
      },
    }
  });
}

function show_loading_indicator(chart_id) {
  var canvas = document.getElementById(chart_id);
  var context = canvas.getContext('2d');
  var start = new Date();
  var lines = 16,
    cW = context.canvas.width,
    cH = context.canvas.height;

  var draw = function () {
    var rotation = parseInt(((new Date() - start) / 1000) * lines) / lines;
    context.save();
    context.clearRect(0, 0, cW, cH);
    context.translate(cW / 2, cH / 2);
    context.rotate(Math.PI * 2 * rotation);
    for (var i = 0; i < lines; i++) {

      context.beginPath();
      context.rotate(Math.PI * 2 / lines);
      context.moveTo(cW / 10, 0);
      context.lineTo(cW / 4, 0);
      context.lineWidth = cW / 30;
      context.strokeStyle = "rgba(255,255,255," + i / lines + ")";
      context.stroke();
    }
    context.restore();
  };
  window.setInterval(draw, 1000 / 30);
}

function draw_node_usage_chart(node_util_data) {
  var node_util_chart = document.getElementById("node_utilization_chart").getContext('2d');

  // node
  let used_node = node_util_data["used"]
  let total_node = node_util_data["total"]
  let node_chart = new Chart(node_util_chart, {
    type: 'pie',
    data: {
      labels: ["Used", "Free"],
      datasets: [{
        backgroundColor: [
          "#ff0000",
          "#66ff33"
        ],
        data: [used_node, total_node - used_node]
      }]
    },
    options: {
      title: {
        display: true,
        text: 'Node Utilization'
      }
    }
  });
}

function hide_spinner() {
  document.getElementById('chart-loading-indicator').remove();
}

function setup_utilization_chart(json_data) {
  data = json_data["data"];
  node_util_data = data[0];
  core_util_data = data[1];

  draw_core_usage_chart(core_util_data);
  draw_node_usage_chart(node_util_data);

  hide_spinner();
}

(() => {
  let request_url = "/pun/dev/dashboard/resources/cluster/utilization";
  let request = new XMLHttpRequest();
  request.open('GET', request_url);
  request.responseType = 'json';
  request.send();

  request.onload = function () {
    const data = request.response;
    setup_utilization_chart(data);
  }

  request.onerror = function () {
    alert("Can't fetch cluster usage data at this time!");
  }
})()