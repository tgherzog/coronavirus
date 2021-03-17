
"""
Fetches latest vaccine status data from CDC and stores it in a file.

Usage:
    cdc.py [--verbose] FILE

Options;
    --verbose, -v       Report key errors
    
"""
import requests
import pandas as pd
from docopt import docopt
import logging

docopts = docopt(__doc__)

df = pd.read_csv(docopts['FILE'])
df['Date'] = pd.to_datetime(df['Date'])
df.set_index(['Date','FIPS'], inplace=True)

response = requests.get('https://covid.cdc.gov/covid-data-tracker/COVIDData/getAjaxData?id=vaccination_data')

for row in response.json()['vaccination_data']:
    date = pd.to_datetime(row['Date'])
    fips = row['Location']
    try:
        df.loc[(date,fips), df.columns] = [row['Doses_Distributed'], row['Doses_Administered'], row['Administered_Dose1_Recip'], row['Administered_Dose2_Recip'], row['Series_Complete_Yes']]
    except KeyError as err:
        if docopts['--verbose']:
            logging.warning('{} not found for {}'.format(err, fips))

df.to_csv(docopts['FILE'])
