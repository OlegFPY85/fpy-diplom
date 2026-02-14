import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { login } from '../../../redux/actions';
import styles from './Login.module.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const formRef = useRef(null);
    const usernameRef = useRef(null);

    // Фокус на поле ввода при загрузке
    useEffect(() => {
        usernameRef.current?.focus();
    }, []);

    // Блокировка Enter на не-submit полях
    useEffect(() => {
        const form = formRef.current;
        if (!form) return;

        const handleKeyDown = (e) => {
            // Если нажали Enter не на кнопке submit
            if (e.key === 'Enter' && 
                e.target.type !== 'submit' && 
                e.target.tagName !== 'BUTTON') {
                
                // Если форма уже сабмитится, блокируем
                if (isSubmitting) {
                    e.preventDefault();
                    return;
                }
                
                // Иначе сабмитим корректно
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn && !submitBtn.disabled) {
                    e.preventDefault();
                    submitBtn.click();
                }
            } // ← ЭТА СКОБКА БЫЛА ПРОПУЩЕНА
        };

        form.addEventListener('keydown', handleKeyDown);
        return () => form.removeEventListener('keydown', handleKeyDown);
    }, [isSubmitting]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Защита от двойного сабмита
        if (isSubmitting) {
            console.log('Login: Already submitting, ignoring');
            return;
        }
        
        if (!username.trim() || !password.trim()) {
            setError('Введите имя пользователя и пароль');
            return;
        }
        
        setIsSubmitting(true);
        setError('');
        
        console.log('Login: Starting authentication for', username);
        
        try {
            // Вызываем Redux action
            await dispatch(login({ username, password }));
            
            console.log('Login: Success, redirecting to /files...');
            
            // ✅ ДОБАВЛЕН РЕДИРЕКТ - ВАЖНОЕ ИЗМЕНЕНИЕ
            navigate('/files');
            
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Ошибка входа');
            setIsSubmitting(false);
        }
    };

    return (
        <form 
            ref={formRef} 
            className={styles["login-form"]} 
            onSubmit={handleSubmit}
            noValidate
        >
            <input 
                ref={usernameRef}
                type="text" 
                placeholder="Username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)} 
                autoComplete="username"
                disabled={isSubmitting}
                required
            />
            
            <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)} 
                autoComplete="current-password"
                disabled={isSubmitting}
                required
            />
            
            <div className={styles["buttons-container"]}>
                <button 
                    type="submit" 
                    disabled={isSubmitting || !username || !password}
                >
                    {isSubmitting ? 'Logging in...' : 'Login'}
                </button>
            </div>
            
            {error && <p className={styles.error}>{error}</p>}
        </form>
    );
};

export default Login;
