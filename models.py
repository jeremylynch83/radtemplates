from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager
 
login = LoginManager()
db = SQLAlchemy()
 
class userModel(UserMixin, db.Model):
    __tablename__ = 'users'
 
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(80), unique=True)
    username = db.Column(db.String(100))
    password_hash = db.Column(db.String())
    templates = db.Column(db.UnicodeText())
    modules = db.Column(db.UnicodeText())

    def set_password(self,password):
        self.password_hash = generate_password_hash(password)
     
    def check_password(self,password):
        return check_password_hash(self.password_hash,password)

    def get_username(self):
        return self.username

    def save_templates(self, text):
        self.templates = text

    def get_templates(self):
        return self.templates
 
    def save_modules(self, text):
        self.modules = text

    def get_modules(self):
        return self.modules
 
@login.user_loader
def load_user(id):
    return userModel.query.get(int(id))