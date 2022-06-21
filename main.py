from flask import Flask, Response, json, render_template, request, redirect, url_for, flash, jsonify, make_response
from flask_login import current_user, login_user, login_required, logout_user
from models import db, userModel, login
import requests
import os
import secrets
from werkzeug.utils import secure_filename
from bs4 import BeautifulSoup

class CustomFlask(Flask):
    jinja_options = Flask.jinja_options.copy()
    jinja_options.update(dict(
        block_start_string='<%',
        block_end_string='%>',
        variable_start_string='%%',
        variable_end_string='%%',
        comment_start_string='<#',
        comment_end_string='#>',
    ))

app = CustomFlask(__name__, static_folder='static')
secret = secrets.token_urlsafe(32)
app.secret_key = secret


########################
# Setup login         ##
########################


# Link our SQLite database with SQLALchemy
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///user_templates.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Create the database file before the first user request itself
@app.before_first_request
def create_table():
    db.create_all()

# Link the login instance to our app 
login.init_app(app)
login.login_view = 'login'

@app.route('/login', methods=['POST', 'GET'])
def login():
    print("login")

    if current_user.is_authenticated:
            data = {
                "username": current_user.get_username(),
                "templates_modules": current_user.get_templates_modules(),
            }
            return jsonify(data)
     
    if request.method == 'POST':
        req = request.get_json()
        email = req["user_email"]
        user = userModel.query.filter_by(email = email).first()
        if user is not None and user.check_password(req['user_password']):
            login_user(user)
            return redirect('/app-page')

        if user is None or not user.check_password(req['user_password']):
            return "failure", 400
    

@app.route('/check-login', methods=['GET'])
def check_login():
    if current_user.is_authenticated:
            data = {
                "templates_modules": current_user.get_templates_modules(),
                "username": current_user.get_username(),
            }
            return jsonify(data)
    else:
        return "failure", 200

@app.route('/import-templates', methods=['POST', 'GET'])
def import_templates():
    if current_user.is_authenticated:
        with app.open_resource('static/xml/neuro.xml') as f:
            str = f.read().decode('utf-8')
            data = {
                "templates_modules": str,
            }
            return jsonify(data)
    else:
        return "failure", 200

# Register view
@app.route('/register', methods=['POST', 'GET'])
def register():
    print("register")
    req = request.get_json()

    if current_user.is_authenticated:
        return redirect('/')
     
    if request.method == 'POST':
        email = req["user_email"]
        username = req["user_name"]
        password = req["user_password"]
        starter_data = ""
        with app.open_resource('static/xml/starter.xml') as f:
            starter_data = f.read().decode('utf-8')

        if userModel.query.filter_by(email=email).first():
            return ('Email already Present'), 400

        user = userModel(email=email, username=username)
        user.set_password(password)
        user.save_templates_modules(starter_data)
        db.session.add(user)
        db.session.commit()
        return "success"

# Logout
@app.route('/logout', methods=['POST'])
def logout():
    logout_user()
    return redirect('/')

@app.route('/index/export', methods=['POST'])
def export_module():
    req = request.get_json()
    xml = req["xml"]
    current_user.save_templates_modules(xml)
    db.session.add(current_user)
    db.session.commit()
    return req

@app.route('/radreport-list', methods=['GET'])
def radreport_list():
    list = ""
    with app.open_resource('static/js/radreportlist.json') as f:
        list = f.read().decode('utf-8')
    return list

@app.route('/radreport-get-template', methods=['POST', 'GET'])
def radreport_get_template():
    req = request.get_json();
    x = requests.get('https://api3.rsna.org/radreport/v1/templates/' + req["template_id"] + '/details?' + req["template_version"]).text
    x_json = json.loads(x)
    y = BeautifulSoup(x_json["DATA"]["templateData"], features="lxml").prettify()
    data = {
                "xml": y,
                "template_id": req["template_id"],
                "template_version": req["template_version"]
            }
    return jsonify(data)

@app.route('/', methods = ['POST', 'GET'])
def index():
    return render_template('index.html', title='TemplateReporting')

@app.route('/app-page', methods = ['POST', 'GET'])
def app_page():
    return render_template('app.html', title='TemplateReporting')

if __name__ == '__main__':
    app.run()
