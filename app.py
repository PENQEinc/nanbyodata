# -*- coding: utf-8 -*-

from flask import Flask, session, render_template, request, redirect, url_for, jsonify, make_response, send_from_directory
import os
import re
import json
import sys
import datetime
import copy
import pronto
#import mojimoji
#from werkzeug import secure_filename
from io import StringIO, BytesIO
import csv
# https://blog.capilano-fw.com/?p=398
from flask_babel import Babel
from flask_cors import CORS
import markdown2
import requests
import MySQLdb
import MySQLdb.cursors
from contextlib import contextmanager


app = Flask(__name__)
CORS(app)

# DB設定
db_host = os.getenv('MYSQL_HOST')
db_port = os.getenv('MYSQL_PORT')
db_name = os.getenv('MYSQL_DATABASE')
db_user = os.getenv('MYSQL_USER')
db_pw   = os.getenv('MYSQL_PASSWORD')


app.secret_key = 'nanbyodata0824'
app.config['BASE_URI'] = os.getenv('BASE_URI', 'https://nanbyodata.jp/')

# https://github.com/shibacow/flask_babel_sample/blob/master/srv.py
def get_locale():
    if 'lang' not in session:
        session['lang'] = request.accept_languages.best_match(['ja', 'ja_JP', 'en'])
    if request.args.get('lang'):
        session['lang'] = request.args.get('lang')
    locale = session.get('lang', 'en')
    if locale not in ['ja', 'ja_JP', 'en']:
        locale = 'en'

    return locale
app.jinja_env.globals.update(get_locale=get_locale)

# flask の　@babel.localeselector
# https://stackoverflow.com/questions/75229322/flask-babel-get-locale-seems-to-be-not-working
babel = Babel(app, locale_selector=get_locale)

# debug
app.debug = True



#####
# Routing
# http://qiita.com/Morinikki/items/c2af4ffa180856d1bf30
# http://flask.pocoo.org/docs/0.12/quickstart/
#####

#####
# index page
## GET: display top page
@app.route('/')
def index():
    return render_template('index.html')


#####
# NanbyoData API page
# /api
@app.route('/api')
def api():
    return render_template('api.html')


#####
# NanbyoDataについて
## GET: 
@app.route('/about_nanbyodata')
def about_nanbyodata():
    return render_template('about_nanbyodata.html')


#####
# NANDOについて
## GET: 
@app.route('/about_nando')
def about_nando():
    return render_template('about_nando.html')


#####
# DATASETSについて
## GET: 
@app.route('/datasets')
def datasets():
    return render_template('datasets.html')

#####
# NanbyoData in numbersについて
## GET: 
@app.route('/nanbyodata-in-numbers')
def stats():
    return render_template('nanbyodata-in-numbers.html')

#####
# TEAM
## GET: 
@app.route('/team')
def team():
    return render_template('team.html')


#####
# HELP
## GET: 
@app.route('/help')
def help():
    return render_template('help.html')


#####
# NANDOについて
## GET: 
@app.route('/epidemiology')
def epidemiology():
    return render_template('epidemiology.html')


#####
# NANDO語彙一覧
## GET: 
@app.route('/ontology/nando')
def nando(id_nando=""):
    return render_template('nando.html')


#####
# NANDO URI 転送
## GET: 
#@app.route('/ontology/NANDO_<string:id_nando>')
#def nando_uri(id_nando=""):
#    return redirect(url_for('REST_API_disease', id_nando=id_nando))


#####
# ontology files ダウンロード
## GET: 
@app.route('/ontology/<path:filename>')
def nando_file(filename):
    # https://www.kite.com/python/docs/flask.send_from_directory
    return send_from_directory('ontology',
                               filename, as_attachment=True)


#####
#  annotation files ダウンロード
## GET: 
@app.route('/annotation/<path:filename>')
def annotation_file(filename):
    # https://www.kite.com/python/docs/flask.send_from_directory
    return send_from_directory('annotation',
                               filename, as_attachment=True)


#####
# API: Feedback URL
# GET method
# /feedback?id_from=[FROM ID]&id_to=[TO ID]&type=[GOOD or BAD]
@app.route('/feedback', methods=['GET','POST'])
def api_feedback():
    r_id_from = ""
    r_id_to   = ""
    r_type    = ""
    if request.args.get('id_from') is not None:
        r_id_from = request.args.get('id_from')

    if request.args.get('id_to') is not None:
        r_id_to = request.args.get('id_to')

    if request.args.get('type') is not None:
        r_type = request.args.get('type')

    if r_id_from != "" and r_id_to != "" and r_type != "":
        app.logger.error("Feedback: The link from " + r_id_from + " to " + r_id_to + " is " + r_type)

    return ('OK'), 200


#####
# 疾患ページ
## GET:
@app.route('/disease/NANDO:<string:id_nando>', methods=['GET'])
def REST_API_disease(id_nando=""):
    if request.method == 'GET':
        breadcrumb_html = ''
        if get_locale() == "ja" or get_locale() == "ja_JP":
            onto = pronto.Ontology('./ontology/current_release/nando_ja.obo')
            breadcrumb_html = '<section><h3 class="breadcrumb-title">難病</h3>'
        else:
            onto = pronto.Ontology('./ontology/current_release/nando_en.obo')
            breadcrumb_html = '<section><h3 class="breadcrumb-title">Intractable disease</h3>'
        #sup = list(reversed(list(onto[id_nando].superclasses())))
        sup = list(reversed(list(onto["NANDO:"+id_nando].superclasses())))
        for index, term in enumerate(sup):
            next_term_id = sup[index + 1].id if index < len(sup) - 1 else None
            term_subclasses = (list(onto[term.id].subclasses(with_self=False, distance=1)))
            if next_term_id is None and not term_subclasses:
                continue
            subclass_html = make_selector_subclasses(onto, term.id, next_term_id, index)
            breadcrumb_html += subclass_html
        breadcrumb_html += '</section>'
        
        overview = get_overview(id_nando)
        return render_template('disease.html', id_nando=id_nando, breadcrumb_list_html=breadcrumb_html, title=overview['title'], description=overview['description'])

def make_selector_subclasses(onto, id_nando, next_term_id, index):
    if get_locale() == "ja" or get_locale() == "ja_JP":
        str_subclass = "下位疾患"
    else:
        str_subclass = "Subclass"
    selected_disease_name = onto[next_term_id].name if next_term_id in onto else str_subclass
    html_selector = f'''
    <div class="breadcrumb-tree" style="--i: {index}">
        <div class="inner-tree">
            <div class="wrapper" data-value="{next_term_id}">
                <div class="select-option">{selected_disease_name}</div>
                <div class="option-list">
                    <ul class="options">'''

    sub = onto[id_nando].subclasses(with_self=False, distance=1)
    for term in sub:
        html_selector += f'<li class="option" data-value="{term.id}">{term.name}</li>'
    html_selector += '''
                    </ul>
                </div>
            </div>
        </div>
    </div>'''

    return html_selector

def get_overview(id_nando):
    url = f"{app.config['BASE_URI']}/sparqlist/api/nanbyodata_get_overview_by_nando_id?nando_id={id_nando}"
    response = requests.get(url)
    overview = response.json()
    title = overview.get('label_ja') or overview.get('label_en', '')

    description = overview.get('description')
    if not description:
        mond_desc = overview.get('mondo_decs', [])
        if mond_desc and isinstance(mond_desc, list) and len(mond_desc) > 0:
            description = mond_desc[0].get('id')
        
        if not description:
            description = overview.get('medgen_definition', '')

    return {'title': title, 'description': description}

# Newsページ
@app.route('/news')
def page():
    return render_template('news.html')

@contextmanager
def get_mysql_connection():
    conn = MySQLdb.connect(host=db_host, db=db_name, user=db_user, passwd=db_pw, charset="utf8")
    try:
        yield conn
    finally:
        conn.close()


#####
# API functions for treeview
def api_nanbyo_get_panel_hierarchy(r_nando_id, r_lang):
    response_data = {}
    try:
        with get_mysql_connection() as OBJ_MYSQL:
            col = "trace_ja" if r_lang == "ja" else "trace_en"
            sql = u"select {col} from nanbyodata_nando_panel_upstream_trace where nando_id=%s".format(col=col)
            cr = OBJ_MYSQL.cursor()
            cr.execute(sql, (r_nando_id,))
            rows = cr.fetchall()
            cr.close()
            for row in rows:
                response_data = row[0]
    except Exception as e:
        app.logger.error(f'Error in api_nanbyo_get_panel_hierarchy: {str(e)}')
        raise

    return response_data


def api_nanbyo_get_panel_descendant(r_nando_id, r_lang):
    response_data = []
    with get_mysql_connection() as OBJ_MYSQL:
        sql = u"select B.OntoID, B.OntoName, B.OntoNameJa, B.OntoDescendantNum from nanbyodata_nando_panel_hierarchy as A, nanbyodata_nando_panel as B where A.nando_id=B.OntoID AND A.parent_nando_id=%s order by B.OntoID"
        cr = OBJ_MYSQL.cursor()
        cr.execute(sql, (r_nando_id,))
        rows = cr.fetchall()
        cr.close()
        for row in rows:
            ret_record = {}
            ret_record['nando_id']  = row[0]
            ret_record['name']      = row[1]
            ret_record['name_ja']   = row[2]
            ret_record['num_child'] = row[3]
            ret_record['lang']      = r_lang
            ret_record['displayName'] = row[1]+" <font class=\"treeview-decendant-num\">(" + str(row[3]) + ")</font>"
            if r_lang == "ja" and len(ret_record['name_ja']) > 0:
                ret_record['displayName'] = row[2]+ " <font class=\"treeview-decendant-num\">(" + str(row[3]) + ")</font>"
            ret_record['isFirstTimeLoad'] = True
            ret_record['isParent'] = False
            if row[3] > 0:
                ret_record['isParent'] = True
            else:
                ret_record['displayName'] = row[1]
                if r_lang == "ja" and len(ret_record['name_ja']) > 0:
                    ret_record['displayName'] = row[2]

            response_data.append(ret_record)

    return response_data


#####
# API: Get panel hierarchy
## GET: get upstream hierarchy data
@app.route('/common_nanbyo_get_panel_hierarchy', methods=['GET'])
def common_nanbyo_get_panel_hierarchy():
    try:
        r_nando_id = "NANDO:1200477"
        if request.args.get('nando_id') is not None:
            r_nando_id = request.args.get('nando_id')

        r_lang = "ja"
        if request.args.get('lang') is not None and request.args.get('lang') == "en":
            r_lang = request.args.get('lang')

        response_data = api_nanbyo_get_panel_hierarchy(r_nando_id, r_lang)

        # response_dataが辞書または文字列の場合、JSONとして返す
        if isinstance(response_data, dict):
            return jsonify(response_data)
        elif isinstance(response_data, str):
            # JSON文字列の場合はそのまま返す
            return response_data, 200, {'Content-Type': 'application/json; charset=utf-8'}
        else:
            # その他の場合は空の辞書を返す
            return jsonify({})
    except Exception as e:
        app.logger.error(f'Error in common_nanbyo_get_panel_hierarchy: {str(e)}')
        return jsonify({'error': str(e)}), 500


#####
# API: Get panel descendant
## GET: get descendant nodes data
@app.route('/common_nanbyo_get_panel_descendant', methods=['GET'])
def common_nanbyo_get_panel_descendant():
    try:
        r_lang = "ja"
        if request.args.get('lang'):
            if request.args.get('lang') == "en":
                r_lang = request.args.get('lang')
        r_nando_id = request.args.get('nando_id')

        if not r_nando_id:
            return jsonify({'error': 'nando_id parameter is required'}), 400

        response_data = api_nanbyo_get_panel_descendant(r_nando_id, r_lang)
        return json.dumps(response_data, ensure_ascii=False), 200, {'Content-Type': 'application/json; charset=utf-8'}
    except Exception as e:
        app.logger.error(f'Error in common_nanbyo_get_panel_descendant: {str(e)}')
        return jsonify({'error': str(e)}), 500
