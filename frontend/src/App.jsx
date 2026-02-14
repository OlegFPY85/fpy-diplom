import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom';
import { useEffect, useState, React } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { Register } from './components/Auth/Register/Register';
import Login from './components/Auth/Login/Login';
import { Dashboard } from './components/Dashboard';
import { FileUpload } from './components/File/FileUpload';
import AdminDashboard from './components/Admin/AdminDashboard';
import { checkAuth } from './redux/actions';
import './App.css';
import HomePage from './components/HomePage/HomePage';

// Компонент навигационной панели
const Navbar = () => {
    const user = useSelector((state) => state.user);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-logo">
                    <Link to="/">Cloud Storage</Link>
                </div>
                
                <button 
                    className="navbar-toggle"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    ☰
                </button>
                
                <div className={`navbar-menu ${isMenuOpen ? 'open' : ''}`}>
                    <ul className="navbar-nav">
                        <li className="nav-item">
                            <Link to="/" className="nav-link">Главная</Link>
                        </li>
                        
                        {user ? (
                            <>
                                <li className="nav-item">
                                    <Link to="/files" className="nav-link">Файлы</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/upload" className="nav-link">Загрузить</Link>
                                </li>
                                
                                {/* АДМИН-ПАНЕЛЬ - только для администраторов */}
                                {user.is_staff && (
                                    <li className="nav-item">
                                        <Link to="/admin-panel" className="nav-link admin-link">
                                            ⚙️ Админ-панель
                                        </Link>
                                    </li>
                                )}
                                
                                <li className="nav-item user-info">
                                    <span className="username">
                                        👤 {user.username}
                                        {user.is_staff && ' (Admin)'}
                                    </span>
                                </li>
                                <li className="nav-item">
                                    <button 
                                        onClick={handleLogout}
                                        className="logout-btn"
                                    >
                                        Выйти
                                    </button>
                                </li>
                            </>
                        ) : (
                            <>
                                <li className="nav-item">
                                    <Link to="/login" className="nav-link">Войти</Link>
                                </li>
                                <li className="nav-item">
                                    <Link to="/register" className="nav-link register-link">
                                        Регистрация
                                    </Link>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
};

// Компонент футера
const Footer = () => {
    return (
        <footer className="footer">
            <div className="footer-container">
                <p>© {new Date().getFullYear()} Cloud Storage. Все права защищены.</p>
            </div>
        </footer>
    );
};

// Защищенный маршрут
const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const user = useSelector((state) => state.user);
    const [isChecking, setIsChecking] = useState(true);
    const [initialUser, setInitialUser] = useState(null);
    
    // Восстанавливаем пользователя из localStorage сразу
    useEffect(() => {
        const userFromStorage = localStorage.getItem('user');
        if (userFromStorage) {
            try {
                const parsedUser = JSON.parse(userFromStorage);
                setInitialUser(parsedUser);
                console.log('ProtectedRoute: Restored user from localStorage:', parsedUser.username);
            } catch (e) {
                console.error('ProtectedRoute: Error parsing user from storage:', e);
            }
        }
        
        // Уменьшаем время ожидания до 500 мс
        const timer = setTimeout(() => {
            setIsChecking(false);
        }, 500);
        
        return () => clearTimeout(timer);
    }, []);
    
    if (isChecking) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Проверка прав доступа...</p>
                {initialUser && (
                    <p className="user-welcome">Добро пожаловать, {initialUser.username}</p>
                )}
            </div>
        );
    }
    
    // Используем user из Redux ИЛИ initialUser из localStorage
    const currentUser = user || initialUser;
    
    if (!currentUser) {
        console.log('ProtectedRoute: No user found, redirecting to /login');
        return <Navigate to="/login" />;
    }
    
    if (requireAdmin && !currentUser.is_staff) {
        return (
            <div className="access-denied">
                <h2>Доступ запрещен</h2>
                <p>Только администраторы могут просматривать эту страницу.</p>
                <Link to="/files" className="back-link">Вернуться к файлам</Link>
            </div>
        );
    }
    
    console.log('ProtectedRoute: Access granted for', currentUser.username);
    return children;
};

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
    requireAdmin: PropTypes.bool,
};

// Главный компонент приложения
const App = () => {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.user);
    const [isAuthChecked, setIsAuthChecked] = useState(false);
    const [isAppReady, setIsAppReady] = useState(false);
    const [initialUser, setInitialUser] = useState(null);
    
    // Восстанавливаем user из localStorage сразу при монтировании
    useEffect(() => {
        const userFromStorage = localStorage.getItem('user');
        const tokenFromStorage = localStorage.getItem('token');
        
        console.log('App: Initial mount - localStorage token:', tokenFromStorage ? 'Exists' : 'Missing');
        console.log('App: Initial mount - localStorage user:', userFromStorage ? 'Exists' : 'Missing');
        
        if (userFromStorage) {
            try {
                const parsedUser = JSON.parse(userFromStorage);
                setInitialUser(parsedUser);
                console.log('App: Restored user from localStorage:', parsedUser.username);
            } catch (e) {
                console.error('App: Error parsing user from localStorage:', e);
            }
        }
    }, []); // ← ТОЛЬКО при монтировании!
    
    // Проверяем аутентификацию ТОЛЬКО при первом рендере
    useEffect(() => {
        console.log('App: Starting auth check...');
        
        const authenticate = async () => {
            await dispatch(checkAuth());
            setIsAuthChecked(true);
            
            // Короткая задержка для завершения инициализации
            setTimeout(() => {
                setIsAppReady(true);
                console.log('App: Full initialization complete.');
            }, 500); // Уменьшили до 500 мс
        };
        
        authenticate();
    }, [dispatch]); // ← ТОЛЬКО dispatch в зависимостях!
    
    // Если приложение еще не инициализировалось
    if (!isAppReady) {
        const hasLocalStorageUser = localStorage.getItem('user');
        
        return (
            <div className="app-loading">
                <div className="loading-spinner"></div>
                <p>Инициализация приложения...</p>
                {hasLocalStorageUser && (
                    <p className="loading-subtitle">
                        Восстанавливаем вашу сессию...
                    </p>
                )}
            </div>
        );
    }
    
    console.log('App: Rendering with user:', user || initialUser);
    
    return (
        <Router>
            <div className="app">
                <Navbar />
                <main className="main-content">
                    <Routes>
                        {/* Публичные маршруты */}
                        <Route path="/" element={<HomePage />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/login" element={<Login />} />
                        
                        {/* Защищенные маршруты */}
                        <Route 
                            path="/files" 
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            } 
                        />
                        <Route 
                            path="/upload" 
                            element={
                                <ProtectedRoute>
                                    <FileUpload />
                                </ProtectedRoute>
                            } 
                        />
                        
                        {/* Админ-маршруты (только для администраторов) */}
                       <Route 
                           path="/admin-panel" 
                           element={
                               <ProtectedRoute requireAdmin={true}>
                                   <AdminDashboard />
                               </ProtectedRoute>
                           } 
                       />
                        <Route 
                            path="/admin-panel/users" 
                            element={
                                <ProtectedRoute requireAdmin={true}>
                                    <AdminDashboard initialTab="users" />
                                </ProtectedRoute>
                            } 
                        />
                        
                        {/* Редирект для неизвестных маршрутов */}
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </main>
                <Footer />
            </div>
        </Router>
    );
};

export default App;
