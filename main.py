from flask import Flask, Response, json, render_template, request, redirect, url_for, flash, jsonify, make_response
from flask_login import current_user, login_user, login_required, logout_user
from models import db, userModel, login
import os
import secrets
from werkzeug.utils import secure_filename

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
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///<db_name>.db'
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
                "templates": current_user.get_templates(),
                "username": current_user.get_username(),
                "modules": current_user.get_modules()
            }
            return jsonify(data)
     
    if request.method == 'POST':
        req = request.get_json()
        email = req["user_email"]
        user = userModel.query.filter_by(email = email).first()
        if user is not None and user.check_password(req['user_password']):
            login_user(user)
            #print(user.get_templates())
            data = {
                "templates": user.get_templates(),
                "username": user.get_username(),
                "modules": current_user.get_modules()
            }
            return jsonify(data)

        if user is None or not user.check_password(req['user_password']):
            return "failure", 400
            
    return redirect('/')

@app.route('/check-login', methods=['GET'])
def check_login():
    if current_user.is_authenticated:
            data = {
                "templates": current_user.get_templates(),
                "username": current_user.get_username(),
                "modules": current_user.get_modules()
            }
            #print(data)
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
 
        #if userModel.query.filter(email==email):
        #    print("failure")
        #    return ('Email already Present'), 400
             
        user = userModel(email=email, username=username)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        return "success"

# Logout
@app.route('/logout', methods=['POST'])
def logout():
    logout_user()
    return redirect('/')

@app.route('/index/export-report', methods=['POST'])
def export_report():
    req = request.get_json()
    xml = req["xml"]
    current_user.save_templates(xml)
    db.session.add(current_user)
    db.session.commit()
    return req

@app.route('/index/export-module', methods=['POST'])
def export_module():
    req = request.get_json()
    xml = req["xml"]
    current_user.save_modules(xml)
    db.session.add(current_user)
    db.session.commit()
    return req


@app.route('/', methods = ['POST', 'GET'])
def index():
    return render_template('index.html', title='TemplateReporting')

@app.route('/module-editor', methods = ['POST', 'GET'])
def module_editor():
    return render_template('module_editor.html', title='Module Editor')

if __name__ == '__main__':
    app.run()