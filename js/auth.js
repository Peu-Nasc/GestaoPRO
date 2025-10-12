import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// Função para lidar com o login na página de login
function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            window.location.href = 'index.html';
        })
        .catch((error) => {
            errorMessage.textContent = 'Email ou senha inválidos.';
            console.error('Erro no login:', error);
        });
}

// Função para lidar com o logout na página principal
function handleLogout() {
    signOut(auth).catch(error => console.error("Erro no logout:", error));
}

// Verifica o estado da autenticação e redireciona ou inicia a app
function checkAuthState(initAppCallback) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            initAppCallback(user);
        } else {
            // Se não estamos na página de login, redireciona para lá
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
            }
        }
    });
}

export { handleLogin, handleLogout, checkAuthState };