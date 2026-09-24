from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from .extensions import init_extensions


def create_app(config_class='config.Config'):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # CORS: dev (Vite on :5173), production domain, and Vercel deployments
    cors_origin = app.config.get('CORS_ALLOWED_ORIGIN', 'http://localhost:5173')
    if cors_origin == '*' or cors_origin.lower() == 'all':
        CORS(app, resources={r"/api/*": {"origins": "*"}})
    elif ',' in cors_origin:
        origins = [o.strip() for o in cors_origin.split(',') if o.strip()]
        CORS(app, resources={r"/api/*": {"origins": origins}})
    else:
        # Support configured origin plus any Vercel deployment domain
        CORS(app, resources={r"/api/*": {"origins": [cors_origin, r"https://.*\.vercel\.app"]}})

    JWTManager(app)

    init_extensions(app)

    # Register blueprints
    from .auth.routes import auth_bp
    from .farmer.routes import farmer_bp
    from .buyer.routes import buyer_bp
    from .admin.routes import admin_bp
    from .ml_testing.routes import ml_bp
    from .payments.routes import payments_bp
    from .market_data.routes import market_bp
    from .warehouse.routes import warehouse_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(farmer_bp, url_prefix='/api/farmer')
    app.register_blueprint(buyer_bp, url_prefix='/api/buyer')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(ml_bp, url_prefix='/api/ml')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    app.register_blueprint(market_bp, url_prefix='/api/market')
    app.register_blueprint(warehouse_bp, url_prefix='/api/warehouse')

    return app
