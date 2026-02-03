// recorded-classes-manager.js
(function() {
'use strict';

// Usar API configurada em config.js
if (typeof window.API === 'undefined') {
    window.API = "http://localhost:8080";
}
const API = window.API;

// Função para gerar gradiente variado baseado no ID
function generateGradient(id) {
    // Paleta de gradientes bonitos e variados
    const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
        'linear-gradient(135deg, #c471ed 0%, #f64f59 100%)',
        'linear-gradient(135deg, #12c2e9 0%, #c471ed 50%, #f64f59 100%)',
        'linear-gradient(135deg, #fad961 0%, #f76b1c 100%)',
        'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
        'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
        'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)'
    ];
    
    // Usar o ID para selecionar um gradiente de forma consistente
    const index = id % gradients.length;
    return gradients[index];
}

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
            let isYouTube = false;
            if (recordedClass.videoUrl.includes('youtube.com/watch?v=')) {
                const videoId = recordedClass.videoUrl.split('v=')[1]?.split('&')[0];
                if (videoId) {
                    videoEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
                    isYouTube = true;
                }
            } else if (recordedClass.videoUrl.includes('youtu.be/')) {
                const videoId = recordedClass.videoUrl.split('youtu.be/')[1]?.split('?')[0];
                if (videoId) {
                    videoEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
                    isYouTube = true;
                }
            }
            
            // Gerar gradiente único para esta aula
            const thumbnailGradient = generateGradient(recordedClass.id);
            
            // Formatar data para exibição no thumbnail
            const dateParts = formattedDate.split('/');
            const day = dateParts[0];
            const month = dateParts[1];
            const year = dateParts[2];
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const monthName = monthNames[parseInt(month) - 1];
            
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
                    
                    <div style="margin: 15px 0; border-radius: 8px; overflow: hidden; background: #000; aspect-ratio: 16/9; position: relative; cursor: ${isYouTube ? 'default' : 'pointer'};" ${!isYouTube ? `onclick="window.open('${escapeHtml(recordedClass.videoUrl)}', '_blank')"` : ''}>
                        ${isYouTube ? `
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
                            <!-- Thumbnail com gradiente e data - Design Premium -->
                            <div style="width: 100%; height: 100%; background: ${thumbnailGradient}; position: relative; display: flex; align-items: center; justify-content: center; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); overflow: hidden;" onmouseover="this.style.transform='scale(1.03)'; this.style.filter='brightness(1.1)'" onmouseout="this.style.transform='scale(1)'; this.style.filter='brightness(1)'">
                                <!-- Padrão de pontos decorativo -->
                                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px); background-size: 30px 30px; opacity: 0.3;"></div>
                                
                                <!-- Overlay com gradiente radial para profundidade -->
                                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.3) 100%);"></div>
                                
                                <!-- Brilho sutil no canto -->
                                <div style="position: absolute; top: -50%; right: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%); opacity: 0.6;"></div>
                                
                                <!-- Data de criação no centro - Design Premium -->
                                <div style="position: relative; z-index: 1; text-align: center; color: white; padding: 20px;">
                                    <!-- Dia em destaque -->
                                    <div style="font-size: 5rem; font-weight: 800; line-height: 1; margin-bottom: 4px; text-shadow: 0 4px 25px rgba(0, 0, 0, 0.6), 0 2px 10px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 255, 255, 0.2); letter-spacing: -2px; color: #ffffff;">${day}</div>
                                    
                                    <!-- Mês e ano elegantes -->
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 8px;">
                                        <div style="font-size: 1.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 15px rgba(0, 0, 0, 0.6), 0 1px 6px rgba(0, 0, 0, 0.5); color: #ffffff;">${monthName}</div>
                                        <div style="width: 4px; height: 4px; background: rgba(255, 255, 255, 0.8); border-radius: 50%; box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);"></div>
                                        <div style="font-size: 1.4rem; font-weight: 600; text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6), 0 1px 5px rgba(0, 0, 0, 0.5); color: #ffffff;">${year}</div>
                                    </div>
                                </div>
                                
                                <!-- Ícone de play premium no canto -->
                                <div style="position: absolute; bottom: 24px; right: 24px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%); backdrop-filter: blur(10px); border-radius: 50%; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.5); z-index: 2; transition: all 0.3s ease; border: 2px solid rgba(255, 255, 255, 0.3);" onmouseover="this.style.transform='scale(1.15)'; this.style.boxShadow='0 12px 35px rgba(0, 0, 0, 0.5), 0 6px 18px rgba(0, 0, 0, 0.4)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 8px 25px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)'">
                                    <i class="fas fa-play" style="color: #1f2937; font-size: 1.8rem; margin-left: 5px; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));"></i>
                                </div>
                                
                                <!-- Badge Google Meet premium no canto superior -->
                                <div style="position: absolute; top: 20px; left: 20px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.92) 100%); backdrop-filter: blur(12px); border-radius: 12px; padding: 10px 16px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6); z-index: 2; border: 1px solid rgba(255, 255, 255, 0.4); transition: all 0.3s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 25px rgba(0, 0, 0, 0.4), 0 3px 12px rgba(0, 0, 0, 0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 20px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'">
                                    <i class="fab fa-google" style="color: #4285f4; font-size: 1.3rem; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));"></i>
                                    <span style="color: #1f2937; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.5px; text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);">Meet</span>
                                </div>
                                
                                <!-- Borda brilhante sutil -->
                                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 1px solid rgba(255, 255, 255, 0.15); pointer-events: none; border-radius: inherit;"></div>
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






