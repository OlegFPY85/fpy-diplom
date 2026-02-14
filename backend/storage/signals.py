import os
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CustomUser

# import logging
#
# logger = logging.getLogger(__name__)
#
# @receiver(post_save, sender=CustomUser)
# def create_user_directory(sender, instance, created, **kwargs):
#     if created and instance.storage_path:
#         os.makedirs(os.path.join(settings.MEDIA_ROOT, 'uploads', instance.storage_path), exist_ok=True)
#         logger.info("Создана папка для пользователя %s: %s", instance.username, instance.storage_path)
