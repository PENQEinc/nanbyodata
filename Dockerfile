# Pythonのベースイメージを指定
FROM python:3.8

# 作業ディレクトリを設定
WORKDIR /app

# Pipfileをコピー
COPY Pipfile /app/

# pipenvをインストールし、Pipfileに基づいて依存関係をインストール
RUN pip install pipenv && \
    pipenv install --deploy --ignore-pipfile

# アプリケーションのソースコードをコピー
COPY . /app

# uWSGIを実行
EXPOSE 8000
CMD ["sh", "/app/scripts/start_app.sh"]
