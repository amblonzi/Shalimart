import tarfile
import os

with tarfile.open('/home/tesla/shalimart.tar.gz', 'r:gz') as tar:
    tar.extractall('/home/tesla/Shalimart_app')
print('Extraction complete.')
