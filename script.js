// Importa as funções do Firestore que vamos usar
import { 
    collection, getDocs, addDoc, deleteDoc, doc, 
    getDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // A variável 'db' foi criada no index.html e agora a usamos aqui
    const db = window.db;

    // --- ELEMENTOS DO DOM ---
    const navLinks = document.querySelectorAll('nav a');
    const contentSections = document.querySelectorAll('.content-section');
    const totalRevenueEl = document.getElementById('total-revenue');
    const totalProductsEl = document.getElementById('total-products');
    const lowStockItemsEl = document.getElementById('low-stock-items');
    const salesChartCanvas = document.getElementById('salesChart');
    const topProductsCanvas = document.getElementById('topProductsChart');
    const addProductForm = document.getElementById('addProductForm'), productNameInput = document.getElementById('productName'), productStockInput = document.getElementById('productStock'), productPriceInput = document.getElementById('productPrice'), productTableBody = document.getElementById('productTableBody'), productSearchInput = document.getElementById('productSearch'), saleProductSelect = document.getElementById('saleProductSelect'), saleQuantityInput = document.getElementById('saleQuantity'), addSaleForm = document.getElementById('addSaleForm'), purchaseProductSelect = document.getElementById('purchaseProductSelect'), purchaseQuantityInput = document.getElementById('purchaseQuantity'), addPurchaseForm = document.getElementById('addPurchaseForm');
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    
    // --- DADOS EM TEMPO REAL ---
    let products = [];
    let sales = [];
    let salesChart;
    let topProductsChart;

    // --- FUNÇÕES DE LÓGICA ---
    async function fetchDataAndRender() {
        await fetchProducts();
        await fetchSales();
        renderAll();
    }

    async function fetchProducts() {
        try { const q = await getDocs(collection(db, "products")); products = []; q.forEach((doc) => products.push({ id: doc.id, ...doc.data() })); } catch (e) { console.error("Erro ao buscar produtos: ", e); }
    }
    async function fetchSales() {
        try { const q = await getDocs(collection(db, "sales")); sales = []; q.forEach((doc) => sales.push({ id: doc.id, ...doc.data() })); } catch (e) { console.error("Erro ao buscar vendas: ", e); }
    }

    function renderAll() {
        renderProductTable();
        updateProductSelects();
        updateDashboard();
    }

    const renderProductTable = (filter = '') => { 
        productTableBody.innerHTML = ''; const f = products.filter(p=>p.name.toLowerCase().includes(filter.toLowerCase())); if(f.length===0){productTableBody.innerHTML=`<tr><td colspan="4">Nenhum produto.</td></tr>`;return;} f.forEach(p=>{const r=document.createElement('tr');r.innerHTML=`<td>${p.name}</td><td style="color:${p.stock<=10?'#ef4444':'inherit'}">${p.stock}</td><td>R$ ${p.price.toFixed(2)}</td><td><button class="delete-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button></td>`;productTableBody.appendChild(r);});
    };
    const updateProductSelects = () => {
        saleProductSelect.innerHTML='<option value="" disabled selected>Selecione</option>';purchaseProductSelect.innerHTML='<option value="" disabled selected>Selecione</option>';products.forEach(p=>{const o=`<option value="${p.id}">${p.name} (Estoque: ${p.stock})</option>`;saleProductSelect.innerHTML+=o;purchaseProductSelect.innerHTML+=o;});
    };

    const updateDashboard = () => {
        const lowStockCount = products.filter(p => p.stock <= 10).length;
        totalProductsEl.textContent = products.length;
        lowStockItemsEl.textContent = lowStockCount;
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
        totalRevenueEl.textContent = `R$ ${totalRevenue.toFixed(2)}`;
        
        updateSalesChart();
        updateTopProductsChart();
    };
    
    const updateSalesChart = () => {
        const s=sales.reduce((a,c)=>{const d=new Date(c.date.seconds*1000).toLocaleDateString('pt-BR');a[d]=(a[d]||0)+c.total;return a;},{}); const l=Object.keys(s),d=Object.values(s); if(salesChart)salesChart.destroy(); salesChart=new Chart(salesChartCanvas,{type:'line',data:{labels:l,datasets:[{label:'Vendas/Dia (R$)',data:d,borderColor:'#4f46e5',backgroundColor:'rgba(79,70,229,0.1)',fill:true,tension:0.3}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true}}}});
    };

    const updateTopProductsChart = () => {
        const productSales = sales.reduce((acc, sale) => {
            acc[sale.productName] = (acc[sale.productName] || 0) + sale.total;
            return acc;
        }, {});

        const sortedProducts = Object.entries(productSales)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        const labels = sortedProducts.map(([name]) => name);
        const data = sortedProducts.map(([, total]) => total);

        if (topProductsChart) topProductsChart.destroy();

        topProductsChart = new Chart(topProductsCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Top 5 Produtos (R$)',
                    data: data,
                    backgroundColor: [
                        'rgba(79, 70, 229, 0.8)',
                        'rgba(79, 70, 229, 0.7)',
                        'rgba(79, 70, 229, 0.6)',
                        'rgba(79, 70, 229, 0.5)',
                        'rgba(79, 70, 229, 0.4)'
                    ],
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    };
    
    // --- EVENT LISTENERS ---
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('show');
    });

    navLinks.forEach(link=>{
        link.addEventListener('click',e=>{
            if (sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
            }
            e.preventDefault();
            const t=link.getAttribute('href').substring(1);
            navLinks.forEach(l=>l.classList.remove('active'));
            link.classList.add('active');
            contentSections.forEach(s=>{if(s.id===t)s.classList.remove('hidden');else s.classList.add('hidden');});
        });
    });

    addProductForm.addEventListener('submit',async e=>{e.preventDefault();const p={name:productNameInput.value,stock:parseInt(productStockInput.value),price:parseFloat(productPriceInput.value)};if(!p.name||isNaN(p.stock)||isNaN(p.price)){return alert("Preencha corretamente.");}try{await addDoc(collection(db,"products"),p);addProductForm.reset();fetchDataAndRender();alert("Produto adicionado!");}catch(r){console.error("Erro: ",r);}});
    productTableBody.addEventListener('click',async e=>{if(e.target.closest('.delete-btn')){const t=e.target.closest('.delete-btn'),n=t.dataset.id;if(confirm('Excluir este produto?')){try{await deleteDoc(doc(db,"products",n));fetchDataAndRender();alert('Excluído!');}catch(r){console.error("Erro: ",r);}}}});
    addSaleForm.addEventListener('submit',async e=>{e.preventDefault();const t=saleProductSelect.value,n=parseInt(saleQuantityInput.value);if(!t||isNaN(n)||n<=0){return alert("Selecione produto e quantidade.");}const o=doc(db,"products",t);try{const c=await getDoc(o);if(!c.exists())return alert("Produto não encontrado!");const d=c.data().stock;if(d<n)return alert("Estoque insuficiente!");const i=d-n;await updateDoc(o,{stock:i});await addDoc(collection(db,"sales"),{productId:t,productName:c.data().name,quantity:n,price:c.data().price,total:c.data().price*n,date:serverTimestamp()});addSaleForm.reset();fetchDataAndRender();alert("Venda registrada!");}catch(r){console.error("Erro: ",r);}});
    addPurchaseForm.addEventListener('submit',async e=>{e.preventDefault();const t=purchaseProductSelect.value,n=parseInt(purchaseQuantityInput.value);if(!t||isNaN(n)||n<=0){return alert("Selecione produto e quantidade.");}const o=doc(db,"products",t);try{const c=await getDoc(o);if(!c.exists())return alert("Produto não encontrado!");const d=c.data().stock,i=d+n;await updateDoc(o,{stock:i});addPurchaseForm.reset();fetchDataAndRender();alert("Compra registrada!");}catch(r){console.error("Erro: ",r);}});
    productSearchInput.addEventListener('input', e=>renderProductTable(e.target.value));

    // --- INICIALIZAÇÃO ---
    fetchDataAndRender();
});

