import logging
from rest_framework import permissions

logger = logging.getLogger(__name__)


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Разрешение, позволяющее редактировать объект только его владельцу.
    Все пользователи могут просматривать объекты (GET, HEAD, OPTIONS).
    """
    
    def has_object_permission(self, request, view, obj):
        # Логирование для отладки
        logger.debug(
            f"Permission check: user={request.user.id} ({request.user.username}), "
            f"obj_owner={obj.user_id if hasattr(obj, 'user_id') else 'N/A'}, "
            f"method={request.method}, view={view.__class__.__name__}"
        )
        
        # Разрешаем безопасные методы для всех
        if request.method in permissions.SAFE_METHODS:
            logger.debug("  Разрешено: безопасный метод")
            return True
        
        # Проверяем владельца
        if hasattr(obj, 'user'):
            is_owner = obj.user == request.user
            is_superuser = request.user.is_superuser
            result = is_owner or is_superuser
            
            logger.debug(f"  Результат: {result} (владелец: {is_owner}, суперпользователь: {is_superuser})")
            return result
        else:
            logger.warning(f"  Объект {obj} не имеет атрибута 'user'")
            return False
