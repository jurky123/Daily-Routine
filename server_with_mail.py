import os
import json
import time
import threading
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS


# ── 配置 ──────────────────────────────────────────────
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
EMAIL_HOST = 'smtp.example.com'  # 修改为你的SMTP服务器
EMAIL_PORT = 465                 # 通常SSL端口
EMAIL_USER = 'your_email@example.com'      # 修改为你的邮箱
EMAIL_PASS = 'your_password'               # 修改为邮箱密码/授权码
TO_EMAIL   = 'target_email@example.com'    # 修改为收件人邮箱
REMIND_BEFORE_MINUTES = 30  # 提前多少分钟提醒


# ── Flask 初始化 ─────────────────────────────────────
app = Flask(__name__, static_folder=PROJECT_DIR)
CORS(app)


# ── 数据目录 ─────────────────────────────────────────
USER_DIR = os.path.join(PROJECT_DIR, 'user_data')
os.makedirs(USER_DIR, exist_ok=True)


# ── API：注册 ─────────────────────────────────────────
@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    if not username:
        return jsonify({'success': False, 'error': '用户名不能为空'}), 200
    user_file = os.path.join(USER_DIR, f'{username}.json')
    if os.path.exists(user_file):
        return jsonify({'success': False, 'error': '用户名已存在'}), 200
    with open(user_file, 'w', encoding='utf-8') as f:
        json.dump({'password': password, 'data': []}, f, ensure_ascii=False)
    return jsonify({'success': True}), 200


# ── API：登录 ─────────────────────────────────────────
@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    user_file = os.path.join(USER_DIR, f'{username}.json')
    if not os.path.exists(user_file):
        return jsonify({'success': False, 'error': '用户不存在'}), 200
    with open(user_file, 'r', encoding='utf-8') as f:
        user_data = json.load(f)
    if user_data.get('password', '') != password:
        return jsonify({'success': False, 'error': '密码错误'}), 200
    return jsonify({'success': True}), 200


# ── API：加载日程 ─────────────────────────────────────
@app.route('/api/load', methods=['POST'])
def api_load():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    user_file = os.path.join(USER_DIR, f'{username}.json')
    if not os.path.exists(user_file):
        return jsonify({'success': False, 'data': []}), 200
    with open(user_file, 'r', encoding='utf-8') as f:
        user_data = json.load(f)
    return jsonify({'success': True, 'data': user_data.get('data', [])}), 200


# ── API：保存日程 ─────────────────────────────────────
@app.route('/api/save', methods=['POST'])
def api_save():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    schedules = data.get('data', [])
    user_file = os.path.join(USER_DIR, f'{username}.json')
    if not os.path.exists(user_file):
        return jsonify({'success': False, 'error': '用户不存在'}), 200
    with open(user_file, 'r', encoding='utf-8') as f:
        user_data = json.load(f)
    user_data['data'] = schedules
    with open(user_file, 'w', encoding='utf-8') as f:
        json.dump(user_data, f, ensure_ascii=False)
    return jsonify({'success': True}), 200


# ── 静态文件 ──────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory(PROJECT_DIR, 'index.html')


@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(PROJECT_DIR, path)


# ── 邮件提醒 ──────────────────────────────────────────
def send_email(subject: str, body: str) -> None:
    msg = MIMEText(body, 'plain', 'utf-8')
    msg['From'] = EMAIL_USER
    msg['To'] = TO_EMAIL
    msg['Subject'] = subject
    with smtplib.SMTP_SSL(EMAIL_HOST, EMAIL_PORT) as server:
        server.login(EMAIL_USER, EMAIL_PASS)
        server.sendmail(EMAIL_USER, TO_EMAIL, msg.as_string())


def check_and_notify():
    sent = set()
    while True:
        try:
            for filename in os.listdir(USER_DIR):
                if not filename.endswith('.json'):
                    continue
                user_file = os.path.join(USER_DIR, filename)
                with open(user_file, 'r', encoding='utf-8') as f:
                    user_data = json.load(f)
                schedules = user_data.get('data', [])
                now = datetime.now()
                remind_time = now + timedelta(minutes=REMIND_BEFORE_MINUTES)
                for item in schedules:
                    date_str = item.get('date')
                    start_time = item.get('startTime')
                    if not date_str or not start_time:
                        continue
                    dt_str = f"{date_str} {start_time}"
                    try:
                        dt = datetime.strptime(dt_str, '%Y-%m-%d %H:%M')
                    except Exception:
                        continue
                    key = f"{filename}-{date_str}-{start_time}-{item.get('title','')}"
                    if now < dt <= remind_time and not item.get('done', False) and key not in sent:
                        subject = f"日程提醒：{item.get('title', '')}"
                        body = f"即将开始：{item.get('title', '')}\n时间：{dt_str}\n备注：{item.get('note', '')}"
                        try:
                            send_email(subject, body)
                            print(f"已发送提醒邮件：{item.get('title', '')}")
                            sent.add(key)
                        except Exception as e:
                            print('邮件发送失败:', e)
        except Exception as e:
            print('读取日程数据失败:', e)
        time.sleep(60)


if __name__ == '__main__':
    # 后台线程：每分钟检查并邮件提醒
    t = threading.Thread(target=check_and_notify, daemon=True)
    t.start()

    # 启动服务
    app.run(host='0.0.0.0', port=8080)