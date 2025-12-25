// student-classrooms-manager.js
(function() {
'use strict';

// Declarar API global apenas uma vez
if (typeof window.API === 'undefined') {
    window.API = "http://localhost:8080";
}
// Usar window.API diretamente através de uma função para evitar conflito de escopo
const API = (function() { return window.API; })();

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', async () => {
    await loadClassrooms();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    const refreshBtn = document.getElementById('refresh-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const activeTab = document.querySelector('.tab-content.active');
            if (activeTab && activeTab.id === 'recorded-classes-tab') {
                await loadStudentRecordedClasses();
            } else {
                await loadClassrooms();
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            authService.logout();
            window.location.href = '/page/login.html';
        });
    }
}

// Carregar salas de aula
async function loadClassrooms() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const classroomsGrid = document.getElementById('classrooms-grid');

    // Atualizar nome e avatar do usuário usando função centralizada
    if (typeof window.updateUserDisplay === 'function') {
        window.updateUserDisplay(user);
    } else if (user.userName) {
        // Fallback
        const userNameEl = document.getElementById('user-name');
        const userAvatarEl = document.getElementById('user-avatar');
        if (userNameEl) userNameEl.textContent = user.userName;
        if (userAvatarEl) {
            if (user.profileImage && user.profileImage.trim() !== '') {
                const imageUrl = `${API}${user.profileImage.startsWith('/') ? user.profileImage : '/' + user.profileImage}`;
                userAvatarEl.innerHTML = `<img src="${imageUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.textContent='${getInitials(user.userName)}';">`;
            } else {
                userAvatarEl.textContent = getInitials(user.userName);
            }
        }
    }

    try {
        classroomsGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

        const response = await fetch(`${API}/meets`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const meets = await response.json();

        if (meets.length === 0) {
            classroomsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-inbox"></i>
                    <h3>Nenhuma sala de aula disponível</h3>
                    <p>Aguarde o professor criar salas de aula</p>
                </div>
            `;
            return;
        }

        // Ordenar: em andamento primeiro, depois agendadas, depois finalizadas
        meets.sort((a, b) => {
            const now = new Date();
            const aStart = new Date(a.startDate);
            const aEnd = new Date(a.endDate);
            const bStart = new Date(b.startDate);
            const bEnd = new Date(b.endDate);

            const aOngoing = aStart <= now && aEnd >= now;
            const bOngoing = bStart <= now && bEnd >= now;
            const aUpcoming = aStart > now;
            const bUpcoming = bStart > now;

            if (aOngoing && !bOngoing) return -1;
            if (!aOngoing && bOngoing) return 1;
            if (aUpcoming && !bUpcoming) return -1;
            if (!aUpcoming && bUpcoming) return 1;
            return new Date(b.startDate) - new Date(a.startDate);
        });

        classroomsGrid.innerHTML = meets.map(meet => {
            // Backend retorna dateTimeStart e dateTimeEnd, mas pode vir como startDate/endDate também
            const startDate = new Date(meet.dateTimeStart || meet.startDate);
            const endDate = new Date(meet.dateTimeEnd || meet.endDate);
            const now = new Date();

            const isPast = endDate < now;
            const isUpcoming = startDate > now;
            const isOngoing = startDate <= now && endDate >= now;
            
            // Link da aula ao vivo (linkOfMeet) e link da gravação (linkRecordClass)
            const liveLink = meet.linkOfMeet || meet.linkOfMeet;
            const recordLink = meet.linkRecordClass || meet.linkRecordClass;

            let statusClass = 'past';
            let statusText = 'Finalizada';
            let statusBadgeClass = 'status-past';

            if (isOngoing) {
                statusClass = 'ongoing';
                statusText = 'Ao Vivo';
                statusBadgeClass = 'status-ongoing';
            } else if (isUpcoming) {
                statusClass = 'upcoming';
                statusText = 'Agendada';
                statusBadgeClass = 'status-upcoming';
            }

            return `
                <div class="classroom-card ${statusClass}">
                    <div class="classroom-header">
                        <div style="flex: 1;">
                            <div class="classroom-title">
                                <i class="fas fa-video"></i> ${escapeHtml(meet.title || 'Sem título')}
                            </div>
                            ${meet.description ? `
                                <div class="classroom-description">
                                    ${escapeHtml(meet.description)}
                                </div>
                            ` : ''}
                        </div>
                        <span class="status-badge ${statusBadgeClass}">
                            ${isOngoing ? '<i class="fas fa-circle" style="font-size: 0.6rem;"></i>' : ''}
                            ${statusText}
                        </span>
                    </div>

                    <div class="classroom-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar-alt"></i>
                            <div>
                                <strong>Início:</strong> ${formatDateTime(meet.dateTimeStart || meet.startDate)}
                            </div>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar-check"></i>
                            <div>
                                <strong>Fim:</strong> ${formatDateTime(meet.dateTimeEnd || meet.endDate)}
                            </div>
                        </div>
                        ${meet.presentCount !== undefined ? `
                            <div class="meta-item">
                                <i class="fas fa-users"></i>
                                <div>
                                    <strong>Presentes:</strong> ${meet.presentCount} aluno(s)
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    ${isPast ? `
                        <!-- Aula expirada - mostrar apenas link de gravação -->
                        ${recordLink ? `
                            <button 
                                class="btn-join" 
                                onclick="joinMeet('${escapeHtml(recordLink)}', true)"
                                style="background: rgba(107, 114, 128, 0.8);"
                            >
                                <i class="fas fa-video"></i>
                                Ver Gravação da Aula
                            </button>
                            <div style="margin-top: 10px; padding: 10px; background: rgba(251, 191, 36, 0.1); border-radius: 8px; text-align: center; color: #fbbf24; font-size: 0.85rem;">
                                <i class="fas fa-info-circle"></i>
                                A aula já expirou. Apenas a gravação está disponível.
                            </div>
                        ` : `
                            <div style="padding: 15px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; text-align: center; color: #ef4444;">
                                <i class="fas fa-times-circle"></i>
                                Aula expirada - Gravação não disponível
                            </div>
                        `}
                    ` : `
                        <!-- Aula ainda ativa - mostrar link ao vivo -->
                        ${liveLink ? `
                            <button 
                                class="btn-join" 
                                onclick="joinMeet('${escapeHtml(liveLink)}', false)"
                            >
                                <i class="fas fa-video"></i>
                                ${isOngoing ? 'Entrar na Aula Agora' : 'Acessar Link da Aula'}
                            </button>
                        ` : `
                            <div style="padding: 15px; background: rgba(251, 191, 36, 0.1); border-radius: 8px; text-align: center; color: #fbbf24;">
                                <i class="fas fa-exclamation-triangle"></i>
                                Link não disponível
                            </div>
                        `}
                    `}
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar salas de aula:', error);
        classroomsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar salas de aula</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Entrar na aula
function joinMeet(link, isRecording = false) {
    if (!link) {
        showMessage('Link da aula não disponível', 'error');
        return;
    }

    // Verificar se o link é válido
    if (!link.startsWith('http://') && !link.startsWith('https://')) {
        showMessage('Link inválido', 'error');
        return;
    }

    // Abrir em nova aba
    window.open(link, '_blank', 'noopener,noreferrer');
    
    if (isRecording) {
        showMessage('Abrindo gravação da aula em nova aba...', 'info');
    } else {
        showMessage('Abrindo link da aula em nova aba...', 'info');
    }
}

// Funções auxiliares
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDateTime(dateString) {
    if (!dateString) return 'Data não disponível';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function showMessage(message, type = 'info') {
    const container = document.getElementById('message-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type === 'success' ? 'success-message' : type === 'error' ? 'error-message' : 'info-message'}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Função para alternar entre tabs (aluno)
function switchStudentClassroomTab(tabName) {
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
        loadStudentRecordedClasses();
    } else if (tabName === 'live') {
        loadClassrooms();
    }
}

// Carregar aulas gravadas para o aluno
async function loadStudentRecordedClasses() {
    const token = localStorage.getItem('token');
    const grid = document.getElementById('student-recorded-classes-grid');
    
    if (!grid) return;
    
    if (!token) {
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Erro</h3><p>Usuário não autenticado</p></div>';
        return;
    }
    
    try {
        grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando aulas gravadas...</span></div>';
        
        const response = await fetch(`${API}/recorded-classes`, {
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
                    <h3>Nenhuma aula gravada disponível</h3>
                    <p>Seu professor ainda não adicionou aulas gravadas</p>
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
            if (recordedClass.videoUrl && recordedClass.videoUrl.includes('youtube.com/watch?v=')) {
                const videoId = recordedClass.videoUrl.split('v=')[1]?.split('&')[0];
                if (videoId) {
                    videoEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
                }
            } else if (recordedClass.videoUrl && recordedClass.videoUrl.includes('youtu.be/')) {
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
                        ${videoEmbedUrl.includes('youtube.com/embed') ? `
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

// Exportar funções globais
window.joinMeet = joinMeet;
window.switchStudentClassroomTab = switchStudentClassroomTab;
window.loadStudentRecordedClasses = loadStudentRecordedClasses;

})();

