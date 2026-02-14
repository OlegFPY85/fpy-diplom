import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { register } from '../../../redux/actions';
import { useNavigate } from 'react-router-dom';
import styles from './Register.module.css';

export const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState(''); 
    const [error, setError] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await dispatch(register({ username, email, password, first_name: firstName, last_name: lastName }));
            navigate('/files');
        } catch (err) {
            console.error(err);
            setError("Registration failed. Please try again.");
        }
    };

    return (
        <form className={styles["register-form"]} onSubmit={handleSubmit}>
            <input type="text" placeholder="Username" onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <input type="text" placeholder="First Name" onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
            <input type="text" placeholder="Last Name" onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
            <button type="submit">Register</button>
            {error && <p className={styles.error}>{error}</p>}
        </form>
    );
};

function displayValidationErrors(errors) {
    let errorMessage = 'Пожалуйста, исправьте следующие ошибки:\n\n';
    
    for (const [field, messages] of Object.entries(errors)) {
        if (messages && messages.length > 0) {
            const fieldNames = {
                'username': 'Имя пользователя',
                'email': 'Email', 
                'password': 'Пароль'
            };
            const fieldName = fieldNames[field] || field;
            errorMessage += `• ${fieldName}: ${messages[0]}\n`;
        }
    }
    
    alert(errorMessage);
}