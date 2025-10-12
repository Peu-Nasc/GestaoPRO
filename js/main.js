import { checkAuthState, handleLogout } from './auth.js';
import { api } from './services.js';
import { ui } from './ui.js';

// --- Estado da Aplicação ---
let state = {
    products: [],
    sales: [],
    expenses: [],
    customers: [],
    empresaId: null,
};

// --- Início da Aplicação ---
checkAuthState(async (user) => {
    try {
        const userProfileSnap = await api.getUserProfile(user.uid); 
        if (userProfileSnap.exists()) {
            state.empresaId = userProfileSnap.data().empresaId;
        } else {
            alert("Erro de configuração da conta. Perfil de utilizador não encontrado.");
            handleLogout();
            return;
        }
    } catch (error) {
        console.error("Erro ao buscar perfil do usuário:", error);
        alert("Não foi possível carregar os dados da sua empresa. Verifique sua configuração.");
        return;
    }
    
    await fetchDataAndRender();
    setupEventListeners();
});


// --- Lógica Principal ---
async function fetchDataAndRender(period = 'all') {
    if (!state.empresaId) return;

    [state.products, state.sales, state.expenses, state.customers] = await Promise.all([
        api.fetchProducts(state.empresaId),
        api.fetchSales(state.empresaId),
        api.fetchExpenses(state.empresaId),
        api.fetchCustomers(state.empresaId),
    ]);

    renderAll(period);
}

function renderAll(period = 'all') {
    const filteredSales = filterByPeriod(state.sales, period);
    const filteredExpenses = filterByPeriod(state.expenses, period);

    ui.renderProductTable(state.products);
    ui.renderCustomerTable(state.customers);
    ui.renderExpensesTable(state.expenses);
    ui.updateProductSelects(state.products);
    ui.updateDashboard(filteredSales, filteredExpenses, state.products);
}

function filterByPeriod(data, period) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'today') return data.filter(i => new Date(i.date.seconds * 1000) >= today);
    if (period === 'week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return data.filter(i => new Date(i.date.seconds * 1000) >= startOfWeek);
    }
    if (period === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return data.filter(i => new Date(i.date.seconds * 1000) >= startOfMonth);
    }
    return data;
}

// --- Configuração dos Event Listeners ---
function setupEventListeners() {
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
            document.getElementById(targetId).classList.remove('hidden');
            document.querySelectorAll('nav a').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
             if (document.querySelector('.sidebar').classList.contains('show')) {
                document.querySelector('.sidebar').classList.remove('show');
            }
        });
    });

    if (!document.getElementById('logoutBtn')) {
        const logoutBtn = document.createElement('li');
        logoutBtn.innerHTML = `<a href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Sair</a>`;
        document.querySelector('.sidebar nav ul').appendChild(logoutBtn);
        logoutBtn.addEventListener('click', handleLogout);
    }

    document.querySelector('.menu-toggle').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('show');
    });

    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            renderAll(e.target.dataset.period);
        });
    });
    
    document.getElementById('addProductForm').addEventListener('submit', handleAddProduct);
    document.getElementById('addCustomerForm').addEventListener('submit', handleAddCustomer);
    document.getElementById('addSaleForm').addEventListener('submit', handleAddSale);
    document.getElementById('addExpenseForm').addEventListener('submit', handleAddExpense);

    document.getElementById('productSearch').addEventListener('input', e => ui.renderProductTable(state.products, e.target.value));
    document.getElementById('customerSearch').addEventListener('input', e => ui.renderCustomerTable(state.customers, e.target.value));
    
    document.getElementById('productTableBody').addEventListener('click', e => handleDelete(e, 'product'));
    document.getElementById('customerTableBody').addEventListener('click', e => handleDelete(e, 'customer'));

    const expenseCategoryInput = document.getElementById('expenseCategory');
    const updateStockCheck = document.getElementById('updateStockCheck');

    expenseCategoryInput.addEventListener('change', () => {
        document.getElementById('stockUpdateFields').classList.toggle('hidden', expenseCategoryInput.value !== 'Fornecedores');
    });
    updateStockCheck.addEventListener('change', () => {
        document.getElementById('stockInputs').classList.toggle('hidden', !updateStockCheck.checked);
    });
}

// --- Handlers ---
async function handleAddProduct(e) {
    e.preventDefault();
    const form = e.target;
    const product = {
        name: form.productName.value,
        stock: parseInt(form.productStock.value),
        price: parseFloat(form.productPrice.value),
        empresaId: state.empresaId,
    };
    if (!product.name || isNaN(product.stock) || isNaN(product.price)) return alert("Preencha todos os campos.");
    
    try {
        await api.addProduct(product);
        alert("Produto adicionado!");
        ui.resetForm('addProductForm');
        fetchDataAndRender();
    } catch (error) {
        console.error("Erro ao adicionar produto:", error);
        alert("Não foi possível adicionar o produto.");
    }
}

async function handleAddCustomer(e) {
    e.preventDefault();
    const form = e.target;
    const customer = {
        name: form.customerName.value,
        email: form.customerEmail.value,
        phone: form.customerPhone.value,
        empresaId: state.empresaId,
    };
     if (!customer.name) return alert("O nome do cliente é obrigatório.");

    try {
        await api.addCustomer(customer);
        alert("Cliente adicionado!");
        ui.resetForm('addCustomerForm');
        fetchDataAndRender();
    } catch (error) {
        console.error("Erro ao adicionar cliente:", error);
        alert("Não foi possível adicionar o cliente.");
    }
}


async function handleAddSale(e) {
    e.preventDefault();
    const form = e.target;
    const productId = form.saleProductSelect.value;
    const quantity = parseInt(form.saleQuantity.value);

    if (!productId || isNaN(quantity) || quantity <= 0) return alert("Selecione um produto e uma quantidade válida.");

    try {
        const productDoc = await api.getProduct(productId);
        if (!productDoc.exists()) return alert("Produto não encontrado.");

        const product = productDoc.data();
        if (product.stock < quantity) return alert(`Estoque insuficiente! Restam ${product.stock} unidades.`);

        await api.updateProductStock(productId, product.stock - quantity);
        await api.addSale({
            productId,
            productName: product.name,
            quantity,
            price: product.price,
            total: product.price * quantity,
            date: api.serverTimestamp(),
            empresaId: state.empresaId,
        });
        
        alert("Venda registrada com sucesso!");
        ui.resetForm('addSaleForm');
        fetchDataAndRender();
    } catch (error) {
        console.error("Erro ao registrar venda:", error);
        alert("Não foi possível registrar a venda.");
    }
}

async function handleAddExpense(e) {
    e.preventDefault();
    const form = e.target;
    const expense = {
        description: form.expenseDescription.value,
        value: parseFloat(form.expenseValue.value),
        category: form.expenseCategory.value,
        date: api.serverTimestamp(),
        empresaId: state.empresaId,
    };

    if (!expense.description || isNaN(expense.value) || !expense.category) {
        return alert("Preencha todos os campos da despesa.");
    }

    try {
        await api.addExpense(expense);

        if (expense.category === 'Fornecedores' && form.updateStockCheck.checked) {
            const prodId = form.expenseProductSelect.value;
            const quant = parseInt(form.expenseQuantity.value);

            if (prodId && !isNaN(quant) && quant > 0) {
                const prodDoc = await api.getProduct(prodId);
                if (prodDoc.exists()) {
                    const currentStock = prodDoc.data().stock;
                    await api.updateProductStock(prodId, currentStock + quant);
                }
            } else {
                alert("Aviso: Despesa registrada, mas o estoque não foi atualizado por falta de dados do produto.");
            }
        }

        alert("Despesa adicionada com sucesso!");
        ui.resetForm('addExpenseForm');
        document.getElementById('stockUpdateFields').classList.add('hidden');
        document.getElementById('stockInputs').classList.add('hidden');
        fetchDataAndRender();
    } catch (error) {
        console.error("Erro ao adicionar despesa:", error);
        alert("Erro ao salvar a despesa.");
    }
}


// --- FUNÇÃO CORRIGIDA PARA PORTUGUÊS ---
async function handleDelete(e, type) {
    const deleteBtn = e.target.closest('.delete-btn');
    if (!deleteBtn) return;

    // AQUI ESTÁ A CORREÇÃO:
    // Mapeamos o 'type' em inglês para a sua versão em português.
    const typeTranslations = {
        product: 'produto',
        customer: 'cliente'
    };
    const translatedType = typeTranslations[type] || type; // Usa a tradução ou o original se não encontrar

    const id = deleteBtn.dataset.id;
    // Usamos a variável 'translatedType' nas mensagens para o usuário.
    if (confirm(`Tem certeza que deseja excluir este ${translatedType}?`)) {
        try {
            if (type === 'product') await api.deleteProduct(id);
            if (type === 'customer') await api.deleteCustomer(id);
            
            // Usamos a versão com a primeira letra maiúscula no alerta de sucesso.
            const capitalizedType = translatedType.charAt(0).toUpperCase() + translatedType.slice(1);
            alert(`${capitalizedType} excluído com sucesso!`);
            fetchDataAndRender();
        } catch (error) {
             console.error(`Erro ao excluir ${type}:`, error);
             alert(`Não foi possível excluir o ${translatedType}.`);
        }
    }
}