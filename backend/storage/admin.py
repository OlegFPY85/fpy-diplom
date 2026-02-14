import os
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib import messages
from django.contrib.auth import get_user_model
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import path, reverse
from django.utils.crypto import get_random_string
from django.utils.html import format_html
from django.http import HttpResponseRedirect
from django.conf import settings
from django import forms
from django.utils import timezone
from .forms import CustomUserCreationForm, CustomUserChangeForm
from .models import CustomUser, File
import logging

logger = logging.getLogger(__name__)

class FileInline(admin.TabularInline):
    """Inline для отображения файлов пользователя"""
    model = File
    extra = 0
    readonly_fields = ['original_name', 'size', 'upload_date', 'last_download_date', 'comment']
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False

class CustomUserAdmin(admin.ModelAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    
    # Список пользователей
    list_display = [
        'username', 
        'email', 
        'first_name', 
        'last_name',
        'is_staff_display',
        'file_count', 
        'total_file_size_display',
        'files_management_link',
        'is_active',
        'user_actions'
    ]
    
    list_filter = ['is_staff', 'is_active', 'storage_path']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    readonly_fields = ['file_count', 'total_file_size_display', 'files_management_link']
   
    fieldsets = (
        (None, {
            'fields': ('username', 'password')
        }),
        ('Персональная информация', {
            'fields': ('first_name', 'last_name', 'email')
        }),
        ('Права доступа', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Файловое хранилище', {
            'fields': (
                'storage_path', 
                'file_count', 
                'total_file_size_display',
                'files_management_link'
            )
        }),
        ('Важные даты', {
            'fields': ('last_login', 'date_joined')
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'storage_path'),
        }),
    )

    inlines = [FileInline]
    
    def is_staff_display(self, obj):
        """Отображение признака администратора"""
        return "✅ Администратор" if obj.is_staff else "❌ Пользователь"
    is_staff_display.short_description = 'Тип пользователя'
    
    def file_count(self, obj):
        """Количество файлов пользователя"""
        return File.objects.filter(user=obj).count()
    file_count.short_description = 'Файлов'
    
    def total_file_size_display(self, obj):
        """Общий размер файлов в Мб"""
        total_size = obj.get_total_file_size()
        return f"{total_size:.2f} Мб" if total_size else "0 Мб"
    total_file_size_display.short_description = 'Размер хранилища'
    
    def files_management_link(self, obj):
        """Ссылка для перехода к управлению файлами"""
        url = reverse('admin:storage_customuser_files', args=[obj.pk])
        return format_html('<a href="{}" class="button">📁 Управление файлами</a>', url)
    files_management_link.short_description = 'Управление хранилищем'
    
    def user_actions(self, obj):
        """Кнопки действий"""
        change_url = reverse('admin:storage_customuser_change', args=[obj.pk])
        password_url = reverse('admin:storage_customuser_password', args=[obj.pk])
        return format_html(
            '<a href="{}">✏️ Изменить</a> | '
            '<a href="{}">🔐 Сброс пароля</a>',
            change_url, password_url
        )
    user_actions.short_description = 'Действия'
    
    def get_urls(self):
        """Добавляем кастомные URL"""
        urls = super().get_urls()
        custom_urls = [
            path('<int:user_id>/password/', 
                 self.admin_site.admin_view(self.reset_password), 
                 name='storage_customuser_password'),
            path('<int:user_id>/files/', 
                 self.admin_site.admin_view(self.manage_files), 
                 name='storage_customuser_files'),
            path('<int:user_id>/files/upload/', 
                 self.admin_site.admin_view(self.upload_file), 
                 name='storage_customuser_upload'),
            path('<int:user_id>/files/<int:file_id>/delete/', 
                 self.admin_site.admin_view(self.delete_file), 
                 name='storage_customuser_delete_file'),
            path('<int:user_id>/files/<int:file_id>/download/', 
                 self.admin_site.admin_view(self.download_file), 
                 name='storage_customuser_download_file'),
            path('<int:user_id>/files/<int:file_id>/rename/', 
                 self.admin_site.admin_view(self.rename_file), 
                 name='storage_customuser_rename_file'),
        ]
        return custom_urls + urls
    
    def reset_password(self, request, user_id):
        """Сброс пароля пользователя"""
        user = get_object_or_404(CustomUser, pk=user_id)
        new_password = get_random_string(length=8)
        user.set_password(new_password)
        user.save()
        messages.success(
            request, 
            f'Пароль для пользователя {user.username} был сброшен. Новый пароль: {new_password}'
        )
        return redirect(reverse('admin:storage_customuser_change', args=[user_id]))
    
    def manage_files(self, request, user_id):
        """Интерфейс управления файлами пользователя"""
        user = get_object_or_404(CustomUser, pk=user_id)

        if not request.user.is_staff and request.user != user:
            messages.error(request, 'У вас нет прав для управления этим хранилищем')
            return redirect('admin:index')
        
        files = File.objects.filter(user=user)
        
        return render(request, 'admin/storage/customuser/file_management.html', {
            'user': user,
            'files': files,
            'title': f'Управление файлами пользователя {user.username}'
        })
    
    def upload_file(self, request, user_id):
        """Загрузка нового файла"""
        user = get_object_or_404(CustomUser, pk=user_id)
        
        if not request.user.is_staff and request.user != user:
            messages.error(request, 'У вас нет прав для загрузки файлов в это хранилище')
            return redirect('admin:index')
        
        if request.method == 'POST' and request.FILES.get('file'):
            uploaded_file = request.FILES['file']
            comment = request.POST.get('comment', '')
            
            try:
                file_obj = File(
                    user=user,
                    original_name=uploaded_file.name,
                    file_path=uploaded_file,
                    size=uploaded_file.size,
                    comment=comment
                )
                file_obj.save()
                
                messages.success(request, f'Файл "{uploaded_file.name}" успешно загружен')
                logger.info(f'Файл "{uploaded_file.name}" загружен пользователем {request.user.username} для пользователя {user.username}')
            except Exception as e:
                messages.error(request, f'Ошибка при загрузке файла: {str(e)}')
                logger.error(f'Ошибка загрузки файла: {str(e)}')
            
            return redirect(reverse('admin:storage_customuser_files', args=[user_id]))
        
        return redirect(reverse('admin:storage_customuser_files', args=[user_id]))
    
    def delete_file(self, request, user_id, file_id):
        """Удаление файла"""
        user = get_object_or_404(CustomUser, pk=user_id)
        file_obj = get_object_or_404(File, pk=file_id, user=user)
        
        if not request.user.is_staff and request.user != user:
            messages.error(request, 'У вас нет прав для удаления этого файла')
            return redirect('admin:index')
        
        file_name = file_obj.original_name
        file_obj.delete()
        messages.success(request, f'Файл "{file_name}" успешно удален')
        logger.info(f'Файл "{file_name}" удален пользователем {request.user.username}')
        
        return redirect(reverse('admin:storage_customuser_files', args=[user_id]))
    
    def download_file(self, request, user_id, file_id):
        """Скачивание файла"""
        user = get_object_or_404(CustomUser, pk=user_id)
        file_obj = get_object_or_404(File, pk=file_id, user=user)
        
        if not request.user.is_staff and request.user != user:
            messages.error(request, 'У вас нет прав для скачивания этого файла')
            return redirect('admin:index')

        file_obj.last_download_date = timezone.now()
        file_obj.save()

        from django.http import FileResponse
        import os
        
        if file_obj.file_path and os.path.exists(file_obj.file_path.path):
            response = FileResponse(file_obj.file_path.open('rb'))
            response['Content-Disposition'] = f'attachment; filename="{file_obj.original_name}"'
            return response
        else:
            messages.error(request, 'Файл не найден на сервере')
            return redirect(reverse('admin:storage_customuser_files', args=[user_id]))
    
    def rename_file(self, request, user_id, file_id):
        """Переименование файла"""
        user = get_object_or_404(CustomUser, pk=user_id)
        file_obj = get_object_or_404(File, pk=file_id, user=user)
        
        if not request.user.is_staff and request.user != user:
            messages.error(request, 'У вас нет прав для переименования этого файла')
            return redirect('admin:index')
        
        if request.method == 'POST':
            new_name = request.POST.get('new_name')
            if new_name:
                file_obj.original_name = new_name
                file_obj.save()
                messages.success(request, f'Файл успешно переименован в "{new_name}"')
            else:
                messages.error(request, 'Новое имя файла не может быть пустым')
            
            return redirect(reverse('admin:storage_customuser_files', args=[user_id]))

        return render(request, 'admin/storage/customuser/rename_file.html', {
            'user': user,
            'file': file_obj,
            'title': f'Переименование файла {file_obj.original_name}'
        })

@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    """Админка для файлов (только для просмотра)"""
    list_display = [
        'original_name', 
        'user', 
        'size_display', 
        'upload_date', 
        'last_download_date', 
        'comment'
    ]
    
    list_filter = ['user', 'upload_date']
    search_fields = ['original_name', 'user__username', 'comment']
    readonly_fields = ['original_name', 'user', 'size', 'upload_date', 'last_download_date']
    
    def size_display(self, obj):
        """Отображение размера файла"""
        if obj.size:
            size_mb = obj.size / (1024 * 1024)
            return f"{size_mb:.2f} Мб"
        return "0 Мб"
    size_display.short_description = 'Размер'
    
    def has_add_permission(self, request):
        """Запрещаем добавление файлов через общую админку"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Запрещаем изменение файлов через общую админку"""
        return False

admin.site.register(CustomUser, CustomUserAdmin)