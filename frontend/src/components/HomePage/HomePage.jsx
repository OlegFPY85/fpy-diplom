import React from 'react';
import './HomePage.css';
import logo from '../../assets/logo.jpg';

const HomePage = () => {
  return (
    <div className="home-container">
      <section className="hero-section">
        <div className="logo-container">
          <img src={logo} alt="MyCloud Logo" />
          <h1>MyCloud</h1> 
          <p>Ваше персональное облако</p>
        </div>
        <div className="auth-buttons">
          <a href="/login" className="btn btn-login">Login</a>
          <a href="/register" className="btn btn-register">Sign Up</a>
        </div>
      </section>
    </div>
  );
};

export default HomePage;