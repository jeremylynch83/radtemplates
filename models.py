from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager
 
login = LoginManager()
db = SQLAlchemy()

# Login stuff 

class userModel(UserMixin, db.Model):
    __tablename__ = 'users'
 
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(80), unique=True)
    username = db.Column(db.String(100))
    password_hash = db.Column(db.String())
    templates_modules = db.Column(db.UnicodeText())
    prefs = db.Column(db.UnicodeText())

    def set_password(self,password):
        self.password_hash = generate_password_hash(password)
     
    def check_password(self,password):
        return check_password_hash(self.password_hash,password)

    def get_username(self):
        return self.username

    def save_templates_modules(self, text):
        self.templates_modules = text

    def get_templates_modules(self):
        return self.templates_modules

    def get_prefs(self):
        return self.prefs 

    def save_prefs(self, prefs):
        self.prefs = prefs

@login.user_loader
def load_user(id):
    return userModel.query.get(int(id))

# Public database stuff


class publicModel(db.Model):
    __tablename__ = 'store'
    TEMPLATE_TYPE = 0;
    MODULE_TYPE = 1;

    id = db.Column(db.Integer, primary_key=True) # Dunno
    name = db.Column(db.String(80), unique=True) # Name of template
    modality = db.Column(db.String(80))
    region = db.Column(db.String(80))
    specialty = db.Column(db.String(80)) 
    type_of = db.Column(db.Integer) # TEMPLATE_TYPE = 0,MODULE_TYPE = 1;
    owner = db.Column(db.String(80)) # Who created it (can destroy it)
    meta = db.Column(db.UnicodeText()) # Meta-data
    xml = db.Column(db.UnicodeText())

    def get_template_names():
        return True

    def delete_template(self, name):
        return True

    def get_template_data(self, list_of_names):
        return True

