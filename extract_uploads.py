import tarfile
import os

with tarfile.open('/home/tesla/uploads.tar.gz', 'r:gz') as tar:
    tar.extractall('/home/tesla/Shalimart_app/backend')
print('Extraction complete.')
