import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { upload } from '../../../redux/actions';
import styles from './FileUpload.module.css';

export const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [comment, setComment] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const user = useSelector((state) => state.user);
    const dispatch = useDispatch();

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setError('');
        setSuccess('');
        
        // Автоматическое заполнение комментария именем файла
        if (selectedFile && !comment) {
            setComment(selectedFile.name);
        }
    };

    const handleCommentChange = (e) => {
        setComment(e.target.value);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (!file) {
            setError('Пожалуйста, выберите файл');
            return;
        }
        
        if (!user) {
            setError('Требуется авторизация');
            return;
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Токен не найден');
            return;
        }

        setIsUploading(true);
        
        try {
            console.log('Uploading file:', file.name, 'comment:', comment);
            await dispatch(upload(file, comment, token));
            
            setSuccess(`Файл "${file.name}" успешно загружен!`);
            setFile(null);
            setComment('');
            // Очищаем поле input file
            e.target.reset();
            
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.message || 'Ошибка загрузки файла');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={styles["file-upload-container"]}>
            <h2>Загрузка файла</h2>
            
            <form className={styles["file-upload-form"]} onSubmit={handleUpload}>
                <div className={styles["form-group"]}>
                    <label htmlFor="file-input">Выберите файл:</label>
                    <input 
                        id="file-input"
                        type="file" 
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                    {file && (
                        <div className={styles["file-info"]}>
                            📄 Выбран файл: <strong>{file.name}</strong> 
                            ({Math.round(file.size / 1024)} KB)
                        </div>
                    )}
                </div>
                
                <div className={styles["form-group"]}>
                    <label htmlFor="comment">Комментарий (опционально):</label>
                    <textarea
                        id="comment"
                        value={comment}
                        onChange={handleCommentChange}
                        placeholder="Введите комментарий к файлу..."
                        disabled={isUploading}
                        rows="3"
                    />
                </div>
                
                <button 
                    type="submit" 
                    disabled={isUploading || !file}
                    className={styles["upload-button"]}
                >
                    {isUploading ? 'Загрузка...' : 'Загрузить файл'}
                </button>
                
                {error && (
                    <div className={styles["error-message"]}>
                        ⚠️ {error}
                    </div>
                )}
                
                {success && (
                    <div className={styles["success-message"]}>
                        ✅ {success}
                    </div>
                )}
            </form>
            
            {/* Добавьте эти стили в FileUpload.module.css */}
            <style jsx>{`
                .file-upload-container {
                    max-width: 500px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                }
                input[type="file"], textarea {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                .upload-button {
                    background-color: #007bff;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .upload-button:disabled {
                    background-color: #ccc;
                    cursor: not-allowed;
                }
                .error-message {
                    color: #dc3545;
                    margin-top: 10px;
                }
                .success-message {
                    color: #28a745;
                    margin-top: 10px;
                }
            `}</style>
        </div>
    );
};
