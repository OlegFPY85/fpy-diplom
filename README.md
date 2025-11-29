markdown

# Cloud Storage Web Application

## Описание

Веб-приложение облачного хранилища с возможностью загрузки, скачивания, управления файлами и предоставления общего доступа. Приложение построено на Django (бэкенд) и React (фронтенд).

## Технологии

- **Бэкенд**: Python, Django, Django REST Framework, PostgreSQL
- **Фронтенд**: JavaScript, React, Redux, React Router
- **Сервер**: Nginx, Gunicorn
- **Инструменты**: Git, Node.js, Vite

## Установка и запуск

### 1. Установка необходимых пакетов
bash
'''
sudo apt update
sudo apt install python3-pip python3-dev libpq-dev postgresql postgresql-contrib nginx curl python3-venv nodejs npm
'''
2. Клонирование репозитория
bash
'''
git clone https://github.com/OlegFPY85/fpy-diplom.git
cd fpy-diplom
'''
3. Установка бэкенда
3.1. Создание виртуального окружения
bash
'''
cd backend
python3 -m venv venv
source venv/bin/activate
'''
3.2. Установка зависимостей
bash
'''
pip install -r requirements.txt
'''
3.3. Настройка базы данных

Создайте базу данных в PostgreSQL:
sql
'''
CREATE DATABASE mycloud WITH ENCODING 'UTF8';
CREATE USER mycloud_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mycloud TO mycloud_user;
'''
3.4. Настройка переменных окружения

Создайте файл .env в папке backend:
bash
'''
nano .env
'''
Пример содержимого:
plaintext

SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-domain.com,193.227.240.10,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=https://your-domain.com,http://localhost:5173
DB_NAME=mycloud
DB_USER=mycloud_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DJANGO_LOG_LEVEL=INFO

3.5. Применение миграций
bash
'''
python manage.py migrate
python manage.py collectstatic --noinput
'''
3.6. Создание суперпользователя
bash
'''
python manage.py createsuperuser
'''
4. Настройка Gunicorn

Создайте файл службы:
bash
'''
sudo nano /etc/systemd/system/gunicorn.service
'''
Конфигурация (замените your_username на ваше имя пользователя):
ini

[Unit]
Description=gunicorn service
After=network.target

[Service]
User=your_username
Group=www-data
WorkingDirectory=/home/your_username/fpy-diplom/backend
ExecStart=/home/your_username/fpy-diplom/backend/venv/bin/gunicorn \
          --access-logfile - \
          --workers=3 \
          --bind unix:/home/your_username/fpy-diplom/backend/main/project.sock \
          main.wsgi:application

[Install]
WantedBy=multi-user.target

Запустите службу:
bash
'''
sudo systemctl start gunicorn
sudo systemctl enable gunicorn
sudo systemctl status gunicorn
'''
5. Установка фронтенда
5.1. Установка зависимостей
bash
'''
cd ../../frontend
npm install
'''
5.2. Настройка переменных окружения

Создайте файл .env в папке frontend:
ini

VITE_API_URL=https://your-domain.com/api/

5.3. Сборка проекта
bash
'''
npm run build
'''
6. Настройка Nginx
6.1. Создание конфигурации сайта
bash
'''
sudo nano /etc/nginx/sites-available/mycloud
'''
Конфигурация (замените your-domain.com на ваш домен):
nginx

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL сертификаты (сначала используйте самоподписанные, затем замените на Let's Encrypt)
    ssl_certificate /etc/ssl/certs/nginx-selfsigned.crt;
    ssl_certificate_key /etc/ssl/private/nginx-selfsigned.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    # Frontend (React)
    location / {
        root /home/your_username/fpy-diplom/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # Статические файлы Django
    location /static/ {
        alias /home/your_username/fpy-diplom/backend/static/;
        expires 30d;
        add_header Cache-Control public;
    }

    # Медиа файлы
    location /media/ {
        alias /home/your_username/fpy-diplom/backend/media/;
        expires 30d;
        add_header Cache-Control public;
    }

    # Backend API
    location /api/ {
        proxy_pass http://unix:/home/your_username/fpy-diplom/backend/main/project.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin static files
    location /admin/static/ {
        alias /home/your_username/fpy-diplom/backend/static/;
    }
}

6.2. Активация сайта
bash
'''
sudo ln -s /etc/nginx/sites-available/mycloud /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
'''
7. Настройка SSL сертификатов (Let's Encrypt)
bash
'''
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
'''
8. Доступ к приложению

После настройки приложение будет доступно по адресам:

    Основное приложение: https://your-domain.com

    Административная панель: https://your-domain.com/admin

Разработка
Запуск в режиме разработки

Бэкенд:
bash
'''
cd backend
source venv/bin/activate
python manage.py runserver
'''
Фронтенд:
bash
'''
cd frontend
npm run dev
'''
Примечания:

    Замените все вхождения your_username, your-domain.com и your_password на реальные значения

    Для продакшн-среды установите DEBUG=False

    Регулярно обновляйте SSL сертификаты: sudo certbot renew

    Настройте бэкапы базы данных

    Мониторинг логов: sudo journalctl -u gunicorn и sudo tail -f /var/log/nginx/error.log


