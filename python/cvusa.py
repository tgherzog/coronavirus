
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
import sys
import json
from pprint import pprint
from docopt import docopt

options = docopt(__doc__)

def safe_cast(value, to_type=int, default=None):

    try:
        return to_type(value)
    except (ValueError, TypeError):
        return default
       

def csse_refs(locale='global'):

    try:
        git_token = os.environ['GITHUB_ANONYMOUS_TOKEN']
    except KeyError:
        raise OSError('GITHUB_ANONYMOUS_TOKEN must be defined as a valid access token in your environment')

    git = Github(git_token)
    repo = git.get_repo('CSSEGISandData/COVID-19')

    if locale == 'global':
        c_url, d_url, r_url = map(lambda x: 'csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_{}_global.csv'.format(x), ['confirmed', 'deaths', 'recovered'])
        c = repo.get_contents(c_url)
        d = repo.get_contents(d_url)
        r = repo.get_contents(r_url)

        c_path, d_path, r_path = c.download_url, d.download_url, r.download_url
        
    elif locale == 'usa':
        c_url, d_url = map(lambda x: 'csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_{}_US.csv'.format(x), ['confirmed', 'deaths'])
        c = repo.get_contents(c_url)
        d = repo.get_contents(d_url)
        
        c_path, d_path, r_path = c.download_url, d.download_url, None

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

confirmed_url, deaths_url, recovery_url, last_modified = csse_refs('usa')

c = get_covid_frame(confirmed_url, True)
d = get_covid_frame(deaths_url, True)

c['FIPS'] = c['FIPS'].map(lambda x: '{:05d}'.format(int(np.nan_to_num(x))))
d['FIPS'] = d['FIPS'].map(lambda x: '{:05d}'.format(int(np.nan_to_num(x))))

# date columns are those that look like */*/*
date_columns = list(filter(lambda x: len(x.split('/')) == 3, c.columns))
date_columns_with_century = list(map(add_century, date_columns))

# fetch background data
bg1 = get_basic_data('usstate').reset_index().set_index('name')
bg2 = get_basic_data('uscty')

# this seems like a crazy way to get the utc offset but it's the best I could figure out
utcoffset = datetime.now().astimezone().utcoffset().total_seconds()

data = {
  'build_date': datetime.strftime(datetime.utcnow(), '%Y-%m-%dT%H:%M:%S+0000'),
  'update_date': datetime.strftime(last_modified, '%Y-%m-%dT%H:%M:%S+0000'),
  'update_date_epoch': last_modified.timestamp() + utcoffset,
  'most_recent_day': date_columns_with_century[-1],
  'days': date_columns_with_century,
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

# This is probably not the official national estimate, but for this purpose it's close enough
data['states']['USA'] = case_data(cases[date_columns], deaths[date_columns], code='USA', population=int(bg1['population'].sum()))

c2 = c.groupby('Province/State').sum()
d2 = d.groupby('Province/State').sum()

for key,row in c2.iterrows():
    code = bg1['code'].get(key)
    if code:
        data['states'][key] = case_data(row[date_columns], d2.loc[key, date_columns], code=code, population=int(bg1['population'].get(key)))

        counties = []
        for k,v in c[c['Province/State']==key].dropna(subset=['Admin2']).iterrows():
            if c.loc[k, avg_start] > 0:
                avg = round(pow(c.loc[k, today] / c.loc[k, avg_start], 1/3) - 1, 6)
            else:
                avg = 0;

            counties.append({'name': v['Admin2'], 'cases': int(v[today]), 'deaths': int(d.loc[k, today]),
              'new_cases': int(v[today]-v[yesterday]), 'new_deaths': int(d.loc[k, today] - d.loc[k, yesterday]), 'avg_growth': avg})

        with open(os.path.join(options['TARGET_DIR'], code + '.json'), 'w') as fd:
            json.dump(counties, fd)

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

    data['counties'][addr] = case_data(row[date_columns], d.loc[key, date_columns], fips=fips, county=admin2, state=row['Province/State'], state_abbr=code, population=safe_cast(bg2['population'].get(fips, None)))
    
with open(os.path.join(options['TARGET_DIR'], 'USA.json'), 'w') as fd:
    json.dump(data, fd)

