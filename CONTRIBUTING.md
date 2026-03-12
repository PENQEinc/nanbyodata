# CONTRIBUTING.md

Thank you for your interest in contributing to this internal project. To maintain code quality and ensure a smooth development process, please adhere to the following guidelines.

---

## 🛠 Prerequisites

Before you begin, ensure you have completed the following steps:
1.  **Fork or Branch**: Create a new branch from `dev`.
2.  **Environment Setup**: Follow the instructions in `README.md` to set up your local development environment.
3.  **Check Issues**: Verify if there is an existing Issue related to your proposed changes. For major architectural changes, please open an Issue for discussion before implementation.

---

## 🚀 Development Workflow

### 1. Branch Naming Convention
Please use the following prefixes for branch names to maintain clarity:
* `feature/` : New features or functional enhancements.
* `bugfix/` : Bug fixes.
* `docs/` : Documentation updates.
* `refactor/` : Code changes that neither fix a bug nor add a feature.

### 2. Coding Standards
* **Testing**: Ensure that your changes do not break existing functionality. Adding unit tests for new features is highly encouraged.
* **Documentation**: Update the internal documentation or inline comments if your changes affect the logic or API.

### 3. Commit Messages
Commit messages should be concise and descriptive. 

---

## 💻 Local development environment

Procedure for preparing a development environment on the local PC instead of on the server.  

* Almost the same as the server environment but use `docker-compose_for_dev.yml` instead of the default `docker-compose.yml`.
* Specify the YML file with the `-f` option.  
* Local development environment also includes the nginx container, so also specify the `NGINX_PORT` port in the `.env` file.(see below)

#### `NGINX_PORT`

* (default: `8888`)  
* Nginx port to listen on. Must be unique in the system.  
* Only required in the local development environment.

### 1. Create network

Run only once when building the environment

```
$ docker network create nanbyodata_dev
```

If you have not created a network, you may get the following error

```
$ docker compose -f docker-compose_for_dev.yml up -d
Error response from daemon: network nanbyodata_dev not found
```

### 2. Create and start container

```
$ docker compose -f docker-compose_for_dev.yml up -d
```

### 3. Check status

```
$ docker-compose -f docker-compose_for_dev.yml ps
NAME                 IMAGE            COMMAND                   SERVICE   CREATED         STATUS         PORTS
nanbyodata-app     nanbyodata-app   "pipenv run uwsgi --…"   app       15 hours ago   Up 9 minutes   0.0.0.0:8000->8000/tcp
nanbyodata-mysql   mysql:5.7.13     "docker-entrypoint.s…"   mysql     15 hours ago   Up 15 hours    0.0.0.0:13306->3306/tcp
nanbyodata-nginx   nginx:1.27.1     "/docker-entrypoint.…"   nginx     15 hours ago   Up 15 hours    0.0.0.0:8888->80/tcp
```

### 4. Load db data

```
$ cp -a /your/path/nanbyodata_nando_panel.dump.sql mysql/sql/nanbyodata_nando_panel.dump.sql
$ docker-compose exec -T mysql sh /scripts/exec_sql_file.sh /scripts/sql/nanbyodata_nando_panel.dump.sql
```

### 5. Stop container

```
$ docker compose -f docker-compose_for_dev.yml stop
```

If the source code is changed, it must be `stop` and then `start`; this can also be done with the `restart` command.

### 6. Delete container

```
$ docker compose -f docker-compose_for_dev.yml down
```

If `.env` or `docker-compose.yml` is changed, delete the container and start it with `up -d`

---

## 📰 Adding News and Resources (Markdown → JSON)

News and Resources are built from Markdown. When you add or update files under `posts/` or `resources/` and push, GitHub Actions generates the corresponding JSON and commits it.

### 1. News

- **Location**: `posts/ja/*.md`, `posts/en/*.md`
- **Filename**: `YYYY-MM-DD-post1.md`, `post2.md`, … (use a number for order when multiple items share the same date)
- **Front matter**: `title`, `tags`, `published`. The body is Markdown (converted to HTML).
- **Build**: Pushing under `posts/` or `scripts/build_news_json.py` updates `static/data/news.json`.

**Sample** (`posts/ja/2025-11-26-post1.md`):

```markdown
---
published: true
title: 'NanbyoData UI/UX update (Version 2025-11-26)'
tags:
  - services
---

This release improves the top page and disease information pages.

## Updates

- Added summary statistics to the top page.
- Added new data to disease pages: Human Genomic Datasets, Facial Features, Compounds, References.
```

### 2.  Resources

- **Location**: `resources/ja/*.md`, `resources/en/*.md`
- **Filename**: `YYYY-MM-DD-resource1.md`, `resource2.md`, … (use a number for order when multiple items share the same date)
- **Front matter**: `title`, `publisher`, `url`, `tags`, `authors`, `description`, `published`
- **Build**: Pushing under `resources/` or `scripts/build_resources_json.py` updates `static/data/resources.json`.

**Sample** (`resources/ja/2025-12-10-resource1.md`):

```markdown
---
published: true
title: 'Machine Learning Approaches to Identifying Undiagnosed Rare Conditions'
publisher: 'JOURNAL OF CELL BIOLOGY'
url: 'https://example.com/paper1'
tags:
  - services
  - pr
authors: 'R. Smith, M. Jones, S. Chen'
description: 'Exploring novel ML algorithms for pattern recognition in EHR data to flag potential undiagnosed rare disease patients for screening. Results suggest a 15% increase in detection rates.'
---
```

### 3. Local build

To regenerate the JSON locally:

```bash
python scripts/build_news_json.py      # → static/data/news.json
python scripts/build_resources_json.py # → static/data/resources.json
```

### 4. Disease List

The Disease List page displays data from `static/data/disease_list.json`. **When the table content is updated, replace this file** (`disease_list.json`) with the new data so that the list, filters, and sort order reflect the latest content.

### 5. News / Resources tag configuration

Tags used in the sidebar and list on the News and Resources pages are managed in `static/data/tags.json`. The `news` and `resources` sections each define their own tags, so you can use different tag sets for news and resources. As with the news list JSON, **dev and production load from GitHub raw** (dev → `dev` branch, production → `master`); **locally, the app reads this file directly**.

### 6. FAQ (Help page)

Edit `static/data/faq.json` directly. No build step or Actions; the Help page loads this file. Add a new Q&A by appending an object to the right `items` array.

**Structure sample**:

```json
{
  "sections": [
    {
      "id": "frequently-asked-questions",
      "title": { "ja": "よくある質問", "en": "Frequently Asked Questions" },
      "subsections": [
        {
          "id": "download",
          "title": { "ja": "ダウンロード", "en": "Download" },
          "items": [
            {
              "question": {
                "ja": "CSV形式でダウンロードするには？",
                "en": "How do I download to CSV?"
              },
              "answer": {
                "ja": "データセットページの「Download」ボタンから…",
                "en": "Use the \"Download\" button on the dataset page…"
              }
            }
          ]
        }
      ]
    }
  ]
}
```


---

## 📮 Pull Request (PR) Procedure

1.  **Submission**: Push your changes and create a Pull Request to the `dev` branch.
2.  **PR Description**: Include the following details in your PR description:
    * **Overview**: A brief summary of the changes.
    * **Related Issues**: Reference any relevant Issue numbers (e.g., `Closes #123`).
    * **Verification**: Confirmation that the code has been tested in a local environment.
3.  **Review Process**: The DBCLS team will serve as the reviewers. At least one approval from a maintainer is required for merging. After creating the PR, please notify the team in the designated Slack channel.

---

## 📝 Reporting Issues

If you encounter bugs or have suggestions for improvements:
* Open a new **Issue** with a clear title.
* Provide detailed steps to reproduce the bug.
* Attach logs or screenshots if applicable.
