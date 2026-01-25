// profile-manager.js
(function() {
'use strict';

// Usar API configurada em config.js
if (typeof window.API === 'undefined') {
    window.API = 'http://localhost:8080';
}
const API = window.API;

// Abrir modal de perfil
function openProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (!modal) {
        console.error('Modal de perfil não encontrado');
        return;
    }
    
    modal.style.display = 'flex';
    loadProfileData();
}

// Tornar global imediatamente
window.openProfileModal = openProfileModal;

// Fechar modal de perfil
function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Carregar dados do perfil
async function loadProfileData() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || !user) {
        showMessage('Erro: Usuário não autenticado', 'error');
        return;
    }
    
    try {
        // Preencher campos com dados do usuário
        document.getElementById('profile-name').value = user.userName || '';
        document.getElementById('profile-email').value = user.email || '';
        document.getElementById('profile-password').value = '';
        document.getElementById('profile-confirm-password').value = '';
        
        // Carregar foto de perfil se existir
        const profileImage = document.getElementById('profile-image-preview');
        if (user.profileImage) {
            profileImage.src = `${API}${user.profileImage.startsWith('/') ? user.profileImage : '/' + user.profileImage}`;
            profileImage.style.display = 'block';
        } else {
            // Mostrar iniciais
            const initials = getInitials(user.userName || '');
            profileImage.style.display = 'none';
            const initialsEl = document.getElementById('profile-initials');
            if (initialsEl) {
                initialsEl.textContent = initials;
                initialsEl.style.display = 'flex';
            }
        }
        
        // Salvar ID do usuário para atualização
        document.getElementById('profile-form').dataset.userId = user.id;
        
    } catch (error) {
        console.error('Erro ao carregar dados do perfil:', error);
        showMessage('Erro ao carregar dados do perfil', 'error');
    }
}

// Salvar alterações do perfil
async function saveProfile(event) {
    event.preventDefault();
    
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = document.getElementById('profile-form').dataset.userId || user.id;
    
    const formData = new FormData();
    formData.append('userName', document.getElementById('profile-name').value.trim());
    formData.append('email', document.getElementById('profile-email').value.trim());
    
    const password = document.getElementById('profile-password').value;
    const confirmPassword = document.getElementById('profile-confirm-password').value;
    
    if (password && password !== confirmPassword) {
        showMessage('As senhas não coincidem', 'error');
        return;
    }
    
    if (password) {
        formData.append('password', password);
    }
    
    // Adicionar foto se foi selecionada
    const photoInput = document.getElementById('profile-photo-input');
    if (photoInput && photoInput.files.length > 0) {
        formData.append('profileImage', photoInput.files[0]);
    }
    
    try {
        const response = await fetch(`${API}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Erro ao atualizar perfil');
        }
        
        const updatedUser = await response.json();
        
        // Atualizar localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Atualizar exibição no sidebar
        updateUserDisplay(updatedUser);
        
        showMessage('Perfil atualizado com sucesso!', 'success');
        
        // Limpar campos de senha
        document.getElementById('profile-password').value = '';
        document.getElementById('profile-confirm-password').value = '';
        
        // Fechar modal após 1 segundo
        setTimeout(() => {
            closeProfileModal();
        }, 1000);
        
    } catch (error) {
        console.error('Erro ao salvar perfil:', error);
        showMessage('Erro ao atualizar perfil: ' + error.message, 'error');
    }
}

// Atualizar exibição do usuário no sidebar
// Usa a função centralizada do user-display-manager.js se disponível
function updateUserDisplay(user) {
    // Se a função centralizada estiver disponível, usar ela
    if (typeof window.updateUserDisplay === 'function') {
        window.updateUserDisplay(user);
    } else {
        // Fallback para atualização local
        const userNameEl = document.getElementById('user-name');
        if (userNameEl && user.userName) {
            userNameEl.textContent = user.userName;
        }
        
        const userAvatarEl = document.getElementById('user-avatar');
        if (userAvatarEl) {
            if (user.profileImage && user.profileImage.trim() !== '') {
                const imageUrl = `${API}${user.profileImage.startsWith('/') ? user.profileImage : '/' + user.profileImage}`;
                userAvatarEl.innerHTML = `<img src="${imageUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.textContent='${getInitials(user.userName || '')}';">`;
            } else {
                const initials = getInitials(user.userName || '');
                userAvatarEl.textContent = initials;
            }
        }
    }
}

// Preview da foto selecionada
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showMessage('Por favor, selecione uma imagem válida', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
        showMessage('A imagem deve ter no máximo 5MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('profile-image-preview');
        const initials = document.getElementById('profile-initials');
        
        preview.src = e.target.result;
        preview.style.display = 'block';
        if (initials) {
            initials.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
}

// Remover foto
function removeProfilePhoto() {
    const photoInput = document.getElementById('profile-photo-input');
    const preview = document.getElementById('profile-image-preview');
    const initials = document.getElementById('profile-initials');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (photoInput) {
        photoInput.value = '';
    }
    
    if (preview) {
        preview.style.display = 'none';
    }
    
    if (initials) {
        const initialsText = getInitials(user.userName || '');
        initials.textContent = initialsText;
        initials.style.display = 'flex';
    }
}

// Funções auxiliares
function getInitials(name) {
    if (!name) return 'AL';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function showMessage(message, type = 'info') {
    // Criar ou atualizar container de mensagem
    let messageContainer = document.getElementById('profile-message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'profile-message-container';
        messageContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 400px;';
        document.body.appendChild(messageContainer);
    }
    
    const alertClass = type === 'error' ? 'alert-danger' : 
                      type === 'success' ? 'alert-success' : 'alert-info';
    
    messageContainer.innerHTML = `
        <div class="alert ${alertClass}" style="padding: 15px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            ${message}
        </div>
    `;
    
    setTimeout(() => {
        messageContainer.innerHTML = '';
    }, 5000);
}

// Exportar todas as funções para uso global
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;
window.saveProfile = saveProfile;
window.handlePhotoUpload = handlePhotoUpload;
window.removeProfilePhoto = removeProfilePhoto;

})(); // Fechar IIFE

