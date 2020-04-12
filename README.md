
This is a dashboard I wrote for my personal use to better
understand the real time case data for the Coronavirus pandemic
of 2019/2020 (hopefully not 2021 or beyond). This is a personal
project and I make frequent updates to try to improve my understanding.

I post the latest version at <http://tim.zognet.net/apps/coronavirus>
which you are more than welcome to use for your own purposes with the
previous caveat.

You are also free to adapt the code for your own use. The "back end"
is simply a python script that ingests the latest US data from the
[Johns Hopkins Github repository][csse-gh] and saves it as a set
of JSON files. I run this script hourly as a cron job. The front end
is built using [Bootstrap][bs], [jQuery][jq] and [ChartJS][chjs], all of which are loaded
from CDNs so there are no dependencies to download or install.

This dashboard is designed for US data, but I think the front-end could fairly easily
be adapted for other countries. You would just need to modify the python script to generate
a data set for the country of interest.

[csse-gh]: https://github.com/CSSEGISandData/COVID-19
[bs]: https://getbootstrap.com/
[jq]: https://jquery.com/
[chjs]: https://www.chartjs.org/
