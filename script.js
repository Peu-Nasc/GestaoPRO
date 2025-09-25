// Importa as funções do Firestore e Auth que vamos usar
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { 
    collection, getDocs, addDoc, deleteDoc, doc, 
    getDoc, updateDoc, serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const auth = getAuth(window.firebaseApp);
const db = window.db;

// LÓGICA DE AUTENTICAÇÃO
onAuthStateChanged(auth, (user) => {
    if (user) {
        // O utilizador está logado, busca os dados da empresa e inicia a aplicação
        console.log("Utilizador autenticado:", user.uid);
        iniciarAplicacao(user);
    } else {
        // Ninguém logado, redireciona para a página de login
        console.log("Nenhum utilizador autenticado. Redirecionando para login...");
        window.location.href = 'login.html';
    }
});

async function iniciarAplicacao(user) {
    // Busca a empresaId do utilizador logado
    const utilizadorDocRef = doc(db, "utilizadores", user.uid);
    const utilizadorDocSnap = await getDoc(utilizadorDocRef);

    if (!utilizadorDocSnap.exists()) {
        console.error("Dados do utilizador não encontrados no Firestore!");
        alert("Erro de configuração da conta. Contacte o suporte.");
        signOut(auth); // Desloga o utilizador se a conta estiver mal configurada
        return;
    }
    
    const empresaLogadaId = utilizadorDocSnap.data().empresaId;
    console.log("Empresa ID:", empresaLogadaId);

    // --- ELEMENTOS DO DOM ---
    const navLinks = document.querySelectorAll('nav a');
    const contentSections = document.querySelectorAll('.content-section');
    const totalRevenueEl = document.getElementById('total-revenue');
    const totalProductsEl = document.getElementById('total-products');
    const lowStockItemsEl = document.getElementById('low-stock-items');
    const salesChartCanvas = document.getElementById('salesChart');
    const topProductsCanvas = document.getElementById('topProductsChart');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const addProductForm = document.getElementById('addProductForm'), productNameInput = document.getElementById('productName'), productStockInput = document.getElementById('productStock'), productPriceInput = document.getElementById('productPrice'), productTableBody = document.getElementById('productTableBody'), productSearchInput = document.getElementById('productSearch'), saleProductSelect = document.getElementById('saleProductSelect'), saleQuantityInput = document.getElementById('saleQuantity'), addSaleForm = document.getElementById('addSaleForm'), purchaseProductSelect = document.getElementById('purchaseProductSelect'), purchaseQuantityInput = document.getElementById('purchaseQuantity'), addPurchaseForm = document.getElementById('addPurchaseForm');
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    // Atualiza o ano no footer
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // Adiciona botão de Logout (se ainda não existir)
    if (!document.getElementById('logoutBtn')) {
        const logoutButton = document.createElement('li');
        logoutButton.innerHTML = `<a href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Sair</a>`;
        document.querySelector('.sidebar nav ul').appendChild(logoutButton);
        logoutButton.addEventListener('click', () => signOut(auth));
    }

    // --- DADOS EM TEMPO REAL ---
    let allProducts = [], allSales = [], salesChart, topProductsChart;

    // --- FUNÇÕES DE LÓGICA ---
    async function fetchDataAndRender() {
        await fetchProducts();
        await fetchSales();
        renderAll();
    }

    async function fetchProducts() {
        try { 
            const q = query(collection(db, "products"), where("empresaId", "==", empresaLogadaId));
            const querySnapshot = await getDocs(q);
            allProducts = []; 
            querySnapshot.forEach((doc) => allProducts.push({ id: doc.id, ...doc.data() })); 
        } catch (e) { console.error("Erro ao buscar produtos: ", e); }
    }
    async function fetchSales() {
        try { 
            const q = query(collection(db, "sales"), where("empresaId", "==", empresaLogadaId));
            const querySnapshot = await getDocs(q);
            allSales = []; 
            querySnapshot.forEach((doc) => allSales.push({ id: doc.id, ...doc.data() })); 
        } catch (e) { console.error("Erro ao buscar vendas: ", e); }
    }

    function renderAll(period = 'all') {
        renderProductTable();
        updateProductSelects();
        updateDashboard(period);
    }

    const renderProductTable = (filter = '') => { 
        const filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));
        productTableBody.innerHTML = ''; 
        if(filteredProducts.length === 0){ productTableBody.innerHTML = `<tr><td colspan="4">Nenhum produto.</td></tr>`; return; }
        filteredProducts.forEach(p => { const r = document.createElement('tr'); r.innerHTML = `<td>${p.name}</td><td style="color:${p.stock <= 10 ? '#ef4444' : 'inherit'}">${p.stock}</td><td>R$ ${p.price.toFixed(2)}</td><td><button class="delete-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button></td>`; productTableBody.appendChild(r); });
    };

    const updateProductSelects = () => {
        saleProductSelect.innerHTML = '<option value="" disabled selected>Selecione</option>'; purchaseProductSelect.innerHTML = '<option value="" disabled selected>Selecione</option>';
        allProducts.forEach(p => { const o = `<option value="${p.id}">${p.name} (Estoque: ${p.stock})</option>`; saleProductSelect.innerHTML += o; purchaseProductSelect.innerHTML += o; });
    };

    const updateDashboard = (period = 'all') => {
        const filteredSales = filterSalesByPeriod(allSales, period);
        const lowStockCount = allProducts.filter(p => p.stock <= 10).length;
        totalProductsEl.textContent = allProducts.length;
        lowStockItemsEl.textContent = lowStockCount;
        const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
        totalRevenueEl.textContent = `R$ ${totalRevenue.toFixed(2)}`;
        updateSalesChart(filteredSales);
        updateTopProductsChart(filteredSales);
    };

    function filterSalesByPeriod(sales, period) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (period === 'today') {
            return sales.filter(sale => new Date(sale.date.seconds * 1000) >= today);
        }
        if (period === 'week') {
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            return sales.filter(sale => new Date(sale.date.seconds * 1000) >= startOfWeek);
        }
        if (period === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return sales.filter(sale => new Date(sale.date.seconds * 1000) >= startOfMonth);
        }
        return sales;
    }
    
    const updateSalesChart = (salesData) => {
        const salesByDate = salesData.reduce((a,c) => { const d = new Date(c.date.seconds*1000).toLocaleDateString('pt-BR'); a[d] = (a[d] || 0) + c.total; return a; }, {});
        const labels = Object.keys(salesByDate);
        const data = Object.values(salesByDate);
        if (salesChart) salesChart.destroy();
        salesChart = new Chart(salesChartCanvas, { type:'line', data:{ labels, datasets:[{ label:'Vendas/Dia (R$)', data, borderColor:'#4f46e5', backgroundColor:'rgba(79,70,229,0.1)', fill:true, tension:0.3 }] }, options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true } } } });
    };

    const updateTopProductsChart = (salesData) => {
        const productSales = salesData.reduce((acc, sale) => { acc[sale.productName] = (acc[sale.productName] || 0) + sale.total; return acc; }, {});
        const sortedProducts = Object.entries(productSales).sort(([,a],[,b]) => b-a).slice(0, 5);
        const labels = sortedProducts.map(([name]) => name);
        const data = sortedProducts.map(([, total]) => total);
        if (topProductsChart) topProductsChart.destroy();
        topProductsChart = new Chart(topProductsCanvas, { type:'bar', data:{ labels, datasets:[{ label:'Top 5 Produtos (R$)', data, backgroundColor: ['rgba(79, 70, 229, 0.8)', 'rgba(79, 70, 229, 0.7)', 'rgba(79, 70, 229, 0.6)', 'rgba(79, 70, 229, 0.5)', 'rgba(79, 70, 229, 0.4)'] }] }, options:{ maintainAspectRatio:false, responsive:true, scales:{ y:{ beginAtZero:true } } } });
    };
    
    // --- EVENT LISTENERS ---
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('show'));
    filterButtons.forEach(button => { button.addEventListener('click', () => { filterButtons.forEach(btn => btn.classList.remove('active')); button.classList.add('active'); const period = button.dataset.period; updateDashboard(period); }); });
    navLinks.forEach(link => { link.addEventListener('click', e => { if (sidebar.classList.contains('show')) { sidebar.classList.remove('show'); } e.preventDefault(); const t = link.getAttribute('href').substring(1); navLinks.forEach(l => l.classList.remove('active')); link.classList.add('active'); contentSections.forEach(s => { if(s.id === t) s.classList.remove('hidden'); else s.classList.add('hidden'); }); }); });
    addProductForm.addEventListener('submit', async e => { e.preventDefault(); const p = { name:productNameInput.value, stock:parseInt(productStockInput.value), price:parseFloat(productPriceInput.value), empresaId: empresaLogadaId }; if(!p.name || isNaN(p.stock) || isNaN(p.price)) { return alert("Preencha corretamente."); } try { await addDoc(collection(db, "products"), p); addProductForm.reset(); fetchDataAndRender(); alert("Produto adicionado!"); } catch(r) { console.error("Erro: ", r); } });
    productTableBody.addEventListener('click', async e => { if(e.target.closest('.delete-btn')) { const t = e.target.closest('.delete-btn'), n = t.dataset.id; if(confirm('Excluir este produto?')) { try { await deleteDoc(doc(db, "products", n)); fetchDataAndRender(); alert('Excluído!'); } catch(r) { console.error("Erro: ", r); } } } });
    addSaleForm.addEventListener('submit', async e => { e.preventDefault(); const t = saleProductSelect.value, n = parseInt(saleQuantityInput.value); if(!t || isNaN(n) || n <= 0) { return alert("Selecione produto e quantidade."); } const o = doc(db, "products", t); try { const c = await getDoc(o); if(!c.exists() || c.data().empresaId !== empresaLogadaId) return alert("Produto não encontrado ou não pertence à sua empresa!"); const d = c.data().stock; if(d < n) return alert("Estoque insuficiente!"); const i = d - n; await updateDoc(o, { stock: i }); await addDoc(collection(db, "sales"), { productId:t, productName:c.data().name, quantity:n, price:c.data().price, total:c.data().price*n, date:serverTimestamp(), empresaId: empresaLogadaId }); addSaleForm.reset(); fetchDataAndRender(); alert("Venda registrada!"); } catch(r) { console.error("Erro: ", r); } });
    addPurchaseForm.addEventListener('submit', async e => { e.preventDefault(); const t = purchaseProductSelect.value, n = parseInt(purchaseQuantityInput.value); if(!t || isNaN(n) || n <= 0) { return alert("Selecione produto e quantidade."); } const o = doc(db, "products", t); try { const c = await getDoc(o); if(!c.exists() || c.data().empresaId !== empresaLogadaId) return alert("Produto não encontrado ou não pertence à sua empresa!"); const d = c.data().stock, i = d + n; await updateDoc(o, { stock: i }); addPurchaseForm.reset(); fetchDataAndRender(); alert("Compra registrada!"); } catch(r) { console.error("Erro: ", r); } });
    productSearchInput.addEventListener('input', e => renderProductTable(e.target.value));

    // --- INICIALIZAÇÃO ---
    fetchDataAndRender();
}