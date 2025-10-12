// js/login.js
// O caminho de importação está correto porque agora ambos os arquivos (login.js e auth.js)
// estão dentro da mesma pasta 'js/'.
import { handleLogin } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleLogin();
        });
    }
});