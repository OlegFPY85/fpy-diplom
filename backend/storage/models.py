import os
import uuid
from django.conf import settings
from django.db import models
from django.contrib.auth.models import AbstractUser
import logging

logger = logging.getLogger(__name__)

class CustomUser(AbstractUser):
    storage_path = models.CharField(max_length=255,
                                    verbose_name='Место хранения файлов',
                                    default='')

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.storage_path:
            self.storage_path = f'user_{self.id}_{uuid.uuid4()}'
            os.makedirs(os.path.join(settings.MEDIA_ROOT, 'uploads', self.storage_path), exist_ok=True)
            logger.info("Создана папка для пользователя %s: %s", self.username, self.storage_path)
            self.save(update_fields=['storage_path'])

    def get_file_count(self):
        return File.objects.filter(user=self).count()

    def get_total_file_size(self):
        return round(sum(file.size for file in File.objects.filter(user=self)) / 1024 / 1024, 2)

    def __str__(self):
        return self.username

class File(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL,
                             on_delete=models.CASCADE,
                             verbose_name='Пользователь')
    original_name = models.CharField(max_length=255, editable=False, verbose_name='Оригинальное название')
    size = models.PositiveIntegerField(editable=False, verbose_name='Размер файла')
    upload_date = models.DateTimeField(auto_now_add=True, verbose_name='Дата загрузки')
    last_download_date = models.DateTimeField(null=True, blank=True, editable=False, verbose_name='Последняя дата скачивания')
    comment = models.TextField(blank=True, verbose_name='Комментарий')
    file_path = models.FileField(upload_to='', verbose_name='Адрес файла', max_length=500)
    special_link = models.CharField(max_length=255, unique=True, editable=False, verbose_name='Специальная ссылка')

    def save(self, *args, **kwargs):
        if not self.pk:
            self.special_link = uuid.uuid4().hex
            logger.info("Создан специальный линк для файла: %s", self.special_link)

            self.file_path.name = self.get_upload_to()

        user_folder = os.path.join(settings.MEDIA_ROOT, 'uploads', self.user.storage_path)
        os.makedirs(user_folder, exist_ok=True)

        super().save(*args, **kwargs)

    def get_upload_to(self):
        unique_filename = f"{uuid.uuid4().hex}_{self.original_name}"
        return os.path.join('uploads/', self.user.storage_path, unique_filename)

    def delete(self, *args, **kwargs):
        if self.file_path:
            try:
                if os.path.isfile(self.file_path.path):
                    os.remove(self.file_path.path)
                    logger.info("Файл '%s' успешно удален.", self.original_name)
            except Exception as e:
                logger.error("Ошибка при удалении файла '%s': %s", self.original_name, str(e))
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"id файла: {self.id}"

    class Meta:
        verbose_name = 'Файл'
        verbose_name_plural = 'Файлы'
