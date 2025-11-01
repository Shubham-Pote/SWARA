import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthUI } from '../components/auth-fuse';
import { useAuth } from '../contexts/AuthContext';
import SigninImage from '../assets/images/Signin.png';
import SignupImage from '../assets/images/Signup.jpeg';

const Auth: React.FC = () => {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Listen for auth events from the AuthUI component
  useEffect(() => {
    const handleSignIn = async (event: CustomEvent) => {
      try {
        const { email, password } = event.detail;
        await login(email, password);
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Login failed:', error);
        alert(error.message || 'Login failed');
      }
    };

    const handleSignUp = async (event: CustomEvent) => {
      try {
        const { email, password, displayName } = event.detail;
        await register({ email, password, displayName });
        navigate('/dashboard');
      } catch (error: any) {
        console.error('Registration failed:', error);
        alert(error.message || 'Registration failed');
      }
    };

    window.addEventListener('authSignIn' as any, handleSignIn);
    window.addEventListener('authSignUp' as any, handleSignUp);

    return () => {
      window.removeEventListener('authSignIn' as any, handleSignIn);
      window.removeEventListener('authSignUp' as any, handleSignUp);
    };
  }, [login, register, navigate]);

  const signInContent = {
    image: {
      src: SigninImage,
      alt: "Sign in illustration"
    },
    quote: {
      text: "Welcome back! Continue your learning journey...",
      author: "AI Learner"
    }
  };

  const signUpContent = {
    image: {
      src: SignupImage,
      alt: "Sign up illustration" 
    },
    quote: {
      text: "A New Language, A New World...",
      author: "AI Learner"
    }
  };

  return (
    <AuthUI 
      signInContent={signInContent}
      signUpContent={signUpContent}
    />
  );
};

export default Auth;