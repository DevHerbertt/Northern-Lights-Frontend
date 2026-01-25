// common-profile-help.js
// Script comum para adicionar funcionalidade de perfil e ajuda em todas as páginas

document.addEventListener('DOMContentLoaded', function() {
    // Adicionar evento de clique no user-info se não tiver
    const userInfo = document.getElementById('user-profile-btn') || document.querySelector('.user-info');
    if (userInfo && !userInfo.onclick) {
        userInfo.style.cursor = 'pointer';
        userInfo.addEventListener('click', function() {
            if (typeof openProfileModal === 'function') {
                openProfileModal();
            }
        });
    }
    
    // Carregar modais se não estiverem carregados
    if (!document.getElementById('profile-modal')) {
        const profileContainer = document.createElement('div');
        profileContainer.id = 'profile-modal-container';
        document.body.appendChild(profileContainer);
        
        // Usar caminho absoluto
        const modalPath = '/components/profile-modal.html';
        
        fetch(modalPath)
            .then(response => {
                if (!response.ok) throw new Error('Not found');
                return response.text();
            })
            .then(html => {
                profileContainer.innerHTML = html;
            })
            .catch(err => {
                console.warn('Modal de perfil não encontrado em:', modalPath);
            });
    }
    
    if (!document.getElementById('help-modal')) {
        const helpContainer = document.createElement('div');
        helpContainer.id = 'help-modal-container';
        document.body.appendChild(helpContainer);
        
        // Usar caminho absoluto
        const modalPath = '/components/help-modal.html';
        
        fetch(modalPath)
            .then(response => {
                if (!response.ok) throw new Error('Not found');
                return response.text();
            })
            .then(html => {
                helpContainer.innerHTML = html;
            })
            .catch(err => {
                console.warn('Modal de ajuda não encontrado em:', modalPath);
            });
    }
});

