import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { upload } from '../../../redux/actions';
import styles from './FileUpload.module.css';

export const FileUpload = () => {
    const [file, setFile] = useState(null);
    const user = useSelector((state) => state.user);
    
    const dispatch = useDispatch();

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        if (file && user && token) {
            dispatch(upload(file, token));
        }
    };

    return (
        <form className={styles["file-upload-form"]} onSubmit={handleUpload}>
            <input type="file" onChange={handleFileChange} />
            <button type="submit">Upload</button>
        </form>
    );
};
