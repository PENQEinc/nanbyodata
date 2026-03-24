#!/bin/sh

set -eu

sh /app/scripts/prepare_current_release.sh
exec pipenv run uwsgi --ini "${UWSGI_INI:-uwsgi/uwsgi.ini}"
