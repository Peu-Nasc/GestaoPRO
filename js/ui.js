// Este arquivo lida com a manipulação do DOM.
let salesChart, topProductsChart;

const elements = {
    // Adicione todos os elementos do DOM aqui para fácil acesso
    productTableBody: document.getElementById('productTableBody'),
    customerTableBody: document.getElementById('customerTableBody'),
    expensesTableBody: document.getElementById('expensesTableBody'),
    saleProductSelect: document.getElementById('saleProductSelect'),
    expenseProductSelect: document.getElementById('expenseProductSelect'),
    totalRevenueEl: document.getElementById('total-revenue'),
    totalExpensesEl: document.getElementById('total-expenses'),
    grossProfitEl: document.getElementById('gross-profit'),
    totalProductsEl: document.getElementById('total-products'),
    lowStockItemsEl: document.getElementById('low-stock-items'),
    salesChartCanvas: document.getElementById('salesChart'),
    topProductsCanvas: document.getElementById('topProductsChart'),
};

// --- Funções de Renderização ---

function renderTable(tbody, data, rowTemplate, emptyMessage) {
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">${emptyMessage}</td></tr>`;
        return;
    }
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = rowTemplate(item);
        tbody.appendChild(row);
    });
}

export const ui = {
    renderProductTable: (products, filter = '') => {
        const filtered = products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));
        const template = p => `
            <td>${p.name}</td>
            <td style="color:${p.stock <= 10 ? '#ef4444' : 'inherit'}">${p.stock}</td>
            <td>R$ ${p.price.toFixed(2)}</td>
            <td><button class="delete-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button></td>`;
        renderTable(elements.productTableBody, filtered, template, "Nenhum produto encontrado.");
    },

    renderCustomerTable: (customers, filter = '') => {
        const filtered = customers.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()));
        const template = c => `
            <td>${c.name}</td>
            <td>${c.email || 'N/A'}</td>
            <td>${c.phone || 'N/A'}</td>
            <td><button class="delete-btn" data-id="${c.id}"><i class="fas fa-trash"></i></button></td>`;
        renderTable(elements.customerTableBody, filtered, template, "Nenhum cliente encontrado.");
    },
    
    renderExpensesTable: (expenses) => {
        const sorted = [...expenses].sort((a, b) => b.date.seconds - a.date.seconds);
         const template = ex => {
            const date = new Date(ex.date.seconds * 1000).toLocaleDateString('pt-BR');
            return `
                <td>${ex.description}</td>
                <td>R$ ${ex.value.toFixed(2)}</td>
                <td>${ex.category}</td>
                <td>${date}</td>`;
        };
        renderTable(elements.expensesTableBody, sorted, template, "Nenhuma despesa registrada.");
    },

    updateProductSelects: (products) => {
        const selects = [elements.saleProductSelect, elements.expenseProductSelect];
        selects.forEach(s => s.innerHTML = '<option value="" disabled selected>Selecione</option>');
        products.forEach(p => {
            const option = `<option value="${p.id}">${p.name} (Estoque: ${p.stock})</option>`;
            selects.forEach(s => s.innerHTML += option);
        });
    },

    updateDashboard: (sales, expenses, products) => {
        const totalRevenue = sales.reduce((sum, item) => sum + item.total, 0);
        const totalExpenses = expenses.reduce((sum, item) => sum + item.value, 0);
        
        elements.totalRevenueEl.textContent = `R$ ${totalRevenue.toFixed(2)}`;
        elements.totalExpensesEl.textContent = `R$ ${totalExpenses.toFixed(2)}`;
        elements.grossProfitEl.textContent = `R$ ${(totalRevenue - totalExpenses).toFixed(2)}`;
        elements.totalProductsEl.textContent = products.length;
        elements.lowStockItemsEl.textContent = products.filter(p => p.stock <= 10).length;

        ui.updateSalesChart(sales);
        ui.updateTopProductsChart(sales);
    },

    updateSalesChart: (salesData) => {
        const salesByDay = salesData.reduce((acc, sale) => {
            const date = new Date(sale.date.seconds * 1000).toLocaleDateString('pt-BR');
            acc[date] = (acc[date] || 0) + sale.total;
            return acc;
        }, {});
        const labels = Object.keys(salesByDay);
        const data = Object.values(salesByDay);

        if (salesChart) salesChart.destroy();
        salesChart = new Chart(elements.salesChartCanvas, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Vendas/Dia (R$)', data, borderColor: '#4f46e5', fill: true }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    updateTopProductsChart: (salesData) => {
        const productsSold = salesData.reduce((acc, sale) => {
            acc[sale.productName] = (acc[sale.productName] || 0) + sale.total;
            return acc;
        }, {});
        const sortedProducts = Object.entries(productsSold).sort(([, a], [, b]) => b - a).slice(0, 5);
        const labels = sortedProducts.map(([name]) => name);
        const data = sortedProducts.map(([, total]) => total);

        if (topProductsChart) topProductsChart.destroy();
        topProductsChart = new Chart(elements.topProductsCanvas, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Top 5 (R$)', data, backgroundColor: '#4f46e5a0' }] },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    // Função para limpar formulários
    resetForm: (formId) => document.getElementById(formId).reset(),
};