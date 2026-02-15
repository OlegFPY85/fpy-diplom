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

const API_URL = import.meta.env.VITE_API_URL;

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
    const [localError, setLocalError] = useState(null);
    
    const dispatch = useDispatch();
    const reduxFiles = useSelector((state) => state.files);
    const token = localStorage.getItem('token');

    // ==== ЗАЩИТА: гарантируем, что files - это массив ====
    const files = Array.isArray(reduxFiles) ? reduxFiles : [];
    
    // ==== ОТЛАДКА В КОНСОЛИ ====
    useEffect(() => {
        console.log('📁 FileList mounted/updated:', {
            filesCount: files.length,
            isArray: Array.isArray(files),
            viewMode,
            userFilter,
            currentUser: currentUser?.username
        });
        
        if (files.length > 0) {
            console.log('📁 First file sample:', files[0]);
        }
    }, [files, viewMode, userFilter, currentUser]);

    // ==== ПРОВЕРКА НА ДУБЛИКАТЫ ID ====
    useEffect(() => {
        if (files.length > 0) {
            const ids = files.map(f => f?.id).filter(id => id !== undefined);
            const uniqueIds = new Set(ids);
            if (ids.length !== uniqueIds.size) {
                console.warn('⚠️ Обнаружены дубликаты file.id!');
                const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
                console.warn('Дублирующиеся id:', [...new Set(duplicates)]);
            }
        }
    }, [files]);

    // ==== ЗАГРУЗКА ФАЙЛОВ ПРИ МОНТИРОВАНИИ ====
    useEffect(() => {
        if (token) {
            dispatch(loadFiles(token)).catch(error => {
                console.error('Ошибка загрузки файлов:', error);
                setLocalError('Не удалось загрузить файлы');
            });
        }
    }, [dispatch, token]);

    // ==== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====
    const getUsernameById = (userId) => {
        if (!userId) return 'Unknown';
        const user = users.find(u => u.id === userId);
        return user ? user.username : `User ${userId}`;
    };

    const formatFileSize = (bytes) => {
        if (bytes === undefined || bytes === null) return '0 Bytes';
        if (bytes === 0) return '0 Bytes';
        try {
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        } catch {
            return '0 Bytes';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    // ==== ОБРАБОТКА ФАЙЛОВ (ФИЛЬТРАЦИЯ И СОРТИРОВКА) ====
    const processedFiles = (() => {
        // Если нет файлов или ошибка, возвращаем пустой массив
        if (files.length === 0) return [];
        
        try {
            // Шаг 1: Фильтрация
            let filtered = files.filter(file => {
                // Пропускаем некорректные записи
                if (!file || typeof file !== 'object') return false;
                
                // Фильтрация по режиму просмотра
                if (viewMode === 'my') {
                    if (!currentUser || file.user_id !== currentUser.id) return false;
                }
                
                // Фильтрация по выбранному пользователю
                if (userFilter && file.user_id !== parseInt(userFilter)) {
                    return false;
                }
                
                // Фильтрация по поисковому тексту
                if (searchText) {
                    const fileName = file.original_name || '';
                    if (!fileName.toLowerCase().includes(searchText.toLowerCase())) {
                        return false;
                    }
                }
                
                return true;
            });
            
            // Шаг 2: Сортировка
            filtered.sort((a, b) => {
                // Получаем значения для сортировки
                let aValue, bValue;
                
                if (sortField === 'user') {
                    aValue = a.user_display || a.user_name || `User ${a.user_id}`;
                    bValue = b.user_display || b.user_name || `User ${b.user_id}`;
                } else {
                    aValue = a[sortField] ?? '';
                    bValue = b[sortField] ?? '';
                }
                
                // Сравниваем
                if (sortOrder === 'asc') {
                    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                } else {
                    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
                }
            });
            
            return filtered;
            
        } catch (error) {
            console.error('Ошибка при обработке файлов:', error);
            setLocalError('Ошибка при отображении файлов');
            return [];
        }
    })();

    // ==== ОБРАБОТЧИКИ ДЕЙСТВИЙ ====
    const handleDelete = (fileId) => {
        if (window.confirm('Вы уверены, что хотите удалить этот файл?')) {
            dispatch(deleteFileAction(fileId, token))
                .catch(error => {
                    console.error('Ошибка удаления:', error);
                    alert('Не удалось удалить файл');
                });
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
                alert('Не удалось обновить комментарий');
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
                alert('Не удалось обновить имя файла');
            });
    };

    const cancelEdit = () => {
        setEditingCommentId(null);
        setEditingFileNameId(null);
        setNewComment('');
        setNewFileName('');
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
                await navigator.clipboard.writeText(link);
                alert('Ссылка скопирована в буфер обмена!');
            } else {
                alert('Не удалось получить ссылку');
            }
        } catch (err) {
            console.error('Ошибка копирования:', err);
            alert('Не удалось скопировать ссылку');
        }
    };

    // ==== ОТОБРАЖЕНИЕ КОМПОНЕНТА ====
    
    // Если ошибка
    if (localError) {
        return (
            <div className={styles.error}>
                <h3>Ошибка</h3>
                <p>{localError}</p>
                <button onClick={() => window.location.reload()}>
                    Обновить страницу
                </button>
            </div>
        );
    }

    return (
        <div className={styles.fileList}>
            <h2>
                {viewMode === 'my' ? 'Мои файлы' : 'Все файлы'} 
                {userFilter && ` (фильтр: ${getUsernameById(parseInt(userFilter))})`}
                <span className={styles.fileCount}>
                    {processedFiles.length} {processedFiles.length === 1 ? 'файл' : 
                      processedFiles.length >= 2 && processedFiles.length <= 4 ? 'файла' : 'файлов'}
                </span>
            </h2>
            
            {processedFiles.length === 0 ? (
                <p className={styles.noFiles}>
                    {files.length === 0 
                        ? 'Файлы не загружены' 
                        : 'Нет файлов, соответствующих фильтрам'}
                </p>
            ) : (
                <div className={styles.tableWrapper}>
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
                            {processedFiles.map((file, index) => (
                                <tr 
                                    key={file.id || `temp-${index}`} 
                                    className={styles.fileRow}
                                >
                                    {/* Имя файла */}
                                    <td>
                                        {editingFileNameId === file.id ? (
                                            <div className={styles.editContainer}>
                                                <input
                                                    type="text"
                                                    value={newFileName}
                                                    onChange={(e) => setNewFileName(e.target.value)}
                                                    className={styles.editInput}
                                                    autoFocus
                                                />
                                                <button 
                                                    onClick={() => saveFileName(file.id)}
                                                    className={styles.saveBtn}
                                                    title="Сохранить"
                                                >
                                                    ✓
                                                </button>
                                                <button 
                                                    onClick={cancelEdit}
                                                    className={styles.cancelBtn}
                                                    title="Отмена"
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
                                                    {file.original_name || 'Без имени'}
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
                                                {file.user_display || file.user_name || `User ${file.user_id}`}
                                                {file.user_id === currentUser?.id && " (you)"}
                                            </span>
                                        </td>
                                    )}
                                    
                                    {/* Размер */}
                                    <td>{formatFileSize(file.size)}</td>
                                    
                                    {/* Дата загрузки */}
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
                                                    autoFocus
                                                />
                                                <button 
                                                    onClick={() => saveComment(file.id)}
                                                    className={styles.saveBtn}
                                                    title="Сохранить"
                                                >
                                                    ✓
                                                </button>
                                                <button 
                                                    onClick={cancelEdit}
                                                    className={styles.cancelBtn}
                                                    title="Отмена"
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
                                                onClick={() => handleCopyLink(file.id)}
                                                className={styles.shareBtn}
                                                title="Копировать ссылку"
                                            >
                                                📋
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
                </div>
            )}
        </div>
    );
};

export default FileList;
