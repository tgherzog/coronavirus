
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
"#000000", "#FFFF00", "#1CE6FF", "#FF34FF", "#FF4A46", "#008941", "#006FA6", "#A30059",
"#FFDBE5", "#7A4900", "#0000A6", "#63FFAC", "#B79762", "#004D43", "#8FB0FF", "#997D87",
"#5A0007", "#809693", "#FEFFE6", "#1B4400", "#4FC601", "#3B5DFF", "#4A3B53", "#FF2F80",
"#61615A", "#BA0900", "#6B7900", "#00C2A0", "#FFAA92", "#FF90C9", "#B903AA", "#D16100",
"#DDEFFF", "#000035", "#7B4F4B", "#A1C299", "#300018", "#0AA6D8", "#013349", "#00846F",
"#372101", "#FFB500", "#C2FFED", "#A079BF", "#CC0744", "#C0B9B2", "#C2FF99", "#001E09",
"#00489C", "#6F0062", "#0CBD66", "#EEC3FF", "#456D75", "#B77B68", "#7A87A1", "#788D66",
"#885578", "#FAD09F", "#FF8A9A", "#D157A0", "#BEC459", "#456648", "#0086ED", "#886F4C",
"#34362D", "#B4A8BD", "#00A6AA", "#452C2C", "#636375", "#A3C8C9", "#FF913F", "#938A81",
"#575329", "#00FECF", "#B05B6F", "#8CD0FF", "#3B9700", "#04F757", "#C8A1A1", "#1E6E00",
"#7900D7", "#A77500", "#6367A9", "#A05837", "#6B002C", "#772600", "#D790FF", "#9B9700",
"#549E79", "#FFF69F", "#201625", "#72418F", "#BC23FF", "#99ADC0", "#3A2465", "#922329",
"#5B4534", "#FDE8DC", "#404E55", "#0089A3", "#CB7E98", "#A4E804", "#324E72", "#6A3A4C",
];

panes = [false, false, false];
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
      var label = data.datasets[item.datasetIndex].label || '';
      return label + ': ' + formatCaseValue(item.yLabel, offset, 3);
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

function addCommas(value, plus=false) {

  prefix = (plus && value >= 0) ? '+' : '';
  return prefix + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function newCaseCheck(n) {
/* There are at least 2 instances where the case count decreases over time. I'm not
   sure why or how to correct it. Letting it go means the new case/death charts can
   show negative values. But trimming to 0 can mean charts don't match the reported data.

   Uncomment the next line to supress negative new case values
*/
   return n;
   return Math.max(n, 0);
}

function formatCaseValue(value, idx, points=2) {

  if( config[idx].settings.perCapita ) {
    return value.toFixed(points);
  }

  return addCommas(value);
}

config = [
  {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Prior cases',
          backgroundColor: chartColors.orange,
          borderColor: 'transparent',
          data: [],
        },
        {
          label: 'New cases',
          backgroundColor: chartColors.red,
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
              return formatCaseValue(value, 0);
            }
          }
        }]
      },
      tooltips: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: function(items, data) {
            return formatters.title(items, data, 0);
          },
          afterTitle: formatters.rank,
          label: function(item, data) {
            return formatters.label(item, data, 0);
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
              return formatCaseValue(value, 1);
            }
          }
        }]
      },
      tooltips: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: function(items, data) {
            return formatters.title(items, data, 1);
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
              return formatCaseValue(value, 3);
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
            return formatters.label(item, data, 3);
          }
        }
      }
    },
    settings: {
        field: 'cases',
        perCapita: false,
        aggregation: 'total',
    },
    chart_: null
  },
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
              return formatCaseValue(value, 4);
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
            return formatters.label(item, data, 4);
          }
        }
      }
    },
    settings: {
        field: 'deaths',
        perCapita: false,
        aggregation: 'total',
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
          backgroundColor: chartColors.purple,
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
];

apiRoot = 'http://cvapi.zognet.net/v2/USA/';
data = {}

function createChart(id, type, lineColor, sz) {

    var labels = Array();
    var data = Array();

    for(var i=0;i<sz;i++) {
      labels.push('');
      data.push(Math.random() * 100);
    }

    var c = new Chart($(id), {
      type: type,
      data: {
          labels: labels,
          datasets: [
            {
                label: id,
                backgroundColor: lineColor,
                borderColor: lineColor,
                data: data,
                fill: false
            }
          ]
      },
      options: {}
    });

    return c;
}

function updateCaseData(offset) {

    var labels = [];
    var today = [];
    var field = offset == 0 ? 'cases' : 'deaths';
    for(var key in data['data']) {
        if( key != 'USA' ) {
            cases = data['data'][key][field];
            if( config[offset].settings.perCapita ) {
                population = data['states'][key]['population'] / 1000;
            }
            else {
              population = 1;
            }

            var latest_cases = cases[cases.length-1] / population;
            var prior_cases = cases[cases.length-2] / population;
            today.push({'label': key, 'prior': prior_cases, 'today': newCaseCheck(latest_cases - prior_cases)});
        }
    }

    today.sort(function(b, a) { return (a['prior'] + a['today']) - (b['prior'] + b['today']) });

    var new_cases = [];
    var prior_cases = [];

    for(var i=0;i<today.length;i++) {
      labels.push(today[i]['label']);
      new_cases.push(today[i]['today']);
      prior_cases.push(today[i]['prior']);
    }

    config[offset].data.labels = labels;
    config[offset].data.datasets[0].data = prior_cases;
    config[offset].data.datasets[1].data = new_cases;

    field = capitalize(field);
    if( config[offset].settings.perCapita ) {
      field = field + '/1,000';
    }
    
    config[offset].options.scales.yAxes[0].scaleLabel.labelString = field;
}

function updateCFR() {

    var labels = [];
    var today = [];
    for(var key in data['data']) {
        if( key != 'USA' ) {
            var ref = data['data'][key]
            var n = ref['cases'].length;
            if( ref['cases'][n-1] ) {
                var cfr = ref['deaths'][n-1] / ref['cases'][n-1];
                today.push({'label': key, 'cfr': cfr});
            }
        }
    }

    today.sort(function(b, a) { return a['cfr'] - b['cfr'] });

    var cfr_data = [];

    for(var i=0;i<today.length;i++) {
      labels.push(today[i]['label']);
      cfr_data.push(today[i]['cfr']);
    }

    config[2].data.labels = labels;
    config[2].data.datasets[0].data = cfr_data;
}

function updateCaseGrowth() {

    var labels = [];
    var today = [];
    var days = 3;
    for(var key in data['data']) {
        if( key != 'USA' ) {
            var ref = data['data'][key]
            var n = ref['cases'].length;
            var end = ref['cases'][n-1], st = ref['cases'][n-1-days];
            if( ref['cases'][n-1] ) {
                var avg = Math.pow(end/st, 1/days) - 1;
                today.push({label: key, avg: avg});
            }
        }
    }

    today.sort(function(b, a) { return a['avg'] - b['avg'] });

    var cfr_data = [];

    for(var i=0;i<today.length;i++) {
      labels.push(today[i]['label']);
      cfr_data.push(today[i]['avg']);
    }

    config[5].data.labels = labels;
    config[5].data.datasets[0].data = cfr_data;
}

function addTimeSeries(offset, key) {

    var type = config[offset].settings.field;
    var ds = config[offset].data.datasets;
    var color = data['data'][key]['lineColor'];
    var series = [];
    var population = 1;

    if( config[offset].settings.perCapita ) {
        population = data['states'][key]['population'] / 1000;
    }

    // here we grab 1 prior value so we can calculate 'new' cases if necessary. Then we start indexing from 1
    var data_ = data['data'][key][type].slice(data.dayOffset-1);
    var cases;
    for(var i=1;i<data_.length;i++) {
        cases = data_[i];
        if( config[offset].settings.aggregation == 'new' ) {
            cases = newCaseCheck(cases - data_[i-1]);
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
    $('#ts-checkboxes input').each(function() {
        if( this.checked ) {
            addTimeSeries(offset, $(this).val());
        }
    });

    var field = capitalize(config[offset].settings.aggregation) + ' ' + capitalize(config[offset].settings.field);
    if( config[offset].settings.perCapita ) {
        field = field + '/1,000';
    }

    config[offset].options.scales.yAxes[0].scaleLabel.labelString = field;
}

function updateBadges(state, caseID, deathsID) {

    var cases = data['data'][state]['cases'];
    var deaths = data['data'][state]['deaths'];
    var n = cases.length;

    $(caseID).find('.total').text(addCommas(cases[n-1]));
    $(caseID).find('.new').text(addCommas(cases[n-1] - cases[n-2], true));
    $(caseID).find('.week').text(addCommas(cases[n-1] - cases[n-8], true));

    $(deathsID).find('.total').text(addCommas(deaths[n-1]));
    $(deathsID).find('.new').text(addCommas(deaths[n-1] - deaths[n-2], true));
    $(deathsID).find('.week').text(addCommas(deaths[n-1] - deaths[n-8], true));
}

function updateState(state) {

    updateBadges(state, '#banner-state-cases', '#banner-state-deaths');

    // $('#county-table tbody').empty();
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

        // assign constant chart colors for states
        var i = 2;
        for(var key in data['data']) {
            data['data'][key]['lineColor'] = moreChartColors[i++];
        }

        // ignore dates that have less than 25 cases, which just happens to be all of February
        data.dayOffset = 0;
        while( data.dayOffset < data['data']['USA']['cases'].length && data['data']['USA']['cases'][data.dayOffset] < 25 )
            data.dayOffset++;

        var d = new Date(data['update_date_epoch'] * 1000);
        $('#updated').text(d.toLocaleString());
        $('#newdate').text(data['most_recent_day']);

        updateBadges('USA', '#banner-cases', '#banner-deaths');
        updateCaseData(0);
        updateCaseData(1);
        updateCFR();
        updateCaseGrowth();

        var n = 0, st_abbr, default_state = 'Virginia';
        for(var i in data['data']) {
            var st_label = i;
            if( i != 'USA' ) {
                st_abbr = data['states'][i]['code'];
                if( st_abbr == 'DC' ) {
                    st_label = st_abbr;  // use DC instead of District of Columbia, which is too long
                }

                $opt = $('<option/>').attr('value', i).attr('selected', i == default_state).text(i);
                $('#state-detail-select').append($opt);
            }
            else {
                st_abbr = i;  // USA
            }

            $wrapper = $('<div/>').addClass('form-check');
            $box = $('<input type="checkbox"/>').addClass('form-check-input').attr('value', i).attr('id', 'ch-ts-' + i).click(function(event) {
                var value = $(this).val();
                if( this.checked ) {
                    addTimeSeries(3, value);
                    addTimeSeries(4, value);
                }
                else {
                    deleteTimeSeries(3, value);
                    deleteTimeSeries(4, value);
                }

                config[3].chart_.update();
                config[4].chart_.update();
            });

            if( config[0].data.labels.slice(0, 5).indexOf(i) >= 0 ) {
                $box.attr('checked', true);
            }

            $wrapper.append($box);
            $wrapper.append($('<label/>').addClass('form-class-label state-name').attr('for', 'ch-ts-' + i).text(st_label));
            $wrapper.append($('<label/>').addClass('form-class-label state-abbr').attr('for', 'ch-ts-' + i).text(st_abbr));
            $('#ts-checkboxes > div').eq(Math.floor(n/9)).append($wrapper);
            n += 1;
        }

        config[3].data.labels = config[4].data.labels = data['days'].slice(data.dayOffset);
        updateTimeSeries(3);
        updateTimeSeries(4);
        updateState(default_state);

        config[0].chart_ = new Chart($('#chart1'), config[0]);
        config[1].chart_ = new Chart($('#chart2'), config[1]);
        config[2].chart_ = new Chart($('#chart3'), config[2]);
        config[5].chart_ = new Chart($('#chart6'), config[5]);
        panes[0] = true;
    });
}

$(document).ready(function() {

    initialize();

    $('#county-table').DataTable({
      paging: false,
      searching: true,
      info: false,
      order: [[ 1, 'desc' ]],
      columnDefs: [
          {
            render: formatters.pct_label,
            targets: 3
          },
          {
            render: function(data) {
                return addCommas(data)
            }
            ,
            targets: [1, 2, 4, 5]
          }
      ]
    });
    $('#ch1-logscale, #ch2-logscale, #ch4-logscale, #ch5-logscale').change(function() {
        var offset = parseInt($(this).attr('data-offset'));
        if( this.checked ) {
            config[offset].options.scales.yAxes[0].type = 'logarithmic';
        }
        else {
            config[offset].options.scales.yAxes[0].type = 'linear';
        }

        config[offset].chart_.update();
    });

    $('#ch1-percapita, #ch2-percapita, #ch4-percapita, #ch5-percapita').change(function() {

      var offset = parseInt($(this).attr('data-offset'));
      config[offset].settings.perCapita = this.checked;
      if( offset < 3 ) {
          updateCaseData(offset);
      }
      else {
          updateTimeSeries(offset);
      }

      config[offset].chart_.update();
    });

    $('#ch4-switch-total, #ch4-switch-new, #ch5-switch-total, #ch5-switch-new').change(function() {
        var offset = parseInt($(this).attr('data-offset'));

        config[offset].settings.aggregation = $(this).val();
        updateTimeSeries(offset);
        config[offset].chart_.update();
        console.log('switch: ' + offset);
    });

    $('#state-detail-select').change(function() {
      updateState($(this).val());
    });

    $('a[data-toggle="tab"]').on('shown.bs.tab', function(event) {
        var offset = parseInt($(event.target).attr('data-index'));
        if( panes[offset] == false ) {
            panes[offset] = true;
            if( offset == 1 ) {
                config[3].chart_ = new Chart($('#chart4'), config[3]);
                config[4].chart_ = new Chart($('#chart5'), config[4]);
            }
        }
    });
});
