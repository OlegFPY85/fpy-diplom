import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { useEffect, useState, React } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { Register } from './components/Auth/Register';
import { Login } from './components/Auth/Login/Login';
import { Dashboard } from './components/Dashboard';
import { FileUpload } from './components/File/FileUpload';
import { checkAuth } from './redux/actions';
import './App.css';
import HomePage from './components/HomePage/HomePage';

const ProtectedRoute = ({ children }) => {
    const user = useSelector((state) => state.user);
    console.log("User in ProtectedRoute:", user);
    return user ? children : <Navigate to="/login" />;
};

ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
};

const App = () => {
    const dispatch = useDispatch();
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    useEffect(() => {
        const authenticate = async () => {
            await dispatch(checkAuth());
            setIsAuthChecked(true);
        };
        authenticate();
    }, [dispatch]);

    if (!isAuthChecked) {
        return <div>Loading...</div>;
    }

    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />

                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />

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

                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
};

export default App;