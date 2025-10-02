// Importa as funções do Firestore e Auth que vamos usar
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
    collection, getDocs, addDoc, deleteDoc, doc,
    getDoc, updateDoc, serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const auth = getAuth(window.firebaseApp);
const db = window.db;

onAuthStateChanged(auth, (user) => {
    if (user) iniciarAplicacao(user);
    else window.location.href = 'login.html';
});

async function iniciarAplicacao(user) {
    const utilizadorDocRef = doc(db, "utilizadores", user.uid);
    const utilizadorDocSnap = await getDoc(utilizadorDocRef);
    if (!utilizadorDocSnap.exists()) { alert("Erro de configuração da conta."); signOut(auth); return; }
    const empresaLogadaId = utilizadorDocSnap.data().empresaId;

    // --- ELEMENTOS DO DOM ---
    const navLinks=document.querySelectorAll('nav a'), contentSections=document.querySelectorAll('.content-section'), totalRevenueEl=document.getElementById('total-revenue'), totalExpensesEl=document.getElementById('total-expenses'), grossProfitEl=document.getElementById('gross-profit'), totalProductsEl=document.getElementById('total-products'), lowStockItemsEl=document.getElementById('low-stock-items'), salesChartCanvas=document.getElementById('salesChart'), topProductsCanvas=document.getElementById('topProductsChart'), filterButtons=document.querySelectorAll('.filter-btn'), addProductForm=document.getElementById('addProductForm'), productNameInput=document.getElementById('productName'), productStockInput=document.getElementById('productStock'), productPriceInput=document.getElementById('productPrice'), productTableBody=document.getElementById('productTableBody'), productSearchInput=document.getElementById('productSearch'), saleProductSelect=document.getElementById('saleProductSelect'), saleQuantityInput=document.getElementById('saleQuantity'), addSaleForm=document.getElementById('addSaleForm'), menuToggle=document.querySelector('.menu-toggle'), sidebar=document.querySelector('.sidebar'), addExpenseForm=document.getElementById('addExpenseForm'), expenseDescriptionInput=document.getElementById('expenseDescription'), expenseValueInput=document.getElementById('expenseValue'), expenseCategoryInput=document.getElementById('expenseCategory'), expensesTableBody=document.getElementById('expensesTableBody'), stockUpdateFields=document.getElementById('stockUpdateFields'), updateStockCheck=document.getElementById('updateStockCheck'), stockInputs=document.getElementById('stockInputs'), expenseProductSelect=document.getElementById('expenseProductSelect'), expenseQuantity=document.getElementById('expenseQuantity');

    document.getElementById('current-year').textContent = new Date().getFullYear();
    if (!document.getElementById('logoutBtn')) { const li = document.createElement('li'); li.innerHTML = `<a href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Sair</a>`; document.querySelector('.sidebar nav ul').appendChild(li); li.addEventListener('click', () => signOut(auth)); }

    let allProducts = [], allSales = [], allExpenses = [], salesChart, topProductsChart;

    async function fetchDataAndRender() {
        await Promise.all([fetchProducts(), fetchSales(), fetchExpenses()]);
        renderAll();
    }

    async function fetchProducts() { const q = query(collection(db, "products"), where("empresaId", "==", empresaLogadaId)); const snap = await getDocs(q); allProducts = []; snap.forEach(doc => allProducts.push({ id: doc.id, ...doc.data() })); }
    async function fetchSales() { const q = query(collection(db, "sales"), where("empresaId", "==", empresaLogadaId)); const snap = await getDocs(q); allSales = []; snap.forEach(doc => allSales.push({ id: doc.id, ...doc.data() })); }
    async function fetchExpenses() { const q = query(collection(db, "despesas"), where("empresaId", "==", empresaLogadaId)); const snap = await getDocs(q); allExpenses = []; snap.forEach(doc => allExpenses.push({ id: doc.id, ...doc.data() })); }

    function renderAll(period = 'all') { renderProductTable(); updateProductSelects(); renderExpensesTable(); updateDashboard(period); }
    const renderProductTable = (filter = '') => { const f = allProducts.filter(p=>p.name.toLowerCase().includes(filter.toLowerCase())); productTableBody.innerHTML = ''; if(f.length===0){productTableBody.innerHTML=`<tr><td colspan="4">Nenhum produto.</td></tr>`;return;} f.forEach(p=>{const r=document.createElement('tr');r.innerHTML=`<td>${p.name}</td><td style="color:${p.stock<=10?'#ef4444':'inherit'}">${p.stock}</td><td>R$ ${p.price.toFixed(2)}</td><td><button class="delete-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button></td>`;productTableBody.appendChild(r);}); };
    const renderExpensesTable = () => { expensesTableBody.innerHTML = ''; if(allExpenses.length===0){expensesTableBody.innerHTML=`<tr><td colspan="4">Nenhuma despesa.</td></tr>`;return;} const s = [...allExpenses].sort((a,b)=>b.date.seconds-a.date.seconds); s.forEach(ex=>{const r=document.createElement('tr'),d=new Date(ex.date.seconds*1000).toLocaleDateString('pt-BR');r.innerHTML=`<td>${ex.description}</td><td>R$ ${ex.value.toFixed(2)}</td><td>${ex.category}</td><td>${d}</td>`;expensesTableBody.appendChild(r);}); };
    const updateProductSelects = () => { const sels=[saleProductSelect,expenseProductSelect]; sels.forEach(s=>s.innerHTML='<option value="" disabled selected>Selecione</option>'); allProducts.forEach(p=>{const o=`<option value="${p.id}">${p.name} (Estoque: ${p.stock})</option>`;sels.forEach(s=>s.innerHTML+=o);}); };

    const updateDashboard = (period = 'all') => {
        const filteredSales = filterByPeriod(allSales, period);
        const filteredExpenses = filterByPeriod(allExpenses, period);
        const lowStockCount = allProducts.filter(p=>p.stock<=10).length; totalProductsEl.textContent=allProducts.length; lowStockItemsEl.textContent=lowStockCount;
        const totalRevenue = filteredSales.reduce((s,i)=>s+i.total,0);
        const totalExpenses = filteredExpenses.reduce((s,i)=>s+i.value,0);
        const grossProfit = totalRevenue - totalExpenses;
        totalRevenueEl.textContent=`R$ ${totalRevenue.toFixed(2)}`; totalExpensesEl.textContent=`R$ ${totalExpenses.toFixed(2)}`; grossProfitEl.textContent=`R$ ${grossProfit.toFixed(2)}`;
        updateSalesChart(filteredSales); updateTopProductsChart(filteredSales);
    };

    function filterByPeriod(data, period) { const n=new Date(), t=new Date(n.getFullYear(),n.getMonth(),n.getDate()); if(period==='today')return data.filter(i=>new Date(i.date.seconds*1000)>=t); if(period==='week'){const s=new Date(t);s.setDate(t.getDate()-t.getDay());return data.filter(i=>new Date(i.date.seconds*1000)>=s);} if(period==='month'){const m=new Date(n.getFullYear(),n.getMonth(),1);return data.filter(i=>new Date(i.date.seconds*1000)>=m);} return data; }
    const updateSalesChart = (d) => { const s=d.reduce((a,c)=>{const dt=new Date(c.date.seconds*1000).toLocaleDateString('pt-BR');a[dt]=(a[dt]||0)+c.total;return a;},{}); const l=Object.keys(s),v=Object.values(s);if(salesChart)salesChart.destroy();salesChart=new Chart(salesChartCanvas,{type:'line',data:{labels:l,datasets:[{label:'Vendas/Dia (R$)',data:v,borderColor:'#4f46e5',backgroundColor:'rgba(79,70,229,0.1)',fill:true,tension:.3}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:true}}}});};
    const updateTopProductsChart = (d) => { const p=d.reduce((a,s)=>{a[s.productName]=(a[s.productName]||0)+s.total;return a;},{}); const s=Object.entries(p).sort(([,a],[,b])=>b-a).slice(0,5); const l=s.map(([n])=>n),v=s.map(([,t])=>t);if(topProductsChart)topProductsChart.destroy();topProductsChart=new Chart(topProductsCanvas,{type:'bar',data:{labels:l,datasets:[{label:'Top 5 (R$)',data:v,backgroundColor:['#4f46e5a0','#4f46e590','#4f46e580','#4f46e570','#4f46e560']}]},options:{maintainAspectRatio:false,responsive:true,scales:{y:{beginAtZero:true}}}});};

    // --- EVENT LISTENERS ---
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('show'));
    filterButtons.forEach(b => b.addEventListener('click', () => { filterButtons.forEach(btn => btn.classList.remove('active')); b.classList.add('active'); updateDashboard(b.dataset.period); }));
    navLinks.forEach(l => { l.addEventListener('click', e => { if(sidebar.classList.contains('show'))sidebar.classList.remove('show'); e.preventDefault(); const t=l.getAttribute('href').substring(1); navLinks.forEach(i=>i.classList.remove('active'));l.classList.add('active'); contentSections.forEach(s=>{if(s.id===t)s.classList.remove('hidden');else s.classList.add('hidden');});});});
    addProductForm.addEventListener('submit',async e=>{e.preventDefault();const p={name:productNameInput.value,stock:parseInt(productStockInput.value),price:parseFloat(productPriceInput.value),empresaId: empresaLogadaId};if(!p.name||isNaN(p.stock)||isNaN(p.price)){return alert("Preencha.");}try{await addDoc(collection(db,"products"),p);addProductForm.reset();fetchDataAndRender();alert("Adicionado!");}catch(r){console.error(r);}});
    productTableBody.addEventListener('click',async e=>{if(e.target.closest('.delete-btn')){const t=e.target.closest('.delete-btn'),n=t.dataset.id;if(confirm('Excluir?')){try{await deleteDoc(doc(db,"products",n));fetchDataAndRender();alert('Excluído!');}catch(r){console.error(r);}}}});
    addSaleForm.addEventListener('submit',async e=>{e.preventDefault();const pId=saleProductSelect.value,q=parseInt(saleQuantityInput.value);if(!pId||isNaN(q)||q<=0){return alert("Selecione.");}const ref=doc(db,"products",pId);try{const s=await getDoc(ref);if(!s.exists()||s.data().empresaId!==empresaLogadaId)return alert("Não encontrado.");const cs=s.data().stock;if(cs<q)return alert(`Estoque insuficiente! Restam apenas ${cs} unidades deste produto.`);await updateDoc(ref,{stock:cs-q});await addDoc(collection(db,"sales"),{productId:pId,productName:s.data().name,quantity:q,price:s.data().price,total:s.data().price*q,date:serverTimestamp(),empresaId: empresaLogadaId});addSaleForm.reset();fetchDataAndRender();alert("Venda registrada!");}catch(r){console.error(r);}});
    productSearchInput.addEventListener('input', e=>renderProductTable(e.target.value));

    // LÓGICA DO FORMULÁRIO FINANCEIRO INTELIGENTE
    expenseCategoryInput.addEventListener('change', () => { stockUpdateFields.classList.toggle('hidden', expenseCategoryInput.value !== 'Fornecedores'); });
    updateStockCheck.addEventListener('change', () => { stockInputs.classList.toggle('hidden', !updateStockCheck.checked); });

    addExpenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const expense = { description: expenseDescriptionInput.value, value: parseFloat(expenseValueInput.value), category: expenseCategoryInput.value, date: serverTimestamp(), empresaId: empresaLogadaId };
        if (!expense.description || isNaN(expense.value) || !expense.category) return alert("Preencha todos os campos da despesa.");

        try {
            await addDoc(collection(db, "despesas"), expense);

            // Se for compra de fornecedor e a opção estiver marcada, atualiza o estoque
            if (expense.category === 'Fornecedores' && updateStockCheck.checked) {
                const prodId = expenseProductSelect.value;
                const quant = parseInt(expenseQuantity.value);
                if (prodId && !isNaN(quant) && quant > 0) {
                    const prodRef = doc(db, "products", prodId);
                    const prodSnap = await getDoc(prodRef);
                    if (prodSnap.exists() && prodSnap.data().empresaId === empresaLogadaId) {
                        const currentStock = prodSnap.data().stock;
                        await updateDoc(prodRef, { stock: currentStock + quant });
                    }
                } else {
                    alert("Aviso: Despesa registada, mas o estoque não foi atualizado por falta de dados do produto.");
                }
            }

            addExpenseForm.reset();
            stockUpdateFields.classList.add('hidden');
            stockInputs.classList.add('hidden');
            fetchDataAndRender();
            alert("Despesa adicionada com sucesso!");
        } catch (error) { console.error("Erro ao adicionar despesa:", error); alert("Erro ao salvar a despesa."); }
    });

    fetchDataAndRender();
}
