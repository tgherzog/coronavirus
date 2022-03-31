
'''
Read COVID-19 case data from HDX and store as a set of json files.

This can be used to provide a no-backend API if the files are saved
in the DocumentRoot of a server. For example:

http://some.host/all.json  # global data, plus manifest of other countries
http://some.host/CAN.json  # a specific country

Usage:
  cvusa.py TARGET_DIR

'''

import requests
import pandas as pd
import numpy as np
from wbgapi.economy import coder
from datetime import datetime
from github import Github
import os
import re
import sys
import json
from pprint import pprint
from docopt import docopt

options = docopt(__doc__)
repo = None

def safe_cast(value, to_type=int, default=None):

    try:
        return to_type(value)
    except (ValueError, TypeError):
        return default
       

def get_repo_file(path):

    global repo

    try:
        git_token = os.environ['GITHUB_ANONYMOUS_TOKEN']
    except KeyError:
        raise OSError('GITHUB_ANONYMOUS_TOKEN must be defined as a valid access token in your environment')

    git = Github(git_token)
    repo = git.get_repo('CSSEGISandData/COVID-19')
    for elem in repo.get_contents(path):
        yield elem

def csse_refs(locale='global'):
    c_path = d_path = r_path = None
    if locale == 'global':
        c_url, d_url, r_url = map(lambda x: 'csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_{}_global.csv'.format(x), ['confirmed', 'deaths', 'recovered'])
        
    elif locale == 'usa':
        c_url, d_url = map(lambda x: 'csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_{}_US.csv'.format(x), ['confirmed', 'deaths'])
        r_url = None

    for elem in get_repo_file('csse_covid_19_data/csse_covid_19_time_series'):
        if elem.path == c_url:
            c_path = elem.download_url
        elif elem.path == d_url:
            d_path = elem.download_url
        elif elem.path == r_url:
            r_path = elem.dowload_url

    # get the modification date from the latest commit for the confirmed case file
    last_modified = repo.get_commits(path=c_url)[0].last_modified
    last_modified = datetime.strptime(last_modified, '%a, %d %b %Y %H:%M:%S %Z')    # assumes this is GMT, b/c strptime actually ignores the timezone. Else use dateutils.parser

    return c_path, d_path, r_path, last_modified


def get_covid_frame(url, admin2=False):

    df = pd.read_csv(url)
    df.rename(columns={'Province_State': 'Province/State', 'Country_Region': 'Country/Region', 'Long_': 'Long'}, inplace=True)
    if admin2:
        df['stp_key'] = df['Admin2'].fillna('').str.replace(r'\W','').str.upper()
        df['geokey'] = df['Province/State'].fillna('_') + ':' + df['Country/Region'].fillna('_') + ':' + df['Admin2'].fillna('_')
    else:
        df['stp_key'] = df['Province/State'].fillna('').str.replace(r'\W','').str.upper()
        df['geokey'] = df['Province/State'].fillna('_') + ':' + df['Country/Region'].fillna('_')

    df.set_index('geokey', inplace=True)

    return df

def get_basic_data(level):
    ''' Fetches background data at the country, usstate or uccty level
    '''

    url = 'https://raw.githubusercontent.com/tgherzog/basicdata/master/data/{}.' + level + '.csv'

    pop = pd.read_csv(url.format('pop'), dtype=str).set_index('id')
    pop['population'] = pop.population.astype('int')

    area = pd.read_csv(url.format('area'), dtype=str).set_index('id')[['land_area']]
    area['land_area'] = area.land_area.astype('int')

    cen  = pd.read_csv(url.format('centroid'), dtype=str).set_index('id')[['lat', 'long']]
    cen[['lat', 'long']] = cen[['lat', 'long']].astype('float')

    return pop.join(area).join(cen)


def case_data(c, d, **kwargs):

    ds = kwargs
    ds['cases'] = list(map(lambda x: int(x), c))
    ds['deaths'] = list(map(lambda x: int(x), d))
    return ds

def add_century(x):

    month,day,year = x.split('/',maxsplit=2)
    return '/'.join([month, day, str(int(year)+2000)])

def nan_to_none(x):

    if type(x) is dict:
        z = {}
        for k,v in x.items():
            z[k] = None if v is np.nan else v

        return z

    raise ValueError

    # else, assume an iterable
    try:
        z = []
        for elem in x:
            z.append(None if elem is np.nan else elem)

        return z
    except:
        return None if x is np.nan else x
    

confirmed_url, deaths_url, recovery_url, last_modified = csse_refs('usa')

c = get_covid_frame(confirmed_url, True)
d = get_covid_frame(deaths_url, True)

c['FIPS'] = c['FIPS'].map(lambda x: '{:05d}'.format(int(np.nan_to_num(x))))
d['FIPS'] = d['FIPS'].map(lambda x: '{:05d}'.format(int(np.nan_to_num(x))))

# load vaccine data
vaccine_data = pd.read_csv('http://cvapi.zognet.net/v2/USA/vaccines.csv')
vaccine_data['Date'] = pd.to_datetime(vaccine_data['Date'])
vaccine_data.set_index(['Date', 'FIPS'], inplace=True)

# there's no data for 1/16-1/18 which makes the charts ugly. Since 1/15 value
# are identical to 1/19 we just remove them. The rest of the series *should*
# be complete on a daily basis (but this code doesn't assume that)
vaccine_data.drop('1/15/2021', inplace=True)

# In case there are gaps in the series, we construct our day index by hand
vc1 = vaccine_data.index.unique(0)[0]
vaccine_columns = []
for i in range(0, (vaccine_data.index.unique(0)[-1] - vaccine_data.index.unique(0)[0]).days + 1):
    vaccine_columns.append((vaccine_data.index.unique(0)[0] + pd.Timedelta(days=i)).strftime('%-m/%-d/%Y'))

# date columns are those that look like */*/*
date_columns = list(filter(lambda x: len(x.split('/')) == 3, c.columns))
date_columns_with_century = list(map(add_century, date_columns))

# fetch background data
bg1 = get_basic_data('usstate').reset_index().set_index('name')
bg2 = get_basic_data('uscty')

# CDC data is county level, so it's easiest just to add it to bg2
# set cdc columns to nan by default
bg2['cases_7d_100k'] = np.nan
bg2['admits_7d_100k'] = np.nan
bg2['bed_usage_perc'] = np.nan
bg2['test_rate_perc'] = np.nan
bg2['comm_lev'] = np.nan
bg2['trans_lev'] = np.nan

try:
    # I scraped this URL from the community levels page - not sure how durable it is
    result = requests.get('https://www.cdc.gov/coronavirus/2019-ncov/modules/science/us-community-levels-by-county.json').json()
    for row in result['data']:
        fips = row['FIPS']
        if fips not in bg2.index:
            continue

        bg2.loc[fips, 'comm_lev'] = row.get('COVID-19 Community Level', '').lower()
        try:
            bg2.loc[fips, 'cases_7d_100k'] = float(row['COVID-19 Community Level - Cases per 100k'])
        except:
            pass

        try:
            bg2.loc[fips, 'admits_7d_100k'] = float(row['COVID-19 Community Level - COVID Hospital Admissions per 100k'])
        except:
            pass

        try:
            bg2.loc[fips, 'bed_usage_perc'] = float(re.search(r'^(.+)%$', row['COVID-19 Community Level - COVID Inpatient Bed Utilization']).group(1))
        except:
            pass
except:
    pass


# transmission level data comes from a Socrata endpoint with historical data. We sort by report_date and take records with the first encountered
# date, and stop when we hit a different date. We assume less than 3500 counties
row_ = {}
try:
    report_date = None
    result = requests.get('https://data.cdc.gov/resource/8396-v7yb.json?$order=report_date+DESC&$limit=3500').json()
    for row in result:
        row_ = row
        if report_date is None:
            report_date = row['report_date']
        elif report_date != row['report_date']:
            break

        fips = row['fips_code']
        if fips not in bg2.index:
            continue

        if row.get('community_transmission_level'):
            bg2.loc[fips, 'trans_lev'] = row['community_transmission_level'].lower()
        try:
            bg2.loc[fips, 'test_rate_perc'] = float(row['percent_test_results_reported'])
        except:
            pass
except:
    pass

# bg1.to_pickle('bg1.pickle')
# bg2.to_pickle('bg2.pickle')

# this seems like a crazy way to get the utc offset but it's the best I could figure out
utcoffset = datetime.now().astimezone().utcoffset().total_seconds()

build_date = datetime.strftime(datetime.utcnow(), '%Y-%m-%dT%H:%M:%S+0000')
data = {
  'build_date': build_date,
  'update_date': datetime.strftime(last_modified, '%Y-%m-%dT%H:%M:%S+0000'),
  'update_date_epoch': last_modified.timestamp() + utcoffset,
  'most_recent_day': date_columns_with_century[-1],
  'most_recent_vaccine_day': vaccine_columns[-1],
  'days': date_columns_with_century,
  'vaccine_days': vaccine_columns,
  'cases': None,
  'deaths': None,
  'new_cases': None,
  'new_deaths': None,
  'states': {},
  'counties': {}
}

ndays_avg = 3 # number of days to average
today = date_columns[-1]
yesterday = date_columns[-2]
avg_start = date_columns[-1 - ndays_avg]

cases = c.sum()
deaths = d.sum()
data['cases'] = int(cases[today])
data['deaths'] = int(deaths[today])
data['new_cases'] = int(cases[today] - cases[yesterday])
data['new_deaths'] = int(deaths[today] - deaths[yesterday])

# This is probably not the official national population estimate, but for this purpose it's close enough
us_pop = int(bg1['population'].sum())

data['states']['USA'] = case_data(cases[date_columns], deaths[date_columns], code='USA', fips='00', admin=0,
  population=us_pop,
  cdc={'comm_lev': None, 'trans_lev': None},
  # tests=[None]*len(date_columns),
  # hospitalizations=[None]*len(date_columns),
  vaccines_distributed=[None]*len(vaccine_columns), vaccines_administered=[None]*len(vaccine_columns),
  vaccines_admin1=[None]*len(vaccine_columns), vaccines_complete=[None]*len(vaccine_columns))

data['states']['USA']['cdc']['comm_lev']  = np.round(bg2.groupby('comm_lev').sum()['population'] / us_pop, 4).to_dict()
data['states']['USA']['cdc']['trans_lev'] = np.round(bg2.groupby('trans_lev').sum()['population'] / us_pop, 4).to_dict()

c2 = c.groupby('Province/State').sum()
d2 = d.groupby('Province/State').sum()

for key,row in c2.iterrows():
    code = bg1['code'].get(key)
    fips = bg1['id'].get(key)
    if code:
        data['states'][key] = case_data(row[date_columns], d2.loc[key, date_columns], code=code, fips=fips, admin=1,
          population=int(bg1['population'].get(key)),
          cdc={'comm_lev': None, 'trans_lev': None},
          # tests=[None]*len(date_columns),
          # hospitalizations=[None]*len(date_columns),
          vaccines_distributed=[None]*len(vaccine_columns), vaccines_administered=[None]*len(vaccine_columns),
          vaccines_admin1=[None]*len(vaccine_columns), vaccines_complete=[None]*len(vaccine_columns))

        data['states'][key]['cdc']['comm_lev']  = np.round(bg2[bg2.index.str.startswith(fips)].groupby('comm_lev').sum()['population'] / bg1.loc[key, 'population'], 4).to_dict()
        data['states'][key]['cdc']['trans_lev'] = np.round(bg2[bg2.index.str.startswith(fips)].groupby('trans_lev').sum()['population'] / bg1.loc[key, 'population'], 4).to_dict()

for key,row in c.sort_values(today, ascending=False).head(50).iterrows():
    fips = row['FIPS']
    code = bg1['code'].get(row['Province/State'])

    # admin2 will be NaN for non-county designations, including territories, cruise ships and VA hospitals
    if pd.isnull(row['Admin2']):
        addr = row['Province/State']
        admin2 = None
    else:
        admin2 = row['Admin2']
        addr = '{}/{}'.format(admin2, code)

    data['counties'][addr] = case_data(row[date_columns], d.loc[key, date_columns], fips=fips, county=admin2, state=row['Province/State'], state_abbr=code, admin=2, population=safe_cast(bg2['population'].get(fips, None)))
    
# cycle through the daily files and add test data - eventually could add hospitalizations
if False:
    # disable this code block
    for obj in get_repo_file('csse_covid_19_data/csse_covid_19_daily_reports_us'):
        x = re.match(r'^(\d{2})-(\d{2})-(\d{4}).csv$', obj.name)
        if x:
            ts = '{}/{}/{}'.format(int(x.group(1)), int(x.group(2)), x.group(3))
            if ts in date_columns_with_century:
                offset = date_columns_with_century.index(ts)
                dailies = pd.read_csv(obj.download_url).set_index('Province_State')
                if 'People_Tested' in dailies:
                    data['states']['USA']['tests'][offset] = dailies.sum()['People_Tested']

                # data['states']['USA']['hospitalizations'][offset] = dailies.sum()['People_Hospitalized']

                for key,row in dailies.iterrows():
                    code = bg1['code'].get(key)
                    if code:
                        if 'People_Tested' in row:
                            data['states'][key]['tests'][offset] = nan_to_none(row['People_Tested'])

                        # data['states'][key]['hospitalizations'][offset] = nan_to_none(row['People_Hospitalized'])

vaccine_keys = {row['code']:k for k,row in data['states'].items()}
for dt in vaccine_data.index.unique(0):

    dStr = dt.strftime('%-m/%-d/%Y')
    offset = vaccine_columns.index(dStr)
    data['states']['USA']['vaccines_distributed'][offset] = int(vaccine_data.loc[(dt, 'US'),'Dist'])
    data['states']['USA']['vaccines_administered'][offset] = int(vaccine_data.loc[(dt, 'US'),'Admin_Total'])
    data['states']['USA']['vaccines_admin1'][offset] = int(vaccine_data.loc[(dt, 'US'),'Admin_1Plus'])
    data['states']['USA']['vaccines_complete'][offset] = int(vaccine_data.loc[(dt, 'US'),'Admin_Complete'])
    for k,row in vaccine_data.xs(dt).iterrows():
        if k in vaccine_keys:
            data['states'][vaccine_keys[k]]['vaccines_distributed'][offset] = int(row['Dist'])
            data['states'][vaccine_keys[k]]['vaccines_administered'][offset] = int(row['Admin_Total'])
            data['states'][vaccine_keys[k]]['vaccines_admin1'][offset] = int(row['Admin_1Plus'])
            data['states'][vaccine_keys[k]]['vaccines_complete'][offset] = int(row['Admin_Complete'])

with open(os.path.join(options['TARGET_DIR'], 'USA.json'), 'w') as fd:
    json.dump(data, fd, allow_nan=False)

# replace Nan with None so we don't get bogus Nan's in the the json script
bg2 = bg2.where(pd.notnull(bg2), None)

for key,row in c2.iterrows():
    code = bg1['code'].get(key)
    if code:
        state_data = {
          'state': key,
          'state_abbr': code,
          'most_recent_day': date_columns_with_century[-1],
          'days': date_columns_with_century,
          'cases': int(row[today]),
          'deaths': int(d2.loc[key, today]),
          'new_cases': int(row[today] - row[yesterday]),
          'new_deaths': int(d2.loc[key, today] - d2.loc[key, yesterday]),
          'counties': {}
        }

        cdc_fields = ['cases_7d_100k', 'admits_7d_100k', 'bed_usage_perc', 'test_rate_perc', 'comm_lev', 'trans_lev']
        for k,v in c[c['Province/State']==key].dropna(subset=['Admin2']).iterrows():
            fips = v['FIPS']
            admin2 = v['Admin2']
            addr = '{}/{}'.format(admin2, code)
            state_data['counties'][addr] = case_data(v[date_columns], d.loc[k, date_columns], fips=fips, county=admin2, admin=2,
                population=safe_cast(bg2['population'].get(fips, None)))

            if fips in bg2.index:
                state_data['counties'][addr]['cdc'] = bg2.loc[fips, cdc_fields].to_dict()
            else:
                state_data['counties'][addr]['cdc'] = {}
                

        with open(os.path.join(options['TARGET_DIR'], code + '.json'), 'w') as fd:
            try:
                json.dump(state_data, fd, allow_nan=False)
            except:
                print('nan found in {}'.format(code))
                json.dump(state_data, fd)
