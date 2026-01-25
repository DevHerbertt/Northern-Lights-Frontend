// config.js - Configuração centralizada da API
// Detecta automaticamente se está em produção (Vercel) ou desenvolvimento (localhost)

(function() {
    'use strict';
    
    // Detectar se está em produção (Vercel) ou desenvolvimento
    const isProduction = window.location.hostname !== 'localhost' && 
                         window.location.hostname !== '127.0.0.1' &&
                         !window.location.hostname.startsWith('192.168.');
    
    // URL da API baseada no ambiente
    // Em produção, usa a URL do Render
    // Em desenvolvimento, usa localhost
    const API_BASE_URL = isProduction 
        ? (window.API_BASE_URL || 'https://northern-lights-api.onrender.com')
        : 'http://localhost:8080';
    
    // Expor globalmente
    window.API_BASE_URL = API_BASE_URL;
    window.API = API_BASE_URL; // Compatibilidade com código existente
    
    // Log para debug (apenas em desenvolvimento)
    if (!isProduction) {
        console.log('🔧 Ambiente: DESENVOLVIMENTO');
        console.log('🔗 API URL:', API_BASE_URL);
    } else {
        console.log('🚀 Ambiente: PRODUÇÃO');
        console.log('🔗 API URL:', API_BASE_URL);
    }
})();

