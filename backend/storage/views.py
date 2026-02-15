import os
import logging
from django.utils import timezone
from django.http import FileResponse, Http404, HttpResponse
from django.utils.encoding import smart_str, escape_uri_path
from rest_framework import viewsets, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.authtoken.models import Token
from .models import File, CustomUser
from .permissions import IsOwnerOrReadOnly
from .serializers import UserSerializer, FileSerializer
from django.contrib.auth import authenticate

logger = logging.getLogger(__name__)


class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    filterset_fields = ['id',]
    search_fields = ['username', 'email',]
    ordering_fields = ['id', 'username',]

    def get_permissions(self):
        """Разные права для разных действий"""
        if self.action in ['create', 'list', 'destroy']:
            return [permissions.IsAdminUser()]
        elif self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """Информация о текущем пользователе"""
        logger.debug("Запрос информации о пользователе: %s", request.user.username)
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def list_users(self, request):
        """Список всех пользователей (только для админов)"""
        logger.debug("Запрос списка пользователей администратором: %s", request.user.username)
        users = CustomUser.objects.all()
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)

    def list(self, request, *args, **kwargs):
        """Запрет на просмотр списка пользователей для обычных пользователей"""
        if not request.user.is_staff:
            raise PermissionDenied("Доступ запрещен. Вы не можете просматривать список пользователей.")
        return super().list(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Обновление пользователя с проверкой прав"""
        instance = self.get_object()
    
        # Только администраторы могут менять is_staff
        if 'is_staff' in request.data and not request.user.is_staff:
            return Response(
                {"detail": "Только администраторы могут изменять статус администратора"},
                status=status.HTTP_403_FORBIDDEN
            )
    
        # Администраторы не могут снять себе права
        if (instance == request.user and 
            'is_staff' in request.data and 
            not request.data['is_staff']):
            return Response(
                {"detail": "Вы не можете снять себе права администратора"},
                status=status.HTTP_403_FORBIDDEN
            )
    
        return super().update(request, *args, **kwargs)

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    filterset_fields = ['user', 'original_name', 'upload_date', 'last_download_date', 'comment',]
    search_fields = ['original_name', 'comment']  
    ordering_fields = ['id', 'original_name', 'size', 'upload_date', 'last_download_date',]

    def get_queryset(self):
        """Фильтрация файлов по правам доступа"""
        user = self.request.user
    
        if user.is_staff:
            return File.objects.all()  # Staff видит ВСЕ файлы
        else:
            return File.objects.filter(user=user)  # Обычный пользователь видит только свои файлы

    def perform_create(self, serializer):
        """Создание файла с правильной обработкой"""
        try:
            logger.debug("Попытка загрузки файла пользователем %s", self.request.user.username)

            if 'file_path' not in self.request.FILES:
                logger.warning("Файл не найден в запросе")
                raise ValidationError({"detail": "Файл не найден в запросе"})
            
            file_obj = self.request.FILES['file_path']
            original_name = file_obj.name

            serializer.save(
                user=self.request.user,
                original_name=original_name,
                size=file_obj.size,
                file_path=file_obj
            )
            
            logger.info("Файл '%s' успешно загружен пользователем %s", original_name, self.request.user.username)
            
        except Exception as e:
            logger.error("Ошибка при загрузке файла: %s", str(e))
            raise ValidationError({"detail": f"Ошибка при загрузке файла: {str(e)}"})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_files(self, request):
        """Файлы текущего пользователя"""
        logger.debug("Запрос на получение файлов пользователя: %s", request.user.username)
        try:
            files = File.objects.filter(user=request.user)
            serializer = self.get_serializer(files, many=True)
            logger.info("Файлы пользователя %s успешно получены (%d файлов)", 
                       request.user.username, files.count())
            return Response(serializer.data)
        except Exception as e:
            logger.error("Ошибка при получении файлов: %s", str(e))
            return Response({"detail": "Ошибка при получении файлов"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['patch'], permission_classes=[IsOwnerOrReadOnly])
    def rename(self, request, pk=None):
        """Переименование файла (endpoint: /api/files/{id}/rename/)"""
        logger.debug("Запрос на переименование файла с ID %s от пользователя %s", 
                    pk, request.user.username)
        try:
            file = self.get_object()
            
            # Детальное логирование для отладки
            logger.debug("Файл ID %s: имя='%s', владелец ID=%s, пользователь ID=%s",
                        file.id, file.original_name, file.user_id, request.user.id)
            
            new_name = request.data.get('new_name')
            
            if not new_name:
                return Response({"detail": "Новое имя файла не указано"}, 
                              status=status.HTTP_400_BAD_REQUEST)
            
            file.original_name = new_name
            file.save(update_fields=['original_name'])
            
            logger.info("Файл с ID %s переименован в '%s' пользователем %s", 
                       pk, new_name, request.user.username)
            return Response(self.get_serializer(file).data)
            
        except Exception as e:
            logger.error("Ошибка при переименовании файла с ID %s: %s", pk, str(e))
            import traceback
            logger.error(traceback.format_exc())
            return Response({"detail": "Ошибка при переименовании файла"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['patch'], permission_classes=[IsOwnerOrReadOnly], url_path='rename_file')
    def rename_file(self, request, pk=None):
        """Алиас для rename для совместимости с фронтендом (endpoint: /api/files/{id}/rename_file/)"""
        logger.debug("Запрос rename_file для файла с ID %s", pk)
        return self.rename(request, pk)

    @action(detail=True, methods=['patch'], permission_classes=[IsOwnerOrReadOnly])
    def update_comment(self, request, pk=None):
        """Обновление комментария к файлу"""
        logger.debug("Запрос на изменение комментария к файлу с ID %s", pk)
        try:
            file = self.get_object()
            comment = request.data.get('comment', '')
            
            file.comment = comment
            file.save(update_fields=['comment'])
            
            serializer = self.get_serializer(file)
            logger.info("У файла с ID %s обновлен комментарий", pk)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error("Ошибка при обновлении комментария к файлу с ID %s: %s", pk, str(e))
            return Response({"detail": "Ошибка при обновлении комментария"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsOwnerOrReadOnly])
    def download(self, request, pk=None):     
        """Скачивание файла"""
        logger.debug("Запрос на скачивание файла с ID %s", pk)
        try:
            file = self.get_object()
            logger.debug("Найден файл: %s, пользователь: %s", file.original_name, request.user.username)
            
            if not file.file_path or not os.path.exists(file.file_path.path):
                logger.error("Файл с ID %s не найден на диске", pk)
                return Response({"detail": "Файл не найден"}, 
                              status=status.HTTP_404_NOT_FOUND)

            file.last_download_date = timezone.now()
            file.save(update_fields=['last_download_date'])
            
            response = FileResponse(
                open(file.file_path.path, 'rb'),
                as_attachment=True,
                filename=file.original_name
            )
            
            logger.info("Файл с ID %s успешно скачан пользователем %s", pk, request.user.username)
            return response
            
        except Http404:
            logger.error("Файл с ID %s не найден для пользователя %s", pk, request.user.username)
            return Response({"detail": "Файл не найден"}, 
                          status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error("Ошибка при скачивании файла с ID %s: %s", pk, str(e))
            import traceback
            logger.error(traceback.format_exc())
            return Response({"detail": "Ошибка при скачивании файла"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated, IsOwnerOrReadOnly])
    def get_special_link(self, request, pk=None):
        """Получение специальной ссылки для файла"""
        logger.debug("Запрос специальной ссылки для файла с ID %s пользователем %s", pk, request.user.username)
        try:
            file = self.get_object()
            logger.debug("Найден файл: %s", file.original_name)

            if not file.special_link:
                file.generate_special_link()
                file.save()
            
            special_link_url = request.build_absolute_uri(
                f'/api/files/download-by-link/{file.special_link}/'
            )
            
            logger.info("Специальная ссылка для файла с ID %s получена пользователем %s", pk, request.user.username)
            return Response({
                'special_link': special_link_url,
                'file_name': file.original_name
            })
            
        except Http404:
            logger.error("Файл с ID %s не найден для пользователя %s", pk, request.user.username)
            return Response({"detail": "Файл не найден"}, 
                          status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error("Ошибка при получении специальной ссылки для файла с ID %s: %s", pk, str(e))
            import traceback
            logger.error(traceback.format_exc())
            return Response({"detail": "Ошибка при получении специальной ссылки"}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def view(self, request, pk=None):
        """Просмотр файла в браузере"""
        logger.debug("Запрос на просмотр файла с ID %s", pk)

        token_key = request.query_params.get('token')
        if token_key:
            try:
                from rest_framework.authtoken.models import Token
                token = Token.objects.get(key=token_key)
                request.user = token.user
            except Token.DoesNotExist:
                return Response({"detail": "Неверный токен"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            file = File.objects.get(id=pk)
        
            if not file.file_path or not os.path.exists(file.file_path.path):
                return Response({"detail": "Файл не найден"}, status=status.HTTP_404_NOT_FOUND)

            file.last_download_date = timezone.now()
            file.save(update_fields=['last_download_date'])

            # Определяем content_type
            file_extension = os.path.splitext(file.original_name)[1].lower()
            content_types = {
                '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                '.gif': 'image/gif', '.bmp': 'image/bmp', '.svg': 'image/svg+xml',
                '.webp': 'image/webp', '.pdf': 'application/pdf',
                '.txt': 'text/plain', '.html': 'text/html', '.htm': 'text/html',
                '.css': 'text/css', '.js': 'application/javascript',
                '.json': 'application/json', '.xml': 'application/xml',
                '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
                '.webm': 'video/webm', '.ogg': 'audio/ogg',
            }
            
            content_type = content_types.get(file_extension, 'application/octet-stream')
            
            # Открываем файл
            with open(file.file_path.path, 'rb') as f:
                file_content = f.read()
            
            # Создаем HttpResponse с правильным кодированием
            response = HttpResponse(file_content, content_type=content_type)
            
            # Определяем, показывать или скачивать
            show_in_browser = any(content_type.startswith(t) for t in 
                                 ['image/', 'text/', 'application/pdf', 'audio/', 'video/'])
            
            # Правильное кодирование для русских имен
            filename_encoded = escape_uri_path(file.original_name)
            
            if show_in_browser:
                # Для совместимости со всеми браузерами
                response['Content-Disposition'] = f'inline; filename="{filename_encoded}"; filename*=UTF-8\'\'{file.original_name}'
                logger.info("Файл отображается в браузере: %s", file.original_name)
            else:
                response['Content-Disposition'] = f'attachment; filename="{filename_encoded}"; filename*=UTF-8\'\'{file.original_name}'
                logger.info("Файл отправлен на скачивание: %s", file.original_name)
            
            return response
        
        except File.DoesNotExist:
            return Response({"detail": "Файл не найден"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error("Ошибка при просмотре файла: %s", str(e))
            return Response({"detail": "Ошибка при просмотре файла"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def download_file_by_special_link(request, special_link):
    """Скачивание файла по специальной ссылке"""
    logger.debug("Запрос на скачивание файла по специальной ссылке: %s", special_link)
    try:
        file_instance = File.objects.get(special_link=special_link)
        file_path = file_instance.file_path.path

        if not os.path.exists(file_path):
            logger.warning("Файл не найден на диске по специальной ссылке: %s", special_link)
            raise Http404("Файл не найден.")

        file_instance.last_download_date = timezone.now()
        file_instance.save(update_fields=['last_download_date'])

        # Открываем файл в бинарном режиме
        file_handle = open(file_path, 'rb')
        
        # Создаем FileResponse с правильными заголовками
        response = FileResponse(
            file_handle,
            content_type='application/octet-stream',
            as_attachment=True,
            filename=file_instance.original_name
        )
        
        # Добавляем дополнительные заголовки для браузеров
        response['Content-Length'] = os.path.getsize(file_path)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        
        logger.info("Файл по специальной ссылке '%s' успешно скачан", special_link)
        return response
        
    except File.DoesNotExist:
        logger.error("Файл с специальной ссылкой '%s' не найден в базе данных", special_link)
        raise Http404("Файл не найден.")
    except Exception as e:
        logger.error("Ошибка при скачивании файла по специальной ссылке '%s': %s", special_link, str(e))
        return Response({"detail": "Ошибка при скачивании файла"}, 
                      status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def login_user(request):
    """Аутентификация пользователя"""
    logger.debug("Попытка входа пользователя: %s", request.data.get('username'))
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({'detail': 'Необходимо указать имя пользователя и пароль'}, 
                      status=status.HTTP_400_BAD_REQUEST)
    
    user = authenticate(username=username, password=password)

    if user is not None:
        token, created = Token.objects.get_or_create(user=user)
        logger.info("Успешный вход пользователя '%s'", username)
        return Response({
            'token': token.key, 
            'username': user.username, 
            'email': user.email,
            'is_staff': user.is_staff
        }, status=status.HTTP_200_OK)
    
    logger.warning("Неудачная попытка входа для пользователя '%s'", username)
    return Response({'detail': 'Неверные учетные данные'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
def register_user(request):
    """Регистрация нового пользователя"""
    logger.debug("Регистрация нового пользователя: %s", request.data.get('username'))
    username = request.data.get('username')
    email = request.data.get('email')

    if CustomUser.objects.filter(username=username).exists():
        logger.warning("Пользователь с именем '%s' уже существует", username)
        return Response({"detail": "Пользователь с таким именем уже существует."},
                        status=status.HTTP_400_BAD_REQUEST)
    
    if CustomUser.objects.filter(email=email).exists():
        logger.warning("Пользователь с email '%s' уже существует", email)
        return Response({"detail": "Пользователь с таким email уже существует."},
                        status=status.HTTP_400_BAD_REQUEST)

    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        logger.info("Пользователь %s успешно зарегистрирован", username)

        token, created = Token.objects.get_or_create(user=user)
        logger.info("Токен для пользователя %s создан", username)
        
        return Response({
            'token': token.key, 
            'username': user.username,
            'email': user.email,
            'id': user.id
        }, status=status.HTTP_201_CREATED)
    
    logger.error("Ошибка валидации данных при регистрации: %s", serializer.errors)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
