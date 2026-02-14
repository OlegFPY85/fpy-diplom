// src/components/Admin/UserManagement.jsx - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import './Admin.module.css';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isInitialized, setIsInitialized] = useState(false);
    
    const currentUser = useSelector((state) => state.user);

    useEffect(() => {
        console.log('UserManagement: useEffect triggered');
        
        if (!currentUser || !isInitialized) {
            return;
        }
        
        if (!currentUser.is_staff) {
            setError('Доступ запрещен. Требуются права администратора.');
            setLoading(false);
            return;
        }
        
        fetchUsers();
    }, [currentUser, isInitialized]);

    useEffect(() => {
        console.log('UserManagement: Starting initialization delay...');
        
        const timer = setTimeout(() => {
            console.log('UserManagement: Initialization delay completed');
            setIsInitialized(true);
        }, 3000);
        
        return () => clearTimeout(timer);
    }, []);

    const fetchUsers = async () => {
        try {
            console.log('UserManagement: Starting fetchUsers...');
            const token = localStorage.getItem('token');
            
            if (!token) {
                throw new Error('Токен не найден');
            }
            
            console.log('UserManagement: Token:', token.substring(0, 20) + '...');
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const response = await fetch('/api/users/list_users/', {
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                cache: 'no-cache',
                mode: 'cors',
                credentials: 'same-origin'
            });
            
            console.log('UserManagement: Response status:', response.status);
            
            if (response.status === 401) {
                console.log('UserManagement: 401 received, refreshing auth...');
                await refreshAuth();
                return;
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('UserManagement: Server error:', errorText);
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('UserManagement: Users received:', data);
            
            setUsers(Array.isArray(data) ? data : [data]);
            setError('');
            
        } catch (err) {
            console.error('UserManagement: Error in fetchUsers:', err);
            setError(`Ошибка загрузки: ${err.message}`);
            
            if (currentUser && currentUser.is_staff) {
                setUsers([currentUser]);
            }
        } finally {
            setLoading(false);
        }
    };
    
    const refreshAuth = async () => {
        console.log('UserManagement: Refreshing authentication...');
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch('/api/users/me/', {
                headers: {
                    'Authorization': `Token ${token}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                console.log('UserManagement: Auth refreshed, user:', userData);
                localStorage.setItem('user', JSON.stringify(userData));
                
                setTimeout(fetchUsers, 1000);
            } else {
                throw new Error('Не удалось обновить аутентификацию');
            }
        } catch (err) {
            console.error('UserManagement: Refresh auth failed:', err);
            setError('Сессия истекла. Пожалуйста, войдите снова.');
        }
    };
    
    const retryWithDelay = () => {
        setLoading(true);
        setError('');
        
        setTimeout(() => {
            fetchUsers();
        }, 1000);
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            
            const response = await fetch(`/api/users/${userId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Token ${token}`
                }
            });
            
            console.log('Delete response status:', response.status);
            
            if (response.ok) {
                setUsers(users.filter(user => user.id !== userId));
                alert('Пользователь удален');
            } else {
                const errorText = await response.text();
                throw new Error(`Ошибка удаления: ${errorText.substring(0, 100)}`);
            }
        } catch (err) {
            alert(err.message);
            console.error('Ошибка удаления:', err);
        }
    };

    const handleToggleStaff = async (userId, currentStatus) => {
        try {
            const token = localStorage.getItem('token');
            const newStatus = !currentStatus;
            
            const response = await fetch(`/api/users/${userId}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_staff: newStatus })
            });
            
            console.log('Toggle staff response status:', response.status);
            
            if (response.ok) {
                const updatedUser = await response.json();
                setUsers(users.map(user => 
                    user.id === userId ? updatedUser : user
                ));
                alert(`Статус администратора изменен: ${newStatus ? 'Админ' : 'Пользователь'}`);
            } else {
                const errorText = await response.text();
                throw new Error(`Ошибка обновления: ${errorText.substring(0, 100)}`);
            }
        } catch (err) {
            alert(err.message);
            console.error('Ошибка обновления:', err);
        }
    };

    const handleToggleActive = async (userId, currentStatus) => {
        try {
            const token = localStorage.getItem('token');
            const newStatus = !currentStatus;
            
            const response = await fetch(`/api/users/${userId}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: newStatus })
            });
            
            if (response.ok) {
                const updatedUser = await response.json();
                setUsers(users.map(user => 
                    user.id === userId ? updatedUser : user
                ));
                alert(`Статус активности изменен: ${newStatus ? 'Активен' : 'Неактивен'}`);
            } else {
                const errorText = await response.text();
                throw new Error(`Ошибка обновления активности: ${errorText.substring(0, 100)}`);
            }
        } catch (err) {
            alert(err.message);
            console.error('Ошибка обновления активности:', err);
        }
    };

    if (loading) {
        return (
            <div className="init-message">
                <div className="loading-spinner small"></div>
                <h4>Инициализация панели управления</h4>
                <p>Загрузка данных пользователей...</p>
                <p className="hint">Это может занять несколько секунд</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <h3>⚠️ Ошибка загрузки пользователей</h3>
                <p>{error}</p>
                <div className="error-actions">
                    <button onClick={retryWithDelay} className="retry-btn">
                        🔄 Повторить с задержкой
                    </button>
                    <button onClick={() => {
                        localStorage.removeItem('user');
                        const token = localStorage.getItem('token');
                        fetch('/api/users/me/', {
                            headers: { 'Authorization': `Token ${token}` }
                        })
                        .then(r => r.json())
                        .then(user => {
                            localStorage.setItem('user', JSON.stringify(user));
                            retryWithDelay();
                        });
                    }} className="refresh-auth-btn">
                        🔑 Обновить аутентификацию
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="user-management">
            <div className="section-header">
                <h3>👥 Управление пользователями</h3>
                <div className="header-actions">
                    <span className="total-users">Всего: {users.length}</span>
                    <button onClick={fetchUsers} className="refresh-btn">
                        🔄 Обновить
                    </button>
                </div>
            </div>
            
            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Имя пользователя</th>
                            <th>Email</th>
                            <th>Имя</th>
                            <th>Фамилия</th>
                            <th>Статус</th>
                            <th>Роль</th>
                            <th>Файлы</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className={user.id === currentUser?.id ? 'current-user-row' : ''}>
                                <td>{user.id}</td>
                                <td>
                                    <strong>{user.username}</strong>
                                    {user.id === currentUser?.id && (
                                        <span className="you-badge"> (Вы)</span>
                                    )}
                                </td>
                                <td>{user.email || '-'}</td>
                                <td>{user.first_name || '-'}</td>
                                <td>{user.last_name || '-'}</td>
                                <td>
                                    <button
                                        onClick={() => handleToggleActive(user.id, user.is_active)}
                                        className={`status-btn ${user.is_active ? 'active' : 'inactive'}`}
                                        disabled={user.id === currentUser?.id}
                                        title={user.id === currentUser?.id ? 'Нельзя изменить свой статус' : ''}
                                    >
                                        {user.is_active ? '✅ Активен' : '❌ Неактивен'}
                                    </button>
                                </td>
                                <td>
                                    <button
                                        onClick={() => handleToggleStaff(user.id, user.is_staff)}
                                        className={`role-btn ${user.is_staff ? 'admin' : 'user'}`}
                                        disabled={user.id === currentUser?.id}
                                        title={user.id === currentUser?.id ? 'Нельзя изменить свою роль' : ''}
                                    >
                                        {user.is_staff ? '👑 Админ' : '👤 Пользователь'}
                                    </button>
                                </td>
                                <td>{user.file_count || 0}</td>
                                <td className="actions">
                                    {user.id !== currentUser?.id && (
                                        <>
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="delete-btn"
                                                title="Удалить пользователя"
                                            >
                                                🗑️ Удалить
                                            </button>
                                            <button
                                                onClick={() => {
                                                    alert(`Редактирование пользователя ${user.username}`);
                                                }}
                                                className="edit-btn"
                                                title="Редактировать"
                                            >
                                                ✏️ Редактировать
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {users.length === 0 && (
                    <div className="no-users">
                        <p>📭 Пользователи не найдены</p>
                    </div>
                )}
            </div>
            
            <div className="user-stats">
                <div className="stat-card">
                    <span className="stat-label">Всего пользователей:</span>
                    <span className="stat-value">{users.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Администраторов:</span>
                    <span className="stat-value">
                        {users.filter(user => user.is_staff).length}
                    </span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Активных:</span>
                    <span className="stat-value">
                        {users.filter(user => user.is_active).length}
                    </span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">Всего файлов:</span>
                    <span className="stat-value">
                        {users.reduce((sum, user) => sum + (user.file_count || 0), 0)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
