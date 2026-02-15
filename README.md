markdown

# ☁️ Cloud Storage Web Application

Веб-приложение облачного хранилища с возможностью загрузки, скачивания, управления файлами и предоставления общего доступа.

## 🚀 Технологии

### Backend
- **Python 3.8+** - основной язык программирования
- **Django** - веб-фреймворк
- **Django REST Framework** - API
- **PostgreSQL** - база данных
- **Gunicorn** - WSGI-сервер

### Frontend
- **React 18** - пользовательский интерфейс
- **Redux** - управление состоянием
- **React Router** - маршрутизация
- **Vite** - сборка проекта

### Infrastructure
- **Nginx** - веб-сервер и обратный прокси
- **Systemd** - управление процессами
- **Let's Encrypt** - SSL сертификаты

## 📋 Предварительные требования

- Ubuntu 20.04+ / Debian 11+
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Git

## 🛠️ Установка и настройка

### 1. Установка системных пакетов

```bash
sudo apt update
sudo apt install python3-pip python3-dev libpq-dev postgresql postgresql-contrib nginx curl python3-venv nodejs npm git
Создание пользователя 
sudo adduser user
Добавляем его в группу sudo:
sudo usermod -aG sudo имя_пользователя
Переключаемся на созданного пользователя
su user
Выходим из root
cd 
2. Клонирование репозитория
bash

git clone https://github.com/OlegFPY85/fpy-diplom.git
cd fpy-diplom

3. Настройка бэкенда (Django)
3.1. Создание виртуального окружения
bash

cd backend
python3 -m venv venv
source venv/bin/activate

3.2. Установка зависимостей Python
bash

pip install -r requirements.txt

3.3. Настройка базы данных PostgreSQL
bash

sudo -u postgres psql

Выполните в консоли PostgreSQL:
sql

CREATE DATABASE mycloud;
ALTER USER postgres WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mycloud TO postgres;
\q

3.4. Настройка переменных окружения

Создайте файл .env в папке backend:
bash

nano .env

ini

# Django Settings
# Django Settings
SECRET_KEY=your-very-secret-key-here
DEBUG=False
ALLOWED_HOSTS=0.0.0.0,localhost,127.0.0.1

# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=mycloud
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# Security
CORS_ALLOWED_ORIGINS=localhost, http://0.0.0.0, http://127.0.0.1
CSRF_TRUSTED_ORIGINS=https://0.0.0.0

# Logging
DJANGO_LOG_LEVEL=INFO

3.4.1 
3.5. Применение миграций и создание суперпользователя
bash

python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser

4. Настройка фронтенда (React)
4.1. Установка зависимостей Node.js
bash

cd ../frontend
npm install

4.2. Настройка переменных окружения

Создайте файл .env в папке frontend:
ini

VITE_AVITE_API_URL=http://YOUR_IP_ADRES/api/
VITE_WS_URL=ws://YOUR_IP_ADRES/ws/

4.3. Сборка проекта
bash

npm run build

🚀 Развертывание
1. Настройка Gunicorn

Создайте файл службы:
bash

sudo nano /etc/systemd/system/gunicorn.service

ini

[Unit]
Description=gunicorn service
After=network.target

[Service]
User=oleg
Group=www-data
WorkingDirectory=/home/oleg/fpy-diplom/backend
ExecStart=/home/oleg/fpy-diplom/backend/venv/bin/gunicorn \
          --access-logfile - \
          --workers 3 \
          --bind unix:/home/oleg/fpy-diplom/backend/main/project.sock \
          main.wsgi:application

[Install]
WantedBy=multi-user.target


Запустите службу:
bash

sudo systemctl start gunicorn
sudo systemctl enable gunicorn
sudo systemctl status gunicorn

2. Настройка прав доступа
bash
cd ~/fpy-diplom
chmod +x setup_permissions.sh
./setup_permissions.sh

3. Настройка Nginx

Создайте конфигурационный файл:
bash

sudo nano /etc/nginx/sites-available/mycloud

nginx

sserver {
    listen 80;
    server_name YOUR_IP_ADRES;
    
    root /home/oleg/fpy-diplom/frontend/dist;
    index index.html;

    # Статика Django
    location /static/ {
        alias /home/oleg/fpy-diplom/backend/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Медиа файлы
    location /media/ {
        alias /home/oleg/fpy-diplom/backend/media/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # API запросы с CORS заголовками
    location /api/ {
        proxy_pass http://unix:/home/oleg/fpy-diplom/backend/main/project.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS заголовки
        add_header 'Access-Control-Allow-Origin' 'http://YOUR_IP_ADRES' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        send_timeout 60s;
    }

    # CORS preflight запросы (OPTIONS)
    location ~ ^/api/.*$ {
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'http://YOUR_IP_ADRES';
            add_header 'Access-Control-Allow-Credentials' 'true';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE, PATCH';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        
        proxy_pass http://unix:/home/oleg/fpy-diplom/backend/main/project.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Админка Django
    location /admin/ {
        proxy_pass http://unix:/home/oleg/fpy-diplom/backend/main/project.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Обработка React Router
    location / {
        try_files $uri $uri/ /index.html;
    }
}



Активируйте конфигурацию:
bash

sudo ln -s /etc/nginx/sites-available/mycloud /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

4. Настройка SSL (опционально)
bash

sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

🎯 Доступ к приложению

После успешной настройки приложение будет доступно по адресам:

    Основное приложение: http://YOUR_IP_ADRES

    Административная панель: http://YOUR_IP_ADRES/admin

    API: http://YOUR_IP_ADRES/api/

💻 Разработка
Запуск в режиме разработки

Бэкенд:
bash

cd backend
source venv/bin/activate
python manage.py runserver

Фронтенд:
bash

cd frontend
npm run dev

Полезные команды для разработки
bash

# Просмотр логов Gunicorn
sudo journalctl -u gunicorn -f

# Просмотр логов Nginx
sudo tail -f /var/log/nginx/error.log

# Перезапуск служб
sudo systemctl restart gunicorn
sudo systemctl reload nginx

🔧 Устранение неисправностей
Проверка статуса служб
bash

sudo systemctl status gunicorn
sudo systemctl status nginx

Проверка прав доступа
bash

ls -la /home/oleg/fpy-diplom/backend/main/project.sock
ls -la /home/oleg/fpy-diplom/backend/static/

Проверка сетевых портов
bash

sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :8000

📝 Примечания

    Замените все вхождения oleg на ваше имя пользователя

    Для продакшн-среды установите DEBUG=False

    Регулярно обновляйте SSL сертификаты: sudo certbot renew

    Настройте регулярные бэкапы базы данных

    Мониторьте логи приложения для выявления ошибок
