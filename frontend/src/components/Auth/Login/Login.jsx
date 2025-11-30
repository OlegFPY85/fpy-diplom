import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { login } from '../../../redux/actions';
import styles from './Login.module.css';

export const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await dispatch(login({ username, password }));
            navigate('/files');
        } catch (err) {
            console.error(err);
            setError("Invalid credentials. Please try again.");
        }
    };

    return (
        <form className={styles["login-form"]} onSubmit={handleSubmit}>
            <input type="text" placeholder="Username" onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <div className={styles["buttons-container"]}>
                <button type="submit">Login</button>
            </div>
            {error && <p className={styles.error}>{error}</p>}
        </form>
    );
};
