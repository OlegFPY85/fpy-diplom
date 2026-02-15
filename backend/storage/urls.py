from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='users')
router.register(r'files', views.FileViewSet, basename='files')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', views.login_user, name='login'),
    path('auth/register/', views.register_user, name='register'),
    path('files/download-by-link/<str:special_link>/', views.download_file_by_special_link, name='download-by-link'),
]
