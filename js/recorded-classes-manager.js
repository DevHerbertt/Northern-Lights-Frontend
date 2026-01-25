// recorded-classes-manager.js
(function() {
'use strict';

// Declarar API global apenas uma vez
if (typeof window.API === 'undefined') {
    window.API = "http://localhost:8080";
}
const API = window.API;

// Função para alternar entre tabs
function switchClassroomTab(tabName) {
    // Esconder todos os tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    
    // Remover active de todos os botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar tab selecionado
    const selectedTab = document.getElementById(`${tabName === 'live' ? 'live-classes' : 'recorded-classes'}-tab`);
    const selectedBtn = document.getElementById(`${tabName === 'live' ? 'live-classes' : 'recorded-classes'}-tab-btn`);
    
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.style.display = 'block';
    }
    
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Carregar dados se necessário
    if (tabName === 'recorded') {
        loadRecordedClasses();
    }
}

// Carregar aulas gravadas
async function loadRecordedClasses() {
    const token = localStorage.getItem('token');
    const grid = document.getElementById('recorded-classes-grid');
    
    if (!grid) return;
    
    if (!token) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Erro</h3><p>Usuário não autenticado</p></div>';
        return;
    }
    
    try {
        grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando aulas gravadas...</span></div>';
        
        const response = await fetch(`${API}/recorded-classes/teacher`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar aulas gravadas');
        }
        
        const classes = await response.json();
        
        if (classes.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-film" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;"></i>
                    <h3>Nenhuma aula gravada ainda</h3>
                    <p>Adicione sua primeira aula gravada clicando no botão acima</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = classes.map(recordedClass => {
            const classDate = new Date(recordedClass.classDate);
            const formattedDate = classDate.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            // Extrair ID do vídeo do YouTube se for URL do YouTube
            let videoEmbedUrl = recordedClass.videoUrl;
            if (recordedClass.videoUrl.includes('youtube.com/watch?v=')) {
                const videoId = recordedClass.videoUrl.split('v=')[1]?.split('&')[0];
                if (videoId) {
                    videoEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
                }
            } else if (recordedClass.videoUrl.includes('youtu.be/')) {
                const videoId = recordedClass.videoUrl.split('youtu.be/')[1]?.split('?')[0];
                if (videoId) {
                    videoEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
                }
            }
            
            return `
                <div class="recorded-class-card" style="background: rgba(15, 23, 42, 0.8); border-radius: 12px; padding: 20px; border: 2px solid rgba(255, 255, 255, 0.1); transition: all 0.3s ease;">
                    <div style="margin-bottom: 15px;">
                        <h3 style="color: #f8fafc; margin: 0 0 10px 0; font-size: 1.2rem;">${escapeHtml(recordedClass.title)}</h3>
                        <p style="color: #94a3b8; margin: 0; font-size: 0.9rem;">
                            <i class="fas fa-calendar"></i> ${formattedDate}
                        </p>
                    </div>
                    
                    ${recordedClass.description ? `
                        <p style="color: #cbd5e1; margin: 15px 0; line-height: 1.6;">${escapeHtml(recordedClass.description)}</p>
                    ` : ''}
                    
                    <div style="margin: 15px 0; border-radius: 8px; overflow: hidden; background: #000; aspect-ratio: 16/9;">
                        ${videoEmbedUrl.includes('youtube.com/embed') || videoEmbedUrl.includes('youtu.be') ? `
                            <iframe 
                                width="100%" 
                                height="100%" 
                                src="${videoEmbedUrl}" 
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen
                                style="border: none;"
                            ></iframe>
                        ` : `
                            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #94a3b8;">
                                <a href="${escapeHtml(recordedClass.videoUrl)}" target="_blank" style="color: #3b82f6; text-decoration: none; font-weight: 600;">
                                    <i class="fas fa-external-link-alt"></i> Abrir vídeo
                                </a>
                            </div>
                        `}
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button 
                            onclick="editRecordedClass(${recordedClass.id})" 
                            class="btn btn-secondary" 
                            style="flex: 1; padding: 10px; font-size: 0.9rem;"
                        >
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button 
                            onclick="deleteRecordedClass(${recordedClass.id})" 
                            class="btn btn-danger" 
                            style="flex: 1; padding: 10px; font-size: 0.9rem;"
                        >
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erro ao carregar aulas gravadas:', error);
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar aulas gravadas</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Mostrar modal para adicionar aula gravada
function showAddRecordedClassModal() {
    showRecordedClassModal(null);
}

// Mostrar modal para editar aula gravada
function editRecordedClass(id) {
    showRecordedClassModal(id);
}

// Mostrar modal de aula gravada
async function showRecordedClassModal(id) {
    const modal = document.createElement('div');
    modal.id = 'recorded-class-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); z-index: 10000; display: flex; align-items: center; justify-content: center;';
    
    let title = 'Adicionar Aula Gravada';
    let recordedClass = null;
    
    if (id) {
        title = 'Editar Aula Gravada';
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API}/recorded-classes/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                recordedClass = await response.json();
            }
        } catch (error) {
            console.error('Erro ao carregar aula gravada:', error);
        }
    }
    
    const classDate = recordedClass ? new Date(recordedClass.classDate).toISOString().split('T')[0] : '';
    
    modal.innerHTML = `
        <div style="background: rgba(30, 41, 59, 0.95); border-radius: 16px; padding: 30px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; border: 2px solid rgba(59, 130, 246, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f8fafc; margin: 0;">
                    <i class="fas fa-film"></i> ${title}
                </h2>
                <button onclick="closeRecordedClassModal()" style="background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; padding: 5px 10px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <form id="recorded-class-form">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #f8fafc; font-weight: 600; margin-bottom: 8px;">
                        Título *:
                    </label>
                    <input 
                        type="text" 
                        id="recorded-class-title" 
                        value="${recordedClass ? escapeHtml(recordedClass.title) : ''}"
                        placeholder="Ex: Aula de Inglês - Present Perfect"
                        required
                        style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(15, 23, 42, 0.8); color: #f8fafc; font-size: 1rem; box-sizing: border-box;"
                    >
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #f8fafc; font-weight: 600; margin-bottom: 8px;">
                        Descrição:
                    </label>
                    <textarea 
                        id="recorded-class-description" 
                        placeholder="Descreva o conteúdo da aula..."
                        rows="4"
                        style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(15, 23, 42, 0.8); color: #f8fafc; font-size: 1rem; resize: vertical; font-family: inherit; box-sizing: border-box;"
                    >${recordedClass ? escapeHtml(recordedClass.description || '') : ''}</textarea>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #f8fafc; font-weight: 600; margin-bottom: 8px;">
                        URL do Vídeo *:
                    </label>
                    <input 
                        type="url" 
                        id="recorded-class-video-url" 
                        value="${recordedClass ? escapeHtml(recordedClass.videoUrl) : ''}"
                        placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                        required
                        style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(15, 23, 42, 0.8); color: #f8fafc; font-size: 1rem; box-sizing: border-box;"
                    >
                    <p style="margin-top: 8px; font-size: 0.85rem; color: rgba(255, 255, 255, 0.6);">
                        <i class="fas fa-info-circle"></i> Suporta links do YouTube, Vimeo ou outros serviços de vídeo
                    </p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: #f8fafc; font-weight: 600; margin-bottom: 8px;">
                        Data da Aula *:
                    </label>
                    <input 
                        type="date" 
                        id="recorded-class-date" 
                        value="${classDate}"
                        required
                        style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(15, 23, 42, 0.8); color: #f8fafc; font-size: 1rem; box-sizing: border-box;"
                    >
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 30px;">
                    <button type="button" onclick="closeRecordedClassModal()" class="btn btn-secondary">
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> ${id ? 'Atualizar' : 'Salvar'}
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Adicionar event listener ao formulário
    const form = document.getElementById('recorded-class-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveRecordedClass(id);
    });
}

// Fechar modal
function closeRecordedClassModal() {
    const modal = document.getElementById('recorded-class-modal');
    if (modal) {
        modal.remove();
    }
}

// Salvar aula gravada
async function saveRecordedClass(id) {
    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Erro: Usuário não autenticado.', 'error');
        return;
    }
    
    const title = document.getElementById('recorded-class-title').value.trim();
    const description = document.getElementById('recorded-class-description').value.trim();
    const videoUrl = document.getElementById('recorded-class-video-url').value.trim();
    const classDate = document.getElementById('recorded-class-date').value;
    
    if (!title || !videoUrl || !classDate) {
        showMessage('Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }
    
    try {
        const payload = {
            title: title,
            description: description || null,
            videoUrl: videoUrl,
            classDate: classDate
        };
        
        const url = id ? `${API}/recorded-classes/${id}` : `${API}/recorded-classes`;
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Erro ao salvar aula gravada');
        }
        
        showMessage(`Aula gravada ${id ? 'atualizada' : 'criada'} com sucesso!`, 'success');
        closeRecordedClassModal();
        await loadRecordedClasses();
        
    } catch (error) {
        console.error('Erro ao salvar aula gravada:', error);
        showMessage('Erro ao salvar aula gravada: ' + error.message, 'error');
    }
}

// Excluir aula gravada
async function deleteRecordedClass(id) {
    if (!confirm('Tem certeza que deseja excluir esta aula gravada?')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Erro: Usuário não autenticado.', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API}/recorded-classes/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Erro ao excluir aula gravada');
        }
        
        showMessage('Aula gravada excluída com sucesso!', 'success');
        await loadRecordedClasses();
        
    } catch (error) {
        console.error('Erro ao excluir aula gravada:', error);
        showMessage('Erro ao excluir aula gravada: ' + error.message, 'error');
    }
}

// Função auxiliar para escapar HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Função para mostrar mensagens
function showMessage(message, type = 'info') {
    const container = document.getElementById('message-container');
    if (!container) return;
    
    const alertClass = type === 'success' ? 'alert-success' : type === 'error' ? 'alert-error' : 'alert-info';
    
    container.innerHTML = `
        <div class="alert ${alertClass}" style="margin: 20px 0;">
            ${message}
        </div>
    `;
    
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// Expor funções globalmente
window.switchClassroomTab = switchClassroomTab;
window.loadRecordedClasses = loadRecordedClasses;
window.showAddRecordedClassModal = showAddRecordedClassModal;
window.editRecordedClass = editRecordedClass;
window.deleteRecordedClass = deleteRecordedClass;
window.closeRecordedClassModal = closeRecordedClassModal;

})();






