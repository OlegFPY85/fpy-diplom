#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Начинаем настройку прав для проекта fpy-diplom...${NC}"

# Проверяем, существует ли папка проекта
PROJECT_DIR="/home/oleg/fpy-diplom"
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Папка проекта не найдена: $PROJECT_DIR${NC}"
    exit 1
fi

# 1. Права на родительские папки (execute для группы)
echo -e "${YELLOW}📁 Настраиваем права на родительские папки...${NC}"
sudo chmod 755 /home/oleg
sudo chmod 755 /home/oleg/fpy-diplom
sudo chmod 755 /home/oleg/fpy-diplom/frontend

# 2. Владелец и группа для всего проекта
echo -e "${YELLOW}👥 Устанавливаем владельца oleg:www-data...${NC}"
sudo chown -R oleg:www-data "$PROJECT_DIR"

# 3. Базовые права на весь проект (755 - владелец всё, группа чтение+execute)
echo -e "${YELLOW}🔧 Устанавливаем базовые права 755...${NC}"
sudo chmod -R 755 "$PROJECT_DIR"

# 4. Специальные права для папок, где нужна запись
echo -e "${YELLOW}📝 Добавляем права на запись для группы в нужные папки...${NC}"
sudo chmod -R 775 "$PROJECT_DIR/backend/media"
sudo chmod -R 775 "$PROJECT_DIR/backend/static"
sudo chmod -R 775 "$PROJECT_DIR/backend/storage"  # если есть

# 5. Права на сокет (для связи Nginx и Gunicorn)
echo -e "${YELLOW}🔌 Настраиваем права на сокет...${NC}"
if [ -f "$PROJECT_DIR/backend/main/project.sock" ]; then
    sudo chmod 660 "$PROJECT_DIR/backend/main/project.sock"
else
    echo -e "${RED}⚠️  Сокет не найден. Он будет создан при запуске Gunicorn${NC}"
fi

# 6. Проверяем доступ для www-data
echo -e "${YELLOW}🔍 Проверяем доступ для пользователя www-data...${NC}"
if sudo -u www-data test -r "$PROJECT_DIR/frontend/dist/index.html"; then
    echo -e "${GREEN}✅ www-data может читать index.html${NC}"
else
    echo -e "${RED}❌ www-data НЕ может читать index.html!${NC}"
    echo -e "${YELLOW}Проверяем цепочку прав:${NC}"
    namei -l "$PROJECT_DIR/frontend/dist/index.html"
fi

# 7. Добавляем www-data в группу oleg (если ещё не добавлен)
if groups www-data | grep -q "oleg"; then
    echo -e "${GREEN}✅ www-data уже в группе oleg${NC}"
else
    echo -e "${YELLOW}➕ Добавляем www-data в группу oleg...${NC}"
    sudo usermod -a -G oleg www-data
    echo -e "${GREEN}✅ www-data добавлен в группу oleg${NC}"
fi

# 8. Итоговая проверка
echo -e "\n${GREEN}📊 Итоговые права на ключевые папки:${NC}"
ls -ld "$PROJECT_DIR"
ls -ld "$PROJECT_DIR/frontend"
ls -ld "$PROJECT_DIR/frontend/dist"
ls -l "$PROJECT_DIR/backend/main/project.sock" 2>/dev/null || echo "Сокет пока не создан"

echo -e "\n${GREEN}✅ Настройка завершена!${NC}"
echo -e "${YELLOW}👉 Рекомендуется перезапустить службы:${NC}"
echo "sudo systemctl restart gunicorn"
echo "sudo systemctl restart nginx"
