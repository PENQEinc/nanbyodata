#!/bin/bash

# 引数のSQLファイルを実行する
mysql -u ${MYSQL_USER} -p${MYSQL_PASSWORD} ${MYSQL_DATABASE} < $1