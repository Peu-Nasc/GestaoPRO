document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.querySelector(".menu-toggle");
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("overlay");

    // Abre/fecha sidebar no clique do botão
    menuToggle.addEventListener("click", () => {
        sidebar.classList.toggle("show");
        overlay.style.display = sidebar.classList.contains("show") ? "block" : "none";
    });

    // Fecha sidebar se clicar no overlay
    overlay.addEventListener("click", () => {
        sidebar.classList.remove("show");
        overlay.style.display = "none";
    });
});
