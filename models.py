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

@login.user_loader
def load_user(id):
    return userModel.query.get(int(id))

# Public database stuff
class publicModel(db.Model):
    __tablename__ = 'store'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True)

    def save_template(self, text):
        return True