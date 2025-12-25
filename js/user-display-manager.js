// user-display-manager.js
// Gerenciador centralizado para atualizar nome e avatar do usuário em todas as páginas
(function() {
'use strict';

// Declarar API global apenas uma vez
if (typeof window.API === 'undefined') {
    window.API = 'http://localhost:8080';
}
// Usar window.API diretamente
const API = window.API;

// Função centralizada para atualizar exibição do usuário
function updateUserDisplay(user) {
    if (!user) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            user = JSON.parse(storedUser);
        } else {
            console.warn('⚠️ Nenhum usuário fornecido para atualização');
            return;
        }
    }
    
    console.log('🔄 Atualizando exibição do usuário:', user.userName);
    
    // Atualizar nome em todos os elementos possíveis
    const userNameElements = document.querySelectorAll('#user-name, .user-name');
    userNameElements.forEach(el => {
        if (user.userName) {
            el.textContent = user.userName;
            console.log('✅ Nome atualizado:', user.userName);
        }
    });
    
    // Atualizar avatar em todos os elementos possíveis
    const userAvatarElements = document.querySelectorAll('#user-avatar, .user-avatar');
    userAvatarElements.forEach(el => {
        if (user.profileImage && user.profileImage.trim() !== '') {
            // Se tiver foto, mostrar foto
            const imageUrl = `${API}${user.profileImage.startsWith('/') ? user.profileImage : '/' + user.profileImage}`;
            el.innerHTML = `<img src="${imageUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.textContent='${getInitials(user.userName || '')}';">`;
            console.log('✅ Avatar atualizado com foto:', imageUrl);
        } else {
            // Senão, mostrar iniciais
            const initials = getInitials(user.userName || '');
            el.textContent = initials;
            el.innerHTML = ''; // Limpar qualquer conteúdo anterior
            el.textContent = initials;
            console.log('✅ Avatar atualizado com iniciais:', initials);
        }
    });
    
    // Atualizar role se existir
    const userRoleElements = document.querySelectorAll('.user-role');
    if (userRoleElements.length > 0 && user.role) {
        const roleText = user.role === 'TEACHER' ? 'Professor' : 
                        user.role === 'STUDENT' ? 'Estudante' : 
                        user.role;
        userRoleElements.forEach(el => {
            el.textContent = roleText;
        });
    }
}

// Função auxiliar para obter iniciais
function getInitials(name) {
    if (!name) return 'AL';
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// Atualizar exibição do usuário quando a página carrega (apenas se não houver outro script gerenciando)
function initUserDisplay() {
    // Só inicializar se não houver outro script que já está gerenciando (como DashBoardManager)
    // Verificar se já existe um listener DOMContentLoaded que chama updateUserDisplay
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user) {
        console.log('🔄 Inicializando exibição do usuário:', user.userName);
        updateUserDisplay(user);
    }
}

// Atualizar quando o localStorage mudar (para sincronizar entre abas)
window.addEventListener('storage', function(e) {
    if (e.key === 'user') {
        const user = JSON.parse(e.newValue || 'null');
        if (user) {
            updateUserDisplay(user);
        }
    }
});

// Exportar funções para uso global
window.updateUserDisplay = updateUserDisplay;
window.getInitials = getInitials;
window.initUserDisplay = initUserDisplay;

})(); // Fechar IIFE

// NÃO fazer inicialização automática - deixar que cada página chame quando necessário
// Isso evita conflitos e garante que o carregamento dos dados não seja interrompido

