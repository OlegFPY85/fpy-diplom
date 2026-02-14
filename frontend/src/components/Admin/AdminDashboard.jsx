import { useState } from 'react';
import UserManagement from './UserManagement';
import './Admin.module.css';

const AdminDashboard = ({ initialTab = 'users' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    
    const user = JSON.parse(localStorage.getItem('user'));

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <h1>⚙️ Панель администратора</h1>
                <p className="admin-subtitle">
                    Управление системой и пользователями
                    {user && <span className="current-admin"> | Вы вошли как: <strong>{user.username}</strong></span>}
                </p>
            </div>
            
            <div className="admin-tabs">
                <button
                    className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    👥 Управление пользователями
                </button>
            </div>
            
            <div className="admin-content">
                {activeTab === 'users' && <UserManagement />}
                {activeTab === 'stats' && <SystemStats />}
                {activeTab === 'system' && (
                    <div className="admin-section">
                        <h3>⚙️ Системные настройки</h3>
                        <div className="settings-form">
                            <div className="form-group">
                                <label>Максимальный размер файла (МБ)</label>
                                <input type="number" defaultValue="100" className="form-input" />
                            </div>
                            <div className="form-group">
                                <label>Разрешенные типы файлов</label>
                                <input 
                                    type="text" 
                                    defaultValue=".jpg,.png,.pdf,.doc,.docx,.txt,.zip" 
                                    className="form-input" 
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <input type="checkbox" defaultChecked /> Требовать подтверждение email
                                </label>
                            </div>
                            <div className="form-group">
                                <label>
                                    <input type="checkbox" defaultChecked /> Уведомлять о новых загрузках
                                </label>
                            </div>
                            <div className="form-group">
                                <label>Цветовая тема</label>
                                <select className="form-input">
                                    <option>Синяя (по умолчанию)</option>
                                    <option>Темная</option>
                                    <option>Светлая</option>
                                </select>
                            </div>
                            <div className="form-buttons">
                                <button className="save-btn">💾 Сохранить настройки</button>
                                <button className="reset-btn">🔄 Сбросить к стандартным</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
