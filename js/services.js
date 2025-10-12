import { db } from './firebase-config.js';
import {
    collection, getDocs, addDoc, deleteDoc, doc,
    getDoc, updateDoc, serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// Função genérica para buscar dados de uma coleção
async function fetchData(collectionName, empresaId) {
    const q = query(collection(db, collectionName), where("empresaId", "==", empresaId));
    const snapshot = await getDocs(q);
    const data = [];
    snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
    return data;
}

// Função genérica para adicionar um documento
async function addData(collectionName, data) {
    return await addDoc(collection(db, collectionName), data);
}

// Função genérica para deletar um documento
async function deleteData(collectionName, id) {
    return await deleteDoc(doc(db, collectionName, id));
}

// Funções específicas
async function getProduct(id) {
    const docRef = doc(db, "products", id);
    return await getDoc(docRef);
}

async function updateProductStock(id, newStock) {
    const docRef = doc(db, "products", id);
    return await updateDoc(docRef, { stock: newStock });
}

async function getUserProfile(uid) {
    const docRef = doc(db, "utilizadores", uid);
    return await getDoc(docRef);
}


export const api = {
    fetchProducts: (empresaId) => fetchData('products', empresaId),
    fetchSales: (empresaId) => fetchData('sales', empresaId),
    fetchExpenses: (empresaId) => fetchData('despesas', empresaId),
    // --- CORREÇÕES ABAIXO ---
    fetchCustomers: (empresaId) => fetchData('clientes', empresaId), // ALTERADO
    addProduct: (productData) => addData('products', productData),
    addSale: (saleData) => addData('sales', saleData),
    addExpense: (expenseData) => addData('despesas', expenseData),
    addCustomer: (customerData) => addData('clientes', customerData), // ALTERADO
    deleteProduct: (id) => deleteData('products', id),
    deleteCustomer: (id) => deleteData('clientes', id), // ALTERADO
    getProduct,
    updateProductStock,
    getUserProfile,
    serverTimestamp
};