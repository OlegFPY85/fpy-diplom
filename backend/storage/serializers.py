import re
import logging
from rest_framework import serializers
from .models import File, CustomUser

logger = logging.getLogger(__name__)

class UserSerializer(serializers.ModelSerializer):
    file_count = serializers.SerializerMethodField()
    total_file_size = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name',
                  'is_active', 'is_staff', 'is_superuser', 'storage_path',
                  'file_count', 'total_file_size']
        extra_kwargs = {'password': {'write_only': True}}

    def get_file_count(self, obj):
        return obj.get_file_count()

    def get_total_file_size(self, obj):
        return obj.get_total_file_size()

    def validate_username(self, value):
        if not re.match(r'^[a-zA-Z][a-zA-Z0-9]{3,19}$', value):
            raise serializers.ValidationError(
                "Логин должен содержать только латинские буквы и цифры, начинаться с буквы и содержать от 4 до 20 символов.")
        return value

    def validate_email(self, value):
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', value):
            raise serializers.ValidationError("Введите корректный адрес электронной почты.")
        return value

    def validate_password(self, value):
        if (len(value) < 6 or
                not re.search(r'[A-Z]', value) or
                not re.search(r'[0-9]', value) or
                not re.search(r'[\W_]', value)):
            raise serializers.ValidationError(
                "Пароль должен содержать не менее 6 символов, включая заглавные буквы, цифры и специальные символы.")
        return value

    def create(self, validated_data):
        logger.debug("Создание пользователя с данными: %s", validated_data)
        user = CustomUser(**validated_data)
        user.set_password(validated_data['password'])
        user.save()
        logger.info("Пользователь '%s' успешно создан.", user.username)
        return user


class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ['id', 'user_id', 'original_name', 'size', 'upload_date', 'last_download_date', 'comment', 'file_path', 'special_link'] #'__all__'
        read_only_fields = ['user_id',]

    def create(self, validated_data):
        logger.debug("Создание файла с данными: %s", validated_data)
        return super().create(validated_data)