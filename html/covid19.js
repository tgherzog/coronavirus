
chartColors = {
    red: 'rgb(255, 99, 132)',
    orange: 'rgb(255, 159, 64)',
    yellow: 'rgb(255, 205, 86)',
    green: 'rgb(75, 192, 192)',
    blue: 'rgb(54, 162, 235)',
    purple: 'rgb(153, 102, 255)',
    grey: 'rgb(201, 203, 207)'
};

// inspired by http://godsnotwheregodsnot.blogspot.com/2012/09/color-distribution-methodology.html
moreChartColors = [
"#1CE6FF", "#FF34FF", "#FF4A46", "#008941", "#006FA6", "#A30059",
"#7A4900", "#0000A6", "#63FFAC", "#B79762", "#004D43", "#8FB0FF", "#997D87",
"#5A0007", "#809693", "#1B4400", "#4FC601", "#3B5DFF", "#4A3B53", "#FF2F80",
"#61615A", "#BA0900", "#6B7900", "#00C2A0", "#FFAA92", "#FF90C9", "#B903AA", "#D16100",
"#000035", "#7B4F4B", "#A1C299", "#300018", "#0AA6D8", "#013349", "#00846F",
"#372101", "#FFB500", "#A079BF", "#CC0744", "#C0B9B2", "#001E09",
"#00489C", "#6F0062", "#0CBD66", "#456D75", "#B77B68", "#7A87A1", "#788D66",
"#885578", "#FF8A9A", "#D157A0", "#BEC459", "#456648", "#0086ED", "#886F4C",
"#34362D", "#B4A8BD", "#00A6AA", "#452C2C", "#636375", "#A3C8C9", "#FF913F", "#938A81",
"#575329", "#B05B6F", "#8CD0FF", "#3B9700", "#C8A1A1", "#1E6E00",
"#7900D7", "#A77500", "#6367A9", "#A05837", "#6B002C", "#772600", "#D790FF", "#9B9700",
"#549E79", "#201625", "#72418F", "#BC23FF", "#99ADC0", "#3A2465", "#922329",
"#5B4534", "#404E55", "#0089A3", "#CB7E98", "#A4E804", "#324E72", "#6A3A4C",
"#000000",
];

trendLen = 7; // also some static labels in the HTML that need to match any changes here

panes = [false, false, false, false];
formatters = {
    rank: function(items, data) {
        var n = items[0].index + 1;
        var x = n % 10;

        if( n >= 10 && n <= 20 ) {
            return n.toString() + 'th';
        }

        switch(x) {
            case 1:
                return n.toString() + 'st';
                break;
            case 2:
                return n.toString() + 'nd';
                break;
            case 3:
                return n.toString() + 'rd';
                break;
            default:
                return n.toString() + 'th';
                break;
        }
    },
    title: function(items, data, offset) {
        var state_name = items[0].xLabel;
        var total = 0;
        items.forEach(function(item) {
          total += item.yLabel;
        });

        return state_name + ': ' + formatCaseValue(total, offset, 3);
    },
    label: function(item, data, offset) {
      var label = data.datasets[item.datasetIndex].label || '', value = undefined;
      if( offset == 4 ) {
        var type = config[4].settings.type;
        if( type == 'cfr' ) {
            value = (item.yLabel*100).toFixed(2) + '%';
        }
        else if( type == 'avg_growth' ) {
            value = formatCaseValue(item.yLabel.toFixed(2), offset, 3);
        }
      }

      if( value == undefined ) {
        value = formatCaseValue(item.yLabel, offset, 3);
      }

      return label + ': ' + value;
    },
    pct_label: function(item) {
        if( typeof(item) == 'object' ) {
          item = item.yLabel;
        }

        return (item*100).toFixed(2) + '%';
    }
};

function capitalize(str) {

    return str[0].toUpperCase() + str.slice(1);
}

function slope(data) {

  var yArray = data.slice(-trendLen-1);
  var i, n = yArray.length-1;
  var sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for(var i=0;i<n;i++) {
    sumX += i;
    sumY += yArray[i+1] - yArray[i];
    sumXY += i * (yArray[i+1] - yArray[i]);
    sumXX += i * i;
  }

  return (n*sumXY - sumX*sumY) / (n*sumXX - sumX*sumX);
}

function addCommas(value, plus=false) {

  prefix = (plus && value > 0) ? '+' : '';
  return prefix + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatCaseValue(value, idx, points=2) {

  if( config[idx].settings.perCapita ) {
    return value.toFixed(points);
  }

  return addCommas(value);
}

config = [
  // state tab - cases line chart
  {
    type: 'line',
    data: {
      labels: [],
      datasets: []
    },
    options: {
      scales: {
        yAxes: [{
          type: 'linear',
          scaleLabel: {
            display: true,
            labelString: 'Cases'
          },
          ticks: {
            maxTicksLimit: 5,
            callback: function(value, index, values) {
              return formatCaseValue(value, 0);
            }
          }
        }]
      },
      tooltips: {
        mode: 'index', // set to 'nearest' to limit to nearest point, not the entire slice
        intersect: false, // controls whether the mouse has to be over a series or not
        itemSort: function(b, a) { return a.yLabel - b.yLabel; },
        callbacks: {
          label: function(item, data) {
            return formatters.label(item, data, 0);
          }
        }
      }
    },
    settings: {
        field: 'cases',
        cluster: 'states',
        perCapita: false,
        aggregation: 'total',
        uiContainer: '#state-table'
    },
    chart_: null
  },

  // state tab - deaths line chart
  {
    type: 'line',
    data: {
      labels: [],
      datasets: []
    },
    options: {
      scales: {
        yAxes: [{
          type: 'linear',
          scaleLabel: {
            display: true,
            labelString: 'Deaths'
          },
          ticks: {
            maxTicksLimit: 5,
            callback: function(value, index, values) {
              return formatCaseValue(value, 1);
            }
          }
        }]
      },
      tooltips: {
        mode: 'index',
        intersect: false,
        itemSort: function(b, a) { return a.yLabel - b.yLabel; },
        callbacks: {
          label: function(item, data) {
            return formatters.label(item, data, 1);
          }
        }
      }
    },
    settings: {
        field: 'deaths',
        cluster: 'states',
        perCapita: false,
        aggregation: 'total',
        uiContainer: '#state-table'
    },
    chart_: null
  },

  // top counties tab - cases line chart
  {
    type: 'line',
    data: {
      labels: [],
      datasets: []
    },
    options: {
      scales: {
        yAxes: [{
          type: 'linear',
          scaleLabel: {
            display: true,
            labelString: 'Cases'
          },
          ticks: {
            maxTicksLimit: 5,
            callback: function(value, index, values) {
              return formatCaseValue(value, 2);
            }
          }
        }]
      },
      tooltips: {
        mode: 'index', // set to 'nearest' to limit to nearest point, not the entire slice
        intersect: false, // controls whether the mouse has to be over a series or not
        itemSort: function(b, a) { return a.yLabel - b.yLabel; },
        callbacks: {
          label: function(item, data) {
            return formatters.label(item, data, 2);
          }
        }
      }
    },
    settings: {
        field: 'cases',
        cluster: 'counties',
        perCapita: false,
        aggregation: 'total',
        uiContainer: '#topcounty-table'
    },
    chart_: null
  },

  // top counties tab - deaths line chart
  {
    type: 'line',
    data: {
      labels: [],
      datasets: []
    },
    options: {
      scales: {
        yAxes: [{
          type: 'linear',
          scaleLabel: {
            display: true,
            labelString: 'Deaths'
          },
          ticks: {
            maxTicksLimit: 5,
            callback: function(value, index, values) {
              return formatCaseValue(value, 3);
            }
          }
        }]
      },
      tooltips: {
        mode: 'index',
        intersect: false,
        itemSort: function(b, a) { return a.yLabel - b.yLabel; },
        callbacks: {
          label: function(item, data) {
            return formatters.label(item, data, 3);
          }
        }
      }
    },
    settings: {
        field: 'deaths',
        cluster: 'counties',
        perCapita: false,
        aggregation: 'total',
        uiContainer: '#topcounty-table'
    },
    chart_: null
  },

  // combined chart chart on today tab
  {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Cases',
          backgroundColor: chartColors.purple,
          borderColor: 'transparent',
          data: [],
        }
      ]
    },
    options: {
      legend: { display: false },
      scales: {
        yAxes: [{
          display: true,
          stacked: false,
          type: 'linear',
          scaleLabel: {
            display: true,
            labelString: 'Cases'
          },
          ticks: {
            maxTicksLimit: 5,
            callback: function(value, index, values) {
              var type = config[4].settings.type;
              switch(type) {
                case 'cfr':
                // case 'avg_growth':
                    return formatters.pct_label(value);
              }

              return formatCaseValue(value, 4);
            }
          }
        }]
      },
      tooltips: {
        mode: 'index',
        intersect: false,
        callbacks: {
          afterTitle: formatters.rank,
          label: function(item, data) {
            return formatters.label(item, data, 4);
          }
        }
      }
    },
    settings: {
      perCapita: false,
      type: 'cases'
    },
    chart_: null
  },

  // legacy from here down
  {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Prior deaths',
          backgroundColor: chartColors.blue,
          borderColor: 'transparent',
          data: [],
        },
        {
          label: 'New deaths',
          backgroundColor: chartColors.purple,
          borderColor: 'transparent',
          data: [],
        }
      ]
    },
    options: {
      scales: {
        xAxes: [{ display: true, stacked: true }],
        yAxes: [{
          display: true,
          stacked: true,
          type: 'linear',
          scaleLabel: {
            display: true,
            labelString: 'Cases'
          },
          ticks: {
            maxTicksLimit: 5,
            callback: function(value, index, values) {
              return formatCaseValue(value, 5);
            }
          }
        }]
      },
      tooltips: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: function(items, data) {
            return formatters.title(items, data, 5);
          },
          afterTitle: formatters.rank,
          label: function(item, data) {
            return formatters.label(item, data, 1);
          }
        }
      }
    },
    settings: {
      perCapita: false
    },
    chart_: null
  },
  {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'CFR',
          backgroundColor: chartColors.green,
          borderColor: 'transparent',
          data: [],
        }
      ]
    },
    options: {
      scales: {
        yAxes: [{
          ticks: {
              callback: formatters.pct_label
          }
        }]
      },
      tooltips: {
        mode: 'index',
        intersect: false,
        callbacks: {
          afterTitle: formatters.rank,
          label: formatters.pct_label
        }
      }
    },
    settings: {
    },
    chart_: null
  },
  {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Daily Growth (3-day avg)',
          backgroundColor: chartColors.orange,
          borderColor: 'transparent',
          data: [],
        }
      ]
    },
    options: {
      scales: {
        yAxes: [{
          ticks: {
              callback: formatters.pct_label
          }
        }]
      },
      tooltips: {
        mode: 'index',
        intersect: false,
        callbacks: {
          afterTitle: formatters.rank,
          label: formatters.pct_label
        }
      }
    },
    settings: {
    },
    chart_: null
  }
];

apiRoot = 'http://cvapi.zognet.net/v2/USA/';
data = {}

function updateTodayChart() {

    var labels = [];
    var today = [];
    var offset = 4;
    var label = '';
    var pc = config[offset].settings.perCapita ? '/1,000' : '';
    for(var key in data['states']) {
        if( key != 'USA' ) {
            cases = data['states'][key]['cases'];
            deaths = data['states'][key]['deaths'];
            n = cases.length - 1;
            if( config[offset].settings.perCapita ) {
                population = data['states'][key]['population'] / 1000;
            }
            else {
                population = 1;
            }

            switch(config[offset].settings.type) {
                case 'cases':
                    obs = cases[n] / population;
                    label = 'Cases' + pc;
                    label2 = label;
                    break;
                case 'deaths':
                    obs = deaths[n] / population;
                    label = 'Deaths' + pc;
                    label2 = label;
                    break;
                case 'new_cases':
                    obs = (cases[n] - cases[n-1]) / population;
                    label = 'New Cases' + pc;
                    label2 = label;
                    break;
                case 'new_deaths':
                    obs = (deaths[n] - deaths[n-1]) / population;
                    label = 'New Deaths' + pc;
                    label2 = label;
                    break;
                case 'avg_growth':
                    obs = slope(cases);
                    label = 'Daily Trend';
                    label2 = label;
                    break;
                case 'cfr':
                    obs = deaths[n] / cases[n];
                    label = 'Case Fatality Rate';
                    label2 = 'CFR';
                    break;
            }

            today.push({label: key, value: obs});
        }
    }

    today.sort(function(b, a) { return a['value'] - b['value'] });

    config[offset].data.labels = today.map(x => x.label);
    config[offset].data.datasets[0].data = today.map(x => x.value);
    config[offset].data.datasets[0].label = label2;
    config[offset].options.scales.yAxes[0].scaleLabel.labelString = label;

    if( config[offset].settings.type == 'avg_growth' || config[offset].settings.type == 'cfr' ) {
      $('#chart0-tab input').prop('checked', false).prop('disabled', true);
      config[offset].settings.perCapita = false;
      config[offset].options.scales.yAxes[0].type = 'linear';
    }
    else {
      $('#chart0-tab input').removeAttr('disabled');
    }
}

function addTimeSeries(offset, key) {

    var type = config[offset].settings.field;
    var cluster = config[offset].settings.cluster;
    var ds = config[offset].data.datasets;
    var color = data[cluster][key]['lineColor'];
    var series = [];
    var population = 1;

    if( config[offset].settings.perCapita ) {
        population = data[cluster][key]['population'] / 1000;
    }

    // here we grab 1 prior value so we can calculate 'new' cases if necessary. Then we start indexing from 1
    var data_ = data[cluster][key][type].slice(data.dayOffset-1);
    var cases;
    for(var i=1;i<data_.length;i++) {
        cases = data_[i];
        if( config[offset].settings.aggregation == 'new' ) {
            cases = cases - data_[i-1];
        }

        series.push(cases / population);
    }

    var n = {label: key, fill: false, backgroundColor: color, borderColor: color, data: series};

    for(var i=0;i<ds.length;i++) {
        if( ds[i].label == key ) {
            return;
        }
        else if( ds[i].label > key ) {
            ds.splice(i, 0, n);
            return;
        }
    }

    ds.push(n);
}

function deleteTimeSeries(offset, key) {

    var ds = config[offset].data.datasets;

    for(var i=0;i<ds.length;i++) {
        if( ds[i].label == key ) {
            ds.splice(i, 1);
            return;
        }
    }
}

function updateTimeSeries(offset) {

    config[offset].data.datasets = [];
    $(config[offset].settings.uiContainer + ' input:checked').each(function() {
        addTimeSeries(offset, $(this).val());
    });

    var field = capitalize(config[offset].settings.aggregation) + ' ' + capitalize(config[offset].settings.field);
    if( config[offset].settings.perCapita ) {
        field = field + '/1,000';
    }

    config[offset].options.scales.yAxes[0].scaleLabel.labelString = field;
}

function updateBadges(state, caseID, deathsID) {

    var cases = data['states'][state]['cases'];
    var deaths = data['states'][state]['deaths'];
    var n = cases.length;

    $(caseID).find('.total').text(addCommas(cases[n-1]));
    $(caseID).find('.new').text(addCommas(cases[n-1] - cases[n-2], true));
    $(caseID).find('.trend').text(addCommas(slope(cases).toFixed(0), true));

    $(deathsID).find('.total').text(addCommas(deaths[n-1]));
    $(deathsID).find('.new').text(addCommas(deaths[n-1] - deaths[n-2], true));
    $(deathsID).find('.trend').text(addCommas(slope(deaths).toFixed(0), true));
}

function updateState(state) {

    updateBadges(state, '#banner-state-cases', '#banner-state-deaths');

    var code = data['states'][state]['code'];
    $.get(apiRoot + code + '.json', function(rows) {
        $table = $('#county-table').DataTable();
        $table.clear();
        for(var i=0;i<rows.length;i++) {
            $table.row.add([ rows[i]['name'], rows[i]['cases'], rows[i]['new_cases'], rows[i]['avg_growth'], rows[i]['deaths'], rows[i]['new_deaths'] ]);
        }

        $table.draw();
    });
}

function initialize() {

    $.get(apiRoot + 'USA.json', function(data_) {
        data = data_;

        qs = new Querystring();
        trendLen = qs.get('trend', 14);
        $('.trendlen').text(trendLen.toString());

        // ignore dates that have less than 25 cases, which just happens to be all of February
        data.dayOffset = 0;
        while( data.dayOffset < data['states']['USA']['cases'].length && data['states']['USA']['cases'][data.dayOffset] < 25 )
            data.dayOffset++;

        var i = 0, stats = {}, case_list = [];
        var default_state = 'Virginia';
        $table = $('#state-table').DataTable();
        for(var key in data['states']) {
            // assign constant chart colors for states
            data['states'][key]['lineColor'] = moreChartColors[i++];
            
            var cases = data['states'][key]['cases'];
            var deaths = data['states'][key]['deaths'];
            var n = cases.length - 1;
            var code = data['states'][key]['code']

            stats.cases = cases[n];
            stats.deaths = deaths[n];
            stats.new_cases = stats.cases - cases[n-1];
            stats.new_deaths = stats.deaths - deaths[n-1];
            stats.avg_growth = slope(cases).toFixed(2);

            var chk_name = 'chk-state-' + code;
            $chk = $('<input type="checkbox"/>').val(key).attr('name', chk_name).attr('id', chk_name).addClass('form-check-input');
            var row = $table.row.add([code, $chk.prop('outerHTML'), key, stats.cases, stats.new_cases, stats.avg_growth, stats.deaths, stats.new_deaths]).node();
            if( key == 'USA' ) {
                $(row).addClass('aggregate');
            }
            else {
                case_list.push({code: code, cases: stats.cases});
                var st_label = key;
                if( code == 'DC' ) {
                    st_label = code;
                }

                $opt = $('<option/>').val(key).attr('selected', key == default_state).text(key);
                $('#state-detail-select').append($opt);
            }
        }

        $table.draw();
        $('#state-table input').click(function(event) {
            if( this.checked ) {
                addTimeSeries(0, $(this).val());
                addTimeSeries(1, $(this).val());
            }
            else {
                deleteTimeSeries(0, $(this).val());
                deleteTimeSeries(1, $(this).val());
            }

            config[0].chart_.update();
            config[1].chart_.update();
        });

        if( (user_states = qs.get('states'))  ) {
            user_states = user_states.split(',');
            for(i=0;i<user_states.length;i++) {
                $('#chk-state-' + user_states[i]).prop('checked', true);
            }
        }
        else {
            case_list.sort(function(b, a) { return a.cases - b.cases });
            for(i=0;i<5;i++) {
                $('#chk-state-' + case_list[i].code).prop('checked', true);
            }
        }

        config[0].data.labels = config[1].data.labels = data['days'].slice(data.dayOffset);
        updateTimeSeries(0);
        updateTimeSeries(1);

        var d = new Date(data['update_date_epoch'] * 1000);
        $('#updated').text(d.toLocaleString());
        $('#newdate').text(data['most_recent_day']);

        updateBadges('USA', '#banner-cases', '#banner-deaths');
        updateState(default_state);


        $table = $('#topcounty-table').DataTable();
        i = 0;
        case_list = [];
        for(var key in data['counties']) {
            // assign constant chart colors for states
            if( i == moreChartColors.length ) i = 0;

            data['counties'][key]['lineColor'] = moreChartColors[i++];
            
            var cases = data['counties'][key]['cases'];
            var deaths = data['counties'][key]['deaths'];
            var n = cases.length - 1;
            var st_abbr = data['counties'][key]['state_abbr']
            var st_name = data['counties'][key]['state']
            var cty_name = data['counties'][key]['county']
            var fips = data['counties'][key]['fips']

            stats.cases = cases[n];
            stats.deaths = deaths[n];
            stats.new_cases = stats.cases - cases[n-1];
            stats.new_deaths = stats.deaths - deaths[n-1];
            stats.avg_growth = slope(cases).toFixed(2);

            var chk_name = 'chk-topcounty-' + fips;
            $chk = $('<input type="checkbox"/>').val(key).attr('name', chk_name).attr('id', chk_name).addClass('form-check-input');
            var row = $table.row.add([fips, $chk.prop('outerHTML'), key, stats.cases, stats.new_cases, stats.avg_growth, stats.deaths, stats.new_deaths]).node();
            case_list.push({code: fips, cases: stats.cases});
        }

        $table.draw();
        $('#topcounty-table input').click(function(event) {
            if( this.checked ) {
                addTimeSeries(2, $(this).val());
                addTimeSeries(3, $(this).val());
            }
            else {
                deleteTimeSeries(2, $(this).val());
                deleteTimeSeries(3, $(this).val());
            }

            config[2].chart_.update();
            config[3].chart_.update();
        });

        case_list.sort(function(b, a) { return a.cases - b.cases });
        for(i=0;i<5;i++) {
            $('#chk-topcounty-' + case_list[i].code).prop('checked', true);
        }

        config[2].data.labels = config[3].data.labels = data['days'].slice(data.dayOffset);
        updateTimeSeries(2);
        updateTimeSeries(3);

        updateTodayChart();
        // config[4].chart_.update();
        config[4].chart_ = new Chart($('#chart5'), config[4]);
    });
}

function autoCheck(id, offset, n) {

    $('#' + id + '-table').DataTable().rows().every(function(idx, tableLoop, rowLoop) {
        var code = this.data()[0];
        $('#chk-' + id + '-' + code).prop('checked', rowLoop < n);
    });

    updateTimeSeries(offset);
    updateTimeSeries(offset+1);
    config[offset].chart_.update();
    config[offset+1].chart_.update();
}

function tableParams(id, offset) {

    return {
      paging: false,
      autoWidth: false,
      searching: true,
      info: false,
      order: [[ 3, 'desc' ]],
      dom: 'Bfrtip',
      buttons: [
        { text: 'Top 5',
          action: function() { autoCheck(id, offset, 5) }
        },
        { text: 'Top 10',
          action: function() { autoCheck(id, offset, 10) }
        },
        { text: 'None',
          action: function() { autoCheck(id, offset, -1) }
        },
      ],
      columnDefs: [
          {
            visible: false,
            targets: 0
          },
          {
            orderable: false,
            targets: 1
          },
          {
            render: function(data) {
                return addCommas(data)
            }
            ,
            targets: [3, 4, 5, 6, 7]
          }
      ]
    };
}

$(document).ready(function() {


    $('#state-table').DataTable(tableParams('state', 0));
    $('#topcounty-table').DataTable(tableParams('topcounty', 2));

    $('#county-table').DataTable({
      paging: false,
      autoWidth: false,
      searching: true,
      info: false,
      order: [[ 1, 'desc' ]],
      columnDefs: [
          {
            render: function(data) {
                return addCommas(data)
            },
            targets: [1, 2, 3, 4, 5]
          },
          {
            visible: false,
            targets: 3
          }
      ]
    });

    $('#ch1-logscale, #ch2-logscale, #ch3-logscale, #ch4-logscale, #ch5-logscale').change(function() {
        var offset = parseInt($(this).attr('data-offset'));
        if( this.checked ) {
            config[offset].options.scales.yAxes[0].type = 'logarithmic';
        }
        else {
            config[offset].options.scales.yAxes[0].type = 'linear';
        }

        config[offset].chart_.update();
    });

    $('#ch1-percapita, #ch2-percapita, #ch3-percapita, #ch4-percapita').change(function() {
      var offset = parseInt($(this).attr('data-offset'));
      config[offset].settings.perCapita = this.checked;
      updateTimeSeries(offset);
      config[offset].chart_.update();
    });

    $('#ch5-percapita').change(function() {
      var offset = parseInt($(this).attr('data-offset'));
      config[offset].settings.perCapita = this.checked;
      updateTodayChart();
      config[offset].chart_.update();
    });

    $('#ch1-switch-total, #ch1-switch-new, #ch2-switch-total, #ch2-switch-new, #ch3-switch-total, #ch3-switch-new, #ch4-switch-total, #ch4-switch-new').change(function() {
        var offset = parseInt($(this).attr('data-offset'));

        config[offset].settings.aggregation = $(this).val();
        updateTimeSeries(offset);
        config[offset].chart_.update();
        console.log('switch: ' + offset);
    });

    $('#state-detail-select').change(function() {
      updateState($(this).val());
    });

    $('#today-select').change(function() {
        config[4].settings.type = $(this).val();
        updateTodayChart();
        config[4].chart_.update();
    });

    $('a[data-toggle="tab"]').on('shown.bs.tab', function(event) {
        var p = parseInt($(this).attr('data-index')) - 1;
        if( panes[p] ) return;

        panes[p] = true;
        if( p == 1 ) {
            config[0].chart_ = new Chart($('#chart1'), config[0]);
            config[1].chart_ = new Chart($('#chart2'), config[1]);
        }
        else if( p == 3 ) {
            config[2].chart_ = new Chart($('#chart3'), config[2]);
            config[3].chart_ = new Chart($('#chart4'), config[3]);
        }
    });

    initialize();
});
