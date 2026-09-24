import os
from flask import jsonify, send_from_directory
from app import create_app

app = create_app()


@app.route('/api/health')
def health_check():
    return jsonify({"data": {"status": "ok", "service": "krishi-setu-api"}, "error": None})


@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """Dev-time static file serving for uploaded produce photos."""
    upload_dir = app.config.get('UPLOAD_FOLDER', os.path.join(os.path.dirname(__file__), 'uploads'))
    return send_from_directory(upload_dir, filename)


if __name__ == '__main__':
    app.run(debug=True, port=8000)
