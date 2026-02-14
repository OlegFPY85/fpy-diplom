import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    loadFiles, 
    deleteFileAction, 
    viewFile, 
    downloadFile, 
    getShareLink,
    updateCommentAction,
    updateFileNameAction
} from '../../../redux/actions';
import styles from './FileList.module.css';

const FileList = ({ 
    searchText = '', 
    sortField = 'original_name', 
    sortOrder = 'asc',
    viewMode = 'all',
    userFilter = '',
    currentUser = null,
    users = []
}) => {
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingFileNameId, setEditingFileNameId] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [newFileName, setNewFileName] = useState('');
    
    const dispatch = useDispatch();
    const files = useSelector((state) => state.files);
    const token = localStorage.getItem('token');

    useEffect(() => {
        dispatch(loadFiles(token));
    }, [dispatch, token]);

    // Функция для получения имени пользователя (для заголовка фильтра)
    const getUsernameById = (userId) => {
        const user = users.find(u => u.id === userId);
        return user ? user.username : `User ${userId}`;
    };

    // Фильтрация и сортировка файлов
    const processedFiles = files
        .filter(file => {
            // Фильтрация по режиму просмотра
            if (viewMode === 'my') {
                if (file.user_id !== currentUser?.id) return false;
            }
            
            // Фильтрация по выбранному пользователю
            if (userFilter && file.user_id !== parseInt(userFilter)) {
                return false;
            }
            
            // Фильтрация по поисковому тексту
            if (searchText && !file.original_name.toLowerCase().includes(searchText.toLowerCase())) {
                return false;
            }
            
            return true;
        })
        .sort((a, b) => {
            let aValue = a[sortField];
            let bValue = b[sortField];
            
            // Для сортировки по пользователю используем user_display
            if (sortField === 'user') {
                aValue = a.user_display || a.user_name || `User ${a.user_id}`;
                bValue = b.user_display || b.user_name || `User ${b.user_id}`;
            }
            
            if (sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

    const handleDelete = (fileId) => {
        if (window.confirm('Вы уверены, что хотите удалить этот файл?')) {
            dispatch(deleteFileAction(fileId, token));
        }
    };

    const handleView = (fileId) => {
        dispatch(viewFile(fileId, token));
    };

    const handleDownload = (fileId) => {
        dispatch(downloadFile(fileId, token));
    };

    const handleShare = (fileId) => {
        dispatch(getShareLink(fileId, token));
    };

    const startEditComment = (file) => {
        setEditingCommentId(file.id);
        setNewComment(file.comment || '');
    };

    const saveComment = (fileId) => {
        dispatch(updateCommentAction(fileId, newComment, token))
            .then(() => {
                setEditingCommentId(null);
                setNewComment('');
            })
            .catch(error => {
                console.error('Ошибка обновления комментария:', error);
            });
    };

    const startEditFileName = (file) => {
        setEditingFileNameId(file.id);
        setNewFileName(file.original_name);
    };

    const saveFileName = (fileId) => {
        dispatch(updateFileNameAction(fileId, newFileName, token))
            .then(() => {
                setEditingFileNameId(null);
                setNewFileName('');
            })
            .catch(error => {
                console.error('Ошибка обновления имени файла:', error);
            });
    };

    const cancelEdit = () => {
        setEditingCommentId(null);
        setEditingFileNameId(null);
        setNewComment('');
        setNewFileName('');
    };

    // ВАЖНО: Эти функции должны быть объявлены!
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleCopyLink = async (fileId) => {
    try {
        const response = await fetch(`/api/files/${fileId}/get_special_link/`, {
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const link = data.special_link;
            
            // Копируем в буфер обмена
            await navigator.clipboard.writeText(link);
            alert('Ссылка скопирована в буфер обмена!');
        }
    } catch (err) {
        console.error('Ошибка копирования:', err);
        alert('Не удалось скопировать ссылку');
    }
};

    return (
        <div className={styles.fileList}>
            <h2>
                {viewMode === 'my' ? 'Мои файлы' : 'Все файлы'} 
                {userFilter && ` (фильтр: ${getUsernameById(parseInt(userFilter))})`}
            </h2>
            
            {processedFiles.length === 0 ? (
                <p className={styles.noFiles}>Файлы не найдены</p>
            ) : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Имя файла</th>
                            {viewMode === 'all' && <th>Владелец</th>}
                            <th>Размер</th>
                            <th>Дата загрузки</th>
                            <th>Комментарий</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedFiles.map(file => (
                            <tr key={file.id} className={styles.fileRow}>
                                {/* Имя файла */}
                                <td>
                                    {editingFileNameId === file.id ? (
                                        <div className={styles.editContainer}>
                                            <input
                                                type="text"
                                                value={newFileName}
                                                onChange={(e) => setNewFileName(e.target.value)}
                                                className={styles.editInput}
                                            />
                                            <button 
                                                onClick={() => saveFileName(file.id)}
                                                className={styles.saveBtn}
                                            >
                                                ✓
                                            </button>
                                            <button 
                                                onClick={cancelEdit}
                                                className={styles.cancelBtn}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={styles.fileName}>
                                            <span 
                                                className={styles.fileNameText}
                                                onClick={() => startEditFileName(file)}
                                                title="Нажмите для редактирования"
                                            >
                                                {file.original_name}
                                            </span>
                                        </div>
                                    )}
                                </td>
                                
                                {/* Владелец (только в режиме всех файлов) */}
                                {viewMode === 'all' && (
                                    <td>
                                        <span className={
                                            file.user_id === currentUser?.id ? 
                                            styles.currentUser : ''
                                        }>
                                            {/* ИСПРАВЛЕННАЯ СТРОКА */}
                                            {file.user_display || file.user_name || `User ${file.user_id}`}
                                            {file.user_id === currentUser?.id && " (you)"}
                                        </span>
                                    </td>
                                )}
                                
                                <td>{formatFileSize(file.size)}</td>
                                <td>{formatDate(file.upload_date)}</td>
                                
                                {/* Комментарий */}
                                <td>
                                    {editingCommentId === file.id ? (
                                        <div className={styles.editContainer}>
                                            <input
                                                type="text"
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                                className={styles.editInput}
                                                placeholder="Введите комментарий"
                                            />
                                            <button 
                                                onClick={() => saveComment(file.id)}
                                                className={styles.saveBtn}
                                            >
                                                ✓
                                            </button>
                                            <button 
                                                onClick={cancelEdit}
                                                className={styles.cancelBtn}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <div 
                                            className={styles.comment}
                                            onClick={() => startEditComment(file)}
                                            title="Нажмите для редактирования"
                                        >
                                            {file.comment || <em>нет комментария</em>}
                                        </div>
                                    )}
                                </td>
                                
                                {/* Действия */}
                                <td>
                                    <div className={styles.actions}>
                                        <button 
                                            onClick={() => handleView(file.id)}
                                            className={styles.viewBtn}
                                            title="Просмотр"
                                        >
                                            👁️
                                        </button>
                                        <button 
                                            onClick={() => handleDownload(file.id)}
                                            className={styles.downloadBtn}
                                            title="Скачать"
                                        >
                                            ⬇️
                                        </button>
                                        <button 
                                            onClick={() => handleShare(file.id)}
                                            className={styles.shareBtn}
                                            title="Поделиться"
                                        >
                                            🔗
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(file.id)}
                                            className={styles.deleteBtn}
                                            title="Удалить"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default FileList;
