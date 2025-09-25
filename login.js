import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const auth = getAuth(window.firebaseApp);
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Login bem-sucedido, redirecionar para a página principal
                console.log('Login bem-sucedido:', userCredential.user);
                window.location.href = 'index.html';
            })
            .catch((error) => {
                // Lidar com erros
                console.error('Erro no login:', error.code, error.message);
                errorMessage.textContent = 'Email ou senha inválidos.';
            });
    });
});