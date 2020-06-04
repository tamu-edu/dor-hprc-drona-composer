function draw_core_usage_chart(core_util_data) {
  let chartCanvas =  document.getElementById("core_utilization_chart");
  if (chartCanvas == null) {
    return;
  }

  var core_util_chart = chartCanvas.getContext('2d');

  used_core = core_util_data["allocated"]
  free_core = core_util_data["idle"]
  var core_chart = new Chart(core_util_chart, {
    type: 'pie',
    data: {
      labels: ["Used", "Free"],
      datasets: [{
        backgroundColor: [
          "#FF0000",
          "#00FF00"
        ],
        data: [used_core, free_core]
      }]
    },
    options: {
      title: {
        display: true,
        text: 'Core Utilization',
        fontColor: '#500000',
        fontStyle: 'bold'
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
  let canvasElem = document.getElementById("node_utilization_chart");
  if (canvasElem == null) {
    return;
  }
  var node_util_chart = canvasElem.getContext('2d');


  // node
  let used_nodes = node_util_data["allocated"];
  let mixed_nodes = node_util_data["mixed"];
  let idle_nodes = node_util_data["idle"];
  let util_data = [used_nodes, mixed_nodes, idle_nodes];
  let node_chart = new Chart(node_util_chart, {
    type: 'pie',
    data: {
      labels: ["Allocated", "Mixed", "Idle"],
      datasets: [{
        backgroundColor: [
          "#FF0000",
          "#0000FF",
          "#00FF00",
        ],
        data: util_data
      }]
    },
    options: {
      title: {
        display: true,
        text: 'Node Utilization',
        fontColor: '#500000',
        fontStyle: 'bold'
      }
    }
  });
}

function hide_spinner() {
  let spinner = document.getElementById('chart-loading-indicator');
  if (spinner == null) {
    return;
  }
  
  document.getElementById('chart-loading-indicator').remove();
}

function setup_utilization_chart(json_data) {
  data = json_data["data"];
  
  node_util_data = data["nodes"];
  core_util_data = data["cores"];

  draw_core_usage_chart(core_util_data);
  draw_node_usage_chart(node_util_data);

  hide_spinner();
}

(() => {
  let request_url = document.dashboard_url + "/resources/cluster/utilization";
  
  var util_request = $.getJSON( request_url, { format: "json" })
  .done(function(json_data) {
    
    setup_utilization_chart(json_data);
  })
  .fail(function( jqxhr, textStatus, error) {
    console.log(jqxhr);
    var err = textStatus + ", " + error;
    console.log( "Request Failed: " + err );
  })
  .always(function() {
      // console.log( "complete" );
  });

})()