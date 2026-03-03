import os
import threading
import time
import json
from datetime import datetime, timedelta
from flask import Flask, send_from_directory
import smtplib
from email.mime.text import MIMEText

# 配置
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(PROJECT_DIR, 'daily-routine-data.json')
EMAIL_HOST = 'smtp.example.com'  # 修改为你的SMTP服务器
EMAIL_PORT = 465  # 通常SSL端口
EMAIL_USER = 'your_email@example.com'  # 修改为你的邮箱
EMAIL_PASS = 'your_password'  # 修改为你的邮箱密码或授权码
TO_EMAIL = 'target_email@example.com'  # 修改为收件人邮箱
REMIND_BEFORE_MINUTES = 30  # 提前多少分钟提醒

# Flask 静态文件托管
app = Flask(__name__, static_folder=PROJECT_DIR)

@app.route('/')
def index():
    return send_from_directory(PROJECT_DIR, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(PROJECT_DIR, path)

def send_email(subject, body):
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
            with open(JSON_PATH, 'r', encoding='utf-8') as f:
                schedules = json.load(f)
        except Exception as e:
            print('读取日程数据失败:', e)
            time.sleep(60)
            continue

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
            # 判断是否在提醒窗口内
            key = f"{date_str}-{start_time}-{item.get('title','')}"
            if now < dt <= remind_time and not item.get('done', False) and key not in sent:
                subject = f"日程提醒：{item.get('title', '')}"
                body = f"即将开始：{item.get('title', '')}\n时间：{dt_str}\n备注：{item.get('note', '')}"
                try:
                    send_email(subject, body)
                    print(f"已发送提醒邮件：{item.get('title', '')}")
                    sent.add(key)
                except Exception as e:
                    print('邮件发送失败:', e)
        time.sleep(60)  # 每分钟检查一次

if __name__ == '__main__':
    # 启动邮件提醒线程
    t = threading.Thread(target=check_and_notify, daemon=True)
    t.start()
    # 启动Flask静态文件服务
    app.run(host='0.0.0.0', port=8080)
