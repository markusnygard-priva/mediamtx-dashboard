#!/usr/bin/env python3
from flask import Flask, jsonify
import shutil

app = Flask(__name__)

@app.route('/api/diskspace', methods=['GET'])
def diskspace():
    total, used, free = shutil.disk_usage("/")
    return jsonify({
        "total": total,
        "used": used,
        "free": free
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002)
