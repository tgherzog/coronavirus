
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

trendLen = 14; // also some static labels in the HTML that need to match any changes here
rollingLen = 7;   // number of days for which to calculate a new cases/death rolling average: 0 to present raw numbers.

panes = [false, false, false, false, false];
formatters = {
    number: function(value, dp=0, plus=false) {
          if( value == undefined ) return '';

          value = Number(value);
          var prefix = (plus && value > 0) ? '+' : '';
          var components = value.toFixed(dp).split('.');
          components[0] = components[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          return components.join('.');
    },

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
        var total = 0, value;
        items.forEach(function(item) {
          total += item.yLabel;
        });

        return state_name + ': ' + formatters.number(total, config[offset].settings.perCapita ? 2 : 0);
    },
    label: function(item, data, offset) {
      var label = data.datasets[item.datasetIndex].label || '', value = undefined, type;
      if( offset == 4 )
          type = config[offset].settings.type;
      else
          type = config[offset].settings.aggregation;
            
      if( type == 'ptr' || type == 'cfr' || type == 'adr' )
        value = (item.yLabel*100).toFixed(2) + '%';
      else if( type == 'avg_growth' )
        value = formatters.number(item.yLabel, 2);

      if( value == undefined )
        value = formatters.number(item.yLabel, config[offset].settings.perCapita ? 2 : 0);

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

function slope_intercept(data) {

  var yArray = data.slice(-trendLen);
  var i, n = yArray.length;
  var sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for(var i=0;i<n;i++) {
    sumX += i;
    sumY += yArray[i];
    sumXY += i * yArray[i];
    sumXX += i * i;
  }

  var slope = (n*sumXY - sumX*sumY) / (n*sumXX - sumX*sumX);
  var intercept = (sumY - slope * sumX) / n;

  return { slope: slope, intercept: intercept };
}

function slope(data) {

    var x = slope_intercept(data);
    return x.slope;
}

function marginal_slope(data) {
    
    return slope(marginal_value_series(data));
}

function trendline(data, labels) {

    si = slope_intercept(data);
    return [
      {x: labels[labels.length-trendLen], y: si.intercept},
      {x: labels[labels.length-1], y: si.intercept + si.slope * (trendLen-1)}
    ];
}


function formatYAxisTick(offset, value) {

    if( config[offset].settings.aggregation == 'ptr' || config[offset].settings.aggregation == 'cfr'  || config[offset].settings.aggregation == 'adr' )
        return formatters.pct_label(value);

    return formatCaseValue(value, offset);
}

function formatCaseValue(value, idx) {

  return formatters.number(value, config[idx].settings.perCapita ? 2 : 0);
}

function per_capita(value, pop, denom) {

    if( pop === null || pop == 0 )
        return 0;

    return value / (pop/pop_denom(denom));
}

function pop_denom(denom, str) {

    if( str )
        return denom == 'deaths' ? '100K' : '1,000';

    return denom == 'deaths' ? 100000 : 1000;
}

function tot(series, n) {
    
    return series[n] - (baseline == undefined ? 0 : series[baseline]);
}

function getCookie(cname, otherwise) {

  if( otherwise === undefined ) otherwise = null;

  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }

  return otherwise;;
}

function trendlineTooltipFilter(item) { return item.label[0] != '-' }
function trendlineLegendLabelFilter(item) { return item.text[0] != '-' }
function trendlineClickHandler(e, item) {

    var index = item.datasetIndex;
    let ci = this.chart;
    
    [index, index+1].forEach(function(i) {
        if( i < ci.config.data.datasets.length ) {
            meta = ci.getDatasetMeta(i);
            label = ci.config.data.datasets[i].label;
            if( i == index || label[0] == '-' )
                meta.hidden = meta.hidden === null ? !ci.data.datasets[i].hidden : null;
        }
    });

    ci.update();
}

config = [
  // state tab - unified line chart
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
              return formatYAxisTick(0, value);
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
        perCapita: false,
        aggregation: 'total',
        uiContainer: '#state-table'
    },
    chart_: null
  },

  // local tab - unified line chart
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
              return formatYAxisTick(1, value);
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
        field: 'cases',
        perCapita: false,
        aggregation: 'total',
        uiContainer: '#county-table'
    },
    chart_: null
  },

  // top counties tab - unified line chart
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
              return formatYAxisTick(2, value);
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
        perCapita: false,
        aggregation: 'total',
        uiContainer: '#topcounty-table'
    },
    chart_: null
  },

  // vaccines tab - unified chart
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
            labelString: 'Vaccines'
          },
          ticks: {
            maxTicksLimit: 5,
            callback: function(value, index, values) {
              return formatYAxisTick(3, value);
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
        field: 'vaccines_distributed',
        perCapita: false,
        aggregation: 'total',
        uiContainer: '#vaccines-table'
    },
    chart_: null
  },

  // combined chart on today tab
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
                case 'ptr':
                case 'adr':
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
      type: 'avg_new_cases'
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
              return formatYAxisTick(5, value);
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
stateData = {}
dayOffset = 1;  // offset of data that we actually display - ignoring early dates that are less significant
baseline = undefined;
startDate = undefined;

function marginal_value(data, span, n) {

    if( n == null ) n = data.length-1;
    if( span == null ) span = 1;

    var sum = 0, i = 0, N = 0;
    n -= span-1;
    while( i < span ) {
        if( data[i+n] != null && data[i+n-1] != null ) {
            sum += data[i+n] - data[i+n-1];
            N++;
        }

        i++;
    }

    return sum / N;
}

function marginal_value_series(data, span, population) {

    if( span == null ) span = 1;
    if( population == null ) population = 1;

    var result = new Array(data.length), i = 0;

    // result[0] will always be undefined
    while( i < span ) {
        result[i] = undefined;
        i++;
    }

    // for simple differences, save time by not computing an average
    if( span == 1 ) {
        while( i < data.length ) {
            if( data[i] != null && data[i-1] != null )
                result[i] = (data[i] - data[i-1]) / population;

            i++;
        }
    }
    else {
        while( i < data.length ) {
            result[i] = marginal_value(data, span, i) / population;
            i++;
        }
    }

    return result;
}

function updateTodayChart() {

    var labels = [];
    var today = [];
    var colors = [];
    var offset = 4;
    var label = '';
    var type2 = (config[offset].settings.type == 'new_deaths' || config[offset].settings.type == 'avg_new_deaths') ? 'deaths' : config[offset].settings.type;
    var pc = config[offset].settings.perCapita ? '/' + pop_denom(type2, true) : '';
    for(var key in data['states']) {
        if( data['states'][key]['admin'] == 1 ) {
            var cases = data['states'][key]['cases'];
            var deaths = data['states'][key]['deaths'];
            var vDist  = data['states'][key]['vaccines_distributed'];
            var vAdmin = data['states'][key]['vaccines_administered'];
            var color = data['states'][key]['lineColor'];
            n = cases.length - 1;
            vn = vDist.length - 1;
            if( config[offset].settings.perCapita ) {
                population = data['states'][key]['population'] / pop_denom(type2);
            }
            else {
                population = 1;
            }

            switch(config[offset].settings.type) {
                case 'cases':
                    obs = tot(cases, n) / population;
                    label = 'Cases' + pc;
                    label2 = label;
                    break;
                case 'deaths':
                    obs = tot(deaths, n) / population;
                    label = 'Deaths' + pc;
                    label2 = label;
                    break;
                case 'new_cases':
                    obs = (cases[n] - cases[n-1]) / population;
                    label = 'New Cases' + pc;
                    label2 = label;
                    break;
                case 'avg_new_cases':
                    obs = marginal_value(cases, rollingLen) / population;
                    label = 'New Cases' + pc;
                    label2 = 'Avg. Daily Cases' + pc;
                    break;
                case 'new_deaths':
                    obs = (deaths[n] - deaths[n-1]) / population;
                    label = 'New Deaths' + pc;
                    label2 = label;
                    break;
                case 'avg_new_deaths':
                    obs = marginal_value(deaths, rollingLen) / population;
                    label = 'New Deaths' + pc;
                    label2 = 'Avg. Daily Deaths' + pc;
                    break;
                case 'avg_growth':
                    obs = marginal_slope(cases);
                    label = 'Daily Trend';
                    label2 = label;
                    break;
                case 'cfr':
                    obs = tot(deaths, n) / tot(cases, n);
                    label = 'Case Fatality Rate';
                    label2 = 'CFR';
                    break;
                case 'dist_doses':
                    obs = vDist[vn] / population;
                    label = 'Distributed Vaccine Doses' + pc;
                    label2 = 'Doses' + pc;
                    break;
                case 'admin_doses':
                    obs = vAdmin[vn] / population;
                    label = 'Administered Vaccine Doses' + pc;
                    label2 = 'Doses' + pc;
                    break;
                case 'admin1_doses':
                    obs = data['states'][key]['vaccines_admin1'][vn] / population;
                    label = 'Received 1 or More Doses' + pc;
                    label2 = 'Persons' + pc;
                    break;
                case 'complete_doses':
                    obs = data['states'][key]['vaccines_complete'][vn] / population;
                    label = 'Received 2  Doses' + pc;
                    label2 = 'Persons' + pc;
                    break;
                case 'adr':
                    obs = vAdmin[vn] / vDist[vn];
                    label = 'Administered Rate';
                    label2 = 'ADR';
                    break;
            }

            today.push({label: key, value: obs, color: color});
        }
    }

    today.sort(function(b, a) { return a['value'] - b['value'] });

    config[offset].data.labels = today.map(x => x.label);
    config[offset].data.datasets[0].data = today.map(x => x.value);
    config[offset].data.datasets[0].label = label2;
    config[offset].data.datasets[0].backgroundColor = today.map(x => x.color);
    config[offset].options.scales.yAxes[0].scaleLabel.labelString = label;

    if( config[offset].settings.type == 'avg_growth' || config[offset].settings.type == 'cfr' || config[offset].settings.type == 'adr' ) {
      $('#chart0-tab input').prop('checked', false).prop('disabled', true);
      config[offset].settings.perCapita = false;
      config[offset].options.scales.yAxes[0].type = 'linear';
    }
    else {
      $('#chart0-tab input').removeAttr('disabled');
    }
}

function dataFromOffset(offset) {

    switch(offset) {
        case 0:
            return data['states'];
        case 1:
            return stateData['counties'];
        case 2:
            return data['counties'];
        case 3:
            return data['states'];
    }

    return undefined;
}

function addTimeSeries(offset, key, hidden=false) {

    var data = dataFromOffset(offset);
    var type = config[offset].settings.field;
    var ds = config[offset].data.datasets;
    var color = data[key]['lineColor'];
    var series = null;
    var population = 1;
    var label = offset == 1 ? data[key].county : key;
    var seriesType = config[offset].settings.aggregation;

    if( config[offset].settings.perCapita ) {
        population = data[key]['population'] / pop_denom(type);
    }

    // here we grab 1 prior value so we can calculate 'new' cases if necessary. Then we start indexing from 1
    if( offset == 3 ) {
        // vaccine data are a special case
        var base = 0;
        var data_ = [null].concat(data[key][type])
    }
    else {
        // grab the base value before we slice up the array
        var base = baseline == undefined ? 0 : data[key][type][baseline];
        var data_ = data[key][type].slice(dayOffset-1);
    }

    switch(seriesType) {
        case 'total':
            series = data_;
            for(var i=0;i<series.length;i++)
                if( series[i] !== null )
                    series[i] = (series[i] - base) / population;

            break;
        case 'new':
            series = marginal_value_series(data_, 1, population);
            break;
        case 'avg':
            series = marginal_value_series(data_, rollingLen, population);
            break;
        case 'adr':
            series = data_;
            var admin = [null].concat(data[key]['vaccines_administered']);
            for(var i=0;i<series.length;i++)
                series[i] = admin[i] / series[i];
            break;
        case 'cfr':
            series = data_;
            var baseDeaths = baseline == undefined ? 0 : data[key]['deaths'][baseline];
            var deaths = data[key]['deaths'].slice(dayOffset-1);
            for(var i=0;i<series.length;i++)
                series[i] = (deaths[i] - baseDeaths) / (series[i] - base);
            break;
    }

    var n = {label: label, id: key, fill: false, backgroundColor: color, borderColor: color, hidden: hidden, data: series.slice(1)};
    if( offset == 3 )
        n.tension = false;

    var t = {...n}
    t.label = '-' + t.label;
    t.borderWidth = 1;
    t.pointRadius = 0;
    t.data = trendline(series, config[offset].data.labels);

    for(var i=0;i<ds.length;i++) {
        if( ds[i].id == key ) {
            return;
        }
        else if( ds[i].id > key ) {
            ds.splice(i, 0, n);
            if( seriesType == 'new' )
                ds.splice(i+1, 0, t);

            return;
        }
    }

    ds.push(n);
    if( seriesType == 'new' )
        ds.push(t);
}

function deleteTimeSeries(offset, key) {

    var ds = config[offset].data.datasets, i = 0;

    while( i < ds.length ) {
        if( ds[i].id == key )
            ds.splice(i, 1);
        else
            i++;
    }
}

function updateTimeSeries(offset) {

    let ci = config[offset].chart_;
    var presets = {};
    for(var i=0;i<config[offset].data.datasets.length;i++) {
        meta = ci.getDatasetMeta(i);
        presets[config[offset].data.datasets[i].id] = meta.hidden === null ? ci.data.datasets[i].hidden : meta.hidden;
    }

    config[offset].data.datasets = [];
    $(config[offset].settings.uiContainer + ' input:checked').each(function() {
        let val = $(this).val();
        addTimeSeries(offset, val, presets[val]);
    });

    var field = '';
    if( config[offset].settings.aggregation == 'adr' )
        field = 'Administered Rate';
    else if( config[offset].settings.aggregation == 'cfr' )
        field = 'Case Fatality Rate';
    else if( config[offset].settings.field == 'vaccines_distributed' )
        field = 'Distributed Doses' + (config[offset].settings.perCapita ? '/1,000' : '');
    else if( config[offset].settings.field == 'vaccines_administered' )
        field = 'Administered Doses' + (config[offset].settings.perCapita ? '/1,000' : '');
    else if( config[offset].settings.field == 'vaccines_admin1' )
        field = 'Received 1 or More Doses' + (config[offset].settings.perCapita ? '/1,000' : '');
    else if( config[offset].settings.field == 'vaccines_complete' )
        field = 'Complete Vaccinations' + (config[offset].settings.perCapita ? '/1,000' : '');
    else {
        var agg = config[offset].settings.aggregation == 'total' ? 'total' : 'new';
        field = capitalize(agg) + ' ' + capitalize(config[offset].settings.field);
        if( config[offset].settings.perCapita ) {
            denom = config[offset].settings.field == 'deaths' ? '100K' : '1,000';
            field = field + '/' + denom;
        }
    }

    config[offset].options.scales.yAxes[0].scaleLabel.labelString = field;
}

function updateBadges(state, caseID, deathsID, vaccinesID) {

    var cases = data['states'][state]['cases'];
    var deaths = data['states'][state]['deaths'];
    var vaccines1 = data['states'][state]['vaccines_distributed'];
    var vaccines2 = data['states'][state]['vaccines_administered'];
    var vaccines3 = data['states'][state]['vaccines_complete'];
    var n = cases.length;

    $(caseID).find('.total').text(formatters.number(tot(cases, n-1)));
    $(caseID).find('.new').text(formatters.number(marginal_value(cases)));
    $(caseID).find('.avg').text(formatters.number(marginal_value(cases, rollingLen)));
    $(caseID).find('.trend').text(formatters.number(marginal_slope(cases).toFixed(0), 0, true));

    $(deathsID).find('.total').text(formatters.number(tot(deaths, n-1)));
    $(deathsID).find('.new').text(formatters.number(marginal_value(deaths)));
    $(deathsID).find('.avg').text(formatters.number(marginal_value(deaths, rollingLen)));
    $(deathsID).find('.trend').text(formatters.number(marginal_slope(deaths).toFixed(0), 0, true));

    n = vaccines1.length-1;
    $(vaccinesID).find('.total').text(formatters.number(tot(vaccines1, n)));
    $(vaccinesID).find('.admin').text(formatters.number(tot(vaccines2, n)));
    $(vaccinesID).find('.complete').text(formatters.number(tot(vaccines3, n)));
    $(vaccinesID).find('.rate').text((vaccines3[n] * 100 / data['states'][state]['population']).toFixed(1) + '%');

    cdc = data['states'][state]['cdc']['comm_lev'];
    $(vaccinesID).find('.comm-level .low').text(formatters.number((cdc['low'] || 0) * 100));
    $(vaccinesID).find('.comm-level .medium').text(formatters.number((cdc['medium'] || 0) * 100));
    $(vaccinesID).find('.comm-level .high').text(formatters.number((cdc['high'] || 0) * 100));

    cdc = data['states'][state]['cdc']['trans_lev'];
    $(vaccinesID).find('.trans-level .low').text(formatters.number((cdc['low'] || 0) * 100));
    $(vaccinesID).find('.trans-level .moderate').text(formatters.number((cdc['moderate'] || 0) * 100));
    $(vaccinesID).find('.trans-level .substantial').text(formatters.number((cdc['substantial'] || 0) * 100));
    $(vaccinesID).find('.trans-level .high').text(formatters.number((cdc['high'] || 0) * 100));
}

function tableCheckbox(val, id) {
    
    return $('<input type="checkbox"/>').val(val).attr('name', id).attr('id', id).addClass('form-check-input');
}

function tableCheckboxClick(ch, offset) {

    if( ch.checked )
        addTimeSeries(offset, $(ch).val());
    else
        deleteTimeSeries(offset, $(ch).val())

    config[offset].chart_.update();
}

function updateState(state, updateMenu) {

    updateBadges(state, '#banner-state-cases', '#banner-state-deaths', '#banner-state-vaccines');

    var code = data['states'][state]['code'];
    var stateRow = {...data['states'][state]};
    stateRow['cdc'] = null;
    stateRow['county'] = state;

    document.cookie = 'usState=' + state + '; expires=Tue, 31 Dec 2024 00:00 UTC';
    console.log('Fetching ' + code);
    $.get(apiRoot + code + '.json', function(data) {
        stateData = data;
        
        // splice in the state-level data so that appears as well
        stateData['counties'][code] = stateRow;

        $table = $('#county-table').DataTable();
        var sorter = $table.order()[0];
        $table.clear();
        case_list = [];
        var i, n = 0;
        for(key in data['counties']) {
            if( n == moreChartColors.length ) n = 0;
                stateData['counties'][key]['lineColor'] = moreChartColors[n++];

            row = data['counties'][key];
            var pop = row.population;
            i = row.cases.length - 1;
            var new_cases = row.cases[i] - row.cases[i-1], new_deaths = row.deaths[i] - row.deaths[i-1];
            $chk = tableCheckbox(key, 'chk-county-' + row.fips);
            avg_cases = marginal_value(row.cases, rollingLen);
            avg_deaths = marginal_value(row.deaths, rollingLen);
            var elems = [ row.fips, $chk.prop('outerHTML'), 99, row.county,
                tot(row.cases, i), per_capita(tot(row.cases, i), pop),
                new_cases, per_capita(new_cases, pop),
                avg_cases, per_capita(avg_cases, pop),
                tot(row.deaths, i), per_capita(tot(row.deaths, i), pop, 'deaths'),
                new_deaths, per_capita(new_deaths, pop, 'deaths'),
                avg_deaths, per_capita(avg_deaths, pop, 'deaths')
            ];
            var row_ = $table.row.add(elems).node();
            if( row['admin'] == 1 )
                $(row_).addClass('aggregate');
            else
                case_list.push({code: row.fips, cases: elems[sorter[0]]});

            if( row.cdc ) {
                if( row.cdc.comm_lev )
                    $(row_).addClass('comm_level_' + row.cdc.comm_lev.replace('/',''))

                if( row.cdc.trans_lev )
                    $(row_).addClass('trans_level_' + row.cdc.trans_lev.replace('/',''))
            }
        }

        $table.draw();
        $('#county-table input').click(function(event) {
            tableCheckboxClick(this, 1);
        });

        case_list.sort(function(a, b) { return (a.cases - b.cases) * (sorter[1] == 'asc' ? 1 : -1)  });
        for(i=0;i<Math.min(5, case_list.length);i++) {
            $('#chk-county-' + case_list[i].code).prop('checked', true);
        }

        updateTimeSeries(1);
        if( updateMenu === true )
            config[1].chart_.update();
    });
}

function initialize() {

    for(var i=0;i<config.length;i++)
        if( config[i].type == 'line' ) {
            if( typeof(config[i].options) == 'undefined' ) config[i].options = {};
            if( typeof(config[i].options.tooltips) == 'undefined' ) config[i].options.tooltips = {};
            if( typeof(config[i].options.legend) == 'undefined' ) config[i].options.legend = {};
            if( typeof(config[i].options.legend.labels) == 'undefined' ) config[i].options.legend.labels = {};

            config[i].options.tooltips.filter = trendlineTooltipFilter;
            config[i].options.legend.labels.filter = trendlineLegendLabelFilter;
            config[i].options.legend.onClick = trendlineClickHandler;
        }

    $.get(apiRoot + 'error.txt', function(data) {
        $('#systemerror').html(data.replace('\n', '<br/>'));
    });
    $.get(apiRoot + 'USA.json', function(data_) {
        data = data_;

        qs = new Querystring();
        trendLen = qs.get('trend', trendLen, true);
        rollingLen = qs.get('rolling', rollingLen, true);
        if( qs.get('since') ) {
            var d = qs.get('since').split('/');
            if( d.length >= 2 ) {
                if( d.length == 2 ) d.push((new Date()).getFullYear());
                d = d.join('/');
                var t = data_.days.indexOf(d);
                if( t > 0 ) {
                    dayOffset = t;
                    baseline = dayOffset - 1;
                    startDate = d;
                }
            }
        }

        if( baseline == undefined ) {
            // otherwise, or if an invalid date is specified, the default is to start where the national case load exceeds 25, which is 2/29/2020
            dayOffset = 0;
            while( dayOffset < data['states']['USA']['cases'].length && data['states']['USA']['cases'][dayOffset] < 25 )
                dayOffset++;

            startDate = data.days[dayOffset];
        }

        $('span.trendlen').text(trendLen.toString());
        $('span.rolling').text(rollingLen.toString());

        var d = new Date(data['update_date_epoch'] * 1000);
        $('#updated').text(d.toLocaleString());
        $('#newdate').text(data['most_recent_day']);
        $('#newvaxdate').text(data['most_recent_vaccine_day']);
        $('#startdate').text(startDate);

        var i = 0, case_list = [];
        for(i=0;i<3;i++)
            config[i].data.labels = data['days'].slice(dayOffset);

        config[3].data.labels = data['vaccine_days'];

        var default_state = getCookie('usState', 'Virginia');
        $table = $('#state-table').DataTable();
        $vaccines = $('#vaccines-table').DataTable();
        i = 0;
        for(var key in data['states']) {
            // assign constant chart colors for states
            data['states'][key]['lineColor'] = moreChartColors[i++];
            
            var cases = data['states'][key]['cases'];
            var deaths = data['states'][key]['deaths'];
            var n = cases.length - 1;
            var code = data['states'][key]['code'];
            var pop = data['states'][key]['population'];

            var new_cases = cases[n] - cases[n-1];
            var new_deaths = deaths[n] - deaths[n-1];

            $chk = tableCheckbox(key, 'chk-state-' + code);
            avg_cases = marginal_value(cases, rollingLen);
            avg_deaths = marginal_value(deaths, rollingLen);
            var row = $table.row.add([code, $chk.prop('outerHTML'), 99, key,
              tot(cases, n), per_capita(tot(cases, n), pop),
              new_cases, per_capita(new_cases, pop),
              avg_cases, per_capita(avg_cases, pop),
              tot(deaths, n), per_capita(tot(deaths, n), pop, 'deaths'),
              new_deaths, per_capita(new_deaths, pop, 'deaths'),
              avg_deaths, per_capita(avg_deaths, pop, 'deaths')
            ]).node();
            if( data['states'][key]['admin'] == 0 )
                $(row).addClass('aggregate');
            else {
                case_list.push({code: code, cases: cases[n], vaccines: distributed[vn]});
                $opt = $('<option/>').val(key).attr('selected', key == default_state).text(key);
                $('#state-detail-select').append($opt);
            }

            var distributed = data['states'][key]['vaccines_distributed'];
            var administered = data['states'][key]['vaccines_administered'];
            var admin1 = data['states'][key]['vaccines_admin1'];
            var admin2 = data['states'][key]['vaccines_complete'];
            var vn = distributed.length - 1;
            var avg_dists  = marginal_value(distributed, rollingLen);
            var avg_admins = marginal_value(administered, rollingLen);
            var avg_admin1 = marginal_value(admin1, rollingLen);
            var avg_admin2 = marginal_value(admin2, rollingLen);

            $chk = tableCheckbox(key, 'chk-vaccines-' + code);
            var row = $vaccines.row.add([code, $chk.prop('outerHTML'), 99, key,
              distributed[vn], per_capita(distributed[vn], pop),
              distributed[vn] - distributed[vn-1], per_capita(distributed[vn] - distributed[vn-1], pop),
              avg_dists, per_capita(avg_dists, pop),

              administered[vn], per_capita(administered[vn], pop),
              administered[vn] - administered[vn-1], per_capita(administered[vn] - administered[vn-1], pop),
              avg_admins, per_capita(avg_admins, pop),
              administered[vn] / distributed[vn],

              admin1[vn], per_capita(admin1[vn], pop),
              admin1[vn] - admin1[vn-1], per_capita(admin1[vn] - admin1[vn-1], pop),
              avg_admin1, per_capita(avg_admin1, pop),

              admin2[vn], per_capita(admin2[vn], pop),
              admin2[vn] - admin2[vn-1], per_capita(admin2[vn] - admin2[vn-1], pop),
              avg_admin2, per_capita(avg_admin2, pop)
            ]).node();
            if( data['states'][key]['admin'] == 0 )
              $(row).addClass('aggregate');
        }

        $table.draw();
        $vaccines.draw();
        $('#state-table input').click(function(event) {
            tableCheckboxClick(this, 0);
        });

        $('#vaccines-table input').click(function(event) {
            tableCheckboxClick(this, 3);
        });

        if( (user_states = qs.get('states'))  ) {
            user_states = user_states.split(',');
            for(i=0;i<user_states.length;i++) {
                $('#chk-state-' + user_states[i]).prop('checked', true);
                $('#chk-test-state-' + user_states[i]).prop('checked', true);
            }
        }
        else {
            case_list.sort(function(b, a) { return a.cases - b.cases });
            for(i=0;i<5;i++) {
                $('#chk-state-' + case_list[i].code).prop('checked', true);
            }

            case_list.sort(function(b, a) { return a.vaccines - b.vaccines });
            for(i=0;i<5;i++) {
                $('#chk-vaccines-' + case_list[i].code).prop('checked', true);
            }
        }

        updateTimeSeries(0);
        updateTimeSeries(3);

        updateBadges('USA', '#banner-cases', '#banner-deaths', '#banner-vaccines');
        updateState(default_state);

        $table = $('#topcounty-table').DataTable();
        i = 0;
        case_list = [];
        for(var key in data['counties']) {
            // assign constant chart colors for counties
            if( i == moreChartColors.length ) i = 0;

            data['counties'][key]['lineColor'] = moreChartColors[i++];
            
            var cases = data['counties'][key]['cases'];
            var deaths = data['counties'][key]['deaths'];
            var n = cases.length - 1;
            var st_abbr = data['counties'][key]['state_abbr']
            var st_name = data['counties'][key]['state']
            var cty_name = data['counties'][key]['county']
            var fips = data['counties'][key]['fips']
            var pop = data['counties'][key]['population'];

            var new_cases = cases[n] - cases[n-1];
            var new_deaths = deaths[n] - deaths[n-1];

            var chk_name = 'chk-topcounty-' + fips;
            $chk = $('<input type="checkbox"/>').val(key).attr('name', chk_name).attr('id', chk_name).addClass('form-check-input');
            avg_cases = marginal_value(cases, rollingLen);
            avg_deaths = marginal_value(deaths, rollingLen);
            var row = $table.row.add([fips, $chk.prop('outerHTML'), 99, key,
              tot(cases, n), per_capita(tot(cases, n), pop),
              new_cases, per_capita(new_cases, pop),
              avg_cases, per_capita(avg_cases, pop),
              tot(deaths, n), per_capita(tot(deaths, n), pop, 'deaths'),
              new_deaths, per_capita(new_deaths, pop, 'deaths'),
              avg_deaths, per_capita(avg_deaths, pop, 'deaths')
            ]).node();
            case_list.push({code: fips, cases: cases[n]});
        }

        $table.draw();
        $('#topcounty-table input').click(function(event) {
            tableCheckboxClick(this, 2);
        });

        case_list.sort(function(b, a) { return a.cases - b.cases });
        for(i=0;i<5;i++) {
            $('#chk-topcounty-' + case_list[i].code).prop('checked', true);
        }

        config[2].data.labels = data['days'].slice(dayOffset);
        updateTimeSeries(2);

        updateTodayChart();
        config[4].chart_ = new Chart($('#chart5'), config[4]);
    });
}

function autoCheck(id, offset, n) {

    var nRows = 0;
    $('#' + id + '-table').DataTable().rows().every(function(idx, tableLoop, rowLoop) {
        var code = this.data()[0];
        var identifier = '#chk-' + id + '-' + code;
        var isAggregate = $(identifier).closest('tr').hasClass('aggregate');
        if( !isAggregate && nRows < n ) {
            $(identifier).prop('checked', true);
            nRows++;
        } 
        else
            $(identifier).prop('checked', false);
    });

    updateTimeSeries(offset);
    config[offset].chart_.update();
}

function tableParams(id, offset) {

    /* Column layout:
       0:  ID (never visible)
       1:  selection checkbox
       2:  rank order (auto display)
       3:  state/county name
       4:  total cases
       5:  cases/capita
       6:  new cases
       7   new cases/capita
       8:  rolling average cases
       9:  rolling average cases/capita
       10: total deaths
       11: deaths/capita
       12: new deaths
       13: new deaths/capita
       14: rolling average deaths
       15: rolling average cases/capita
    */
    return {
      paging: false,
      autoWidth: false,
      searching: true,
      info: false,
      order: [[ 4, 'desc' ]],
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
            orderable: false,
            searchable: false,
            targets: [1, 2]
          },
          {
            /* new/daily/avercase cases */
            render: function(data) {
                return formatters.number(data)
            },
            targets: [4, 6, 8, 10, 12, 14]
          },
          {
            /* all per capitas */
            render: function(data) {
                return data.toFixed(3)
            },
            targets: [5, 7, 9, 11, 13, 15]
          },
          /* discontinued: trends
          {
            render: function(data) {
                return data.toFixed(2)
            },
            targets: [8, 13]
          },
          */
          {
            visible: false,
            targets: [0, 10, 11, 12, 13, 14, 15]
          }
      ]
    };
}

$(document).ready(function() {


    $('#state-table').DataTable(tableParams('state', 0));
    $('#county-table').DataTable(tableParams('county', 1));
    $('#topcounty-table').DataTable(tableParams('topcounty', 2));
    $('#vaccines-table').DataTable({
      paging: false,
      autoWidth: false,
      searching: true,
      info: false,
      order: [[ 4, 'desc' ]],
      dom: 'Bfrtip',
      buttons: [
        { text: 'Top 5',  action: function() { autoCheck('vaccines', 3,  5) } },
        { text: 'Top 10', action: function() { autoCheck('vaccines', 3, 10) } },
        { text: 'None',   action: function() { autoCheck('vaccines', 3, -1) } },
      ],
      columnDefs: [
          {
            visible: false,
            targets: 0
          },
          {
            orderable: false,
            searchable: false,
            targets: [1, 2]
          },
          {
            render: function(data) {
                return formatters.number(data)
            },
            targets: [4, 6, 8, 10, 12, 14, 17, 19, 21, 23, 25, 27]
          },
          {
            render: function(data) {
                return data.toFixed(3);
            },
            targets: [5, 7, 9, 11, 13, 15, 18, 20, 22, 24, 26, 28]
          },
          {
            render: function(data) {
                return formatters.pct_label(data);
            },
            targets: 16
          },
          {
            visible: false,
            targets: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]
          }
      ]
    });

    /* 3rd column (offset=2) is a rank-order column which we draw regardless of value or row
       order. Normally the i parameter could simply be drawn as is, but we don't want to
       include the aggregate row in the rank order so we maintain a separate counter
    */
    $('table.table-cases').each(function() {
      var t = $(this).DataTable();
      t.on('order.dt search.dt', function() {
        var counter = 0;
        t.column(2, {search: 'applied', order: 'applied'}).nodes().each(function(cell, i) {
            var isAggregate = $(cell).closest('tr').hasClass('aggregate');
            if( isAggregate ) {
                cell.innerHTML = '';
            }
            else {
                cell.innerHTML = counter+1;
                counter++;
            }
        });
      }).draw();
    });

    $('input.logscale').change(function() {
        var offset = parseInt($(this).attr('data-offset'));
        if( this.checked ) {
            config[offset].options.scales.yAxes[0].type = 'logarithmic';
        }
        else {
            config[offset].options.scales.yAxes[0].type = 'linear';
        }

        config[offset].chart_.update();
    });

    $('input.percapita').change(function() {
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

    $('#states-select, #local-select, #topcounty-select, #vaccines-select').change(function() {
        var offset = parseInt($(this).attr('data-offset'));
        var parts = $(this).val().split('-');
        config[offset].settings.field = parts[0];
        config[offset].settings.aggregation = parts[1];
        updateTimeSeries(offset);

        $table = $(config[offset].settings.uiContainer).DataTable();
        if( offset == 3 ) {
            if( parts[1] == 'adr' ) {
                $('#chart4-tab .chart-wrapper input').prop('checked', false).prop('disabled', true);
                config[3].settings.perCapita = false;
            }
            else
                $('#chart4-tab .chart-wrapper input').removeAttr('disabled');

            for(var i=4;i<29;i++) {
                var vis = false;
                if( parts[0] == 'vaccines_distributed' )
                    vis = i >= 4 && i < 10;
                else if( parts[0] == 'vaccines_administered' )
                    vis = i >= 10 && i < 17;
                else if( parts[0] == 'vaccines_admin1' )
                    vis = i >= 17 && i < 23;
                else if( parts[0] == 'vaccines_complete' )
                    vis = i >= 23;

                $table.column(i).visible(vis);
            }
        }
        else {
            for(var i=4;i<16;i++) {
                if( parts[0] == 'cases' )
                    $table.column(i).visible(i<10);
                else
                    $table.column(i).visible(i>=10);
            }
        }
        $table.draw();

        config[offset].chart_.update();
    });

    $('#local-shade-select').change(function() {
      var menuItem = $(this).val();
      $('#county-table').removeClass('table-comm-levels table-trans-levels');
      if( menuItem != 'none' ) {
        $('#county-table').addClass('table-' + menuItem);
      }
    });

    $('#state-detail-select').change(function() {
      updateState($(this).val(), true);
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
        }
        else if( p == 2 ) {
            config[1].chart_ = new Chart($('#chart2'), config[1]);
        }
        else if( p == 3 ) {
            config[2].chart_ = new Chart($('#chart3'), config[2]);
        }
        else if( p == 4 ) {
            config[3].chart_ = new Chart($('#chart4'), config[3]);
        }
    });

    initialize();
});
