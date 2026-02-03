// student-classrooms-manager.js
(function() {
'use strict';

// Usar API configurada em config.js
if (typeof window.API === 'undefined') {
    window.API = "http://localhost:8080";
}
const API = (function() { return window.API; })();

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
            let isYouTube = false;
            if (recordedClass.videoUrl && recordedClass.videoUrl.includes('youtube.com/watch?v=')) {
                const videoId = recordedClass.videoUrl.split('v=')[1]?.split('&')[0];
                if (videoId) {
                    videoEmbedUrl = `https://www.youtube.com/embed/${videoId}`;
                    isYouTube = true;
                }
            } else if (recordedClass.videoUrl && recordedClass.videoUrl.includes('youtu.be/')) {
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
                                    <div style="font-size: 5rem; font-weight: 800; line-height: 1; margin-bottom: 4px; text-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3); letter-spacing: -2px; background: linear-gradient(180deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.9) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));">${day}</div>
                                    
                                    <!-- Mês e ano elegantes -->
                                    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 8px;">
                                        <div style="font-size: 1.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5), 0 1px 4px rgba(0, 0, 0, 0.4); opacity: 0.98;">${monthName}</div>
                                        <div style="width: 3px; height: 3px; background: rgba(255, 255, 255, 0.6); border-radius: 50%;"></div>
                                        <div style="font-size: 1.4rem; font-weight: 600; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5), 0 1px 4px rgba(0, 0, 0, 0.4); opacity: 0.95;">${year}</div>
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

