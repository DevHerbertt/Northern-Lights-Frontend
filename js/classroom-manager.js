// classroom-manager.js
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
    console.log('🚀 DOMContentLoaded - Inicializando classroom manager');
    await loadMeets();
    // Não carregar aulas gravadas no início, apenas quando a aba for clicada
    // await loadRecordedClasses(); 
    setupEventListeners();
    console.log('✅ Event listeners configurados');
});

// Event Listeners
function setupEventListeners() {
    const form = document.getElementById('create-meet-form');
    const recordedClassForm = document.getElementById('recorded-class-form');
    const refreshBtn = document.getElementById('refresh-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const liveClassesTabBtn = document.getElementById('live-classes-tab-btn');
    const recordedClassesTabBtn = document.getElementById('recorded-classes-tab-btn');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createMeet();
        });
    }

    if (recordedClassForm) {
        recordedClassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveRecordedClass();
        });
    }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                const activeTab = document.querySelector('.tab-content.active');
                if (activeTab && activeTab.id === 'live-classes-tab') {
                    await loadMeets();
                    // Garantir que a aba de aulas gravadas está escondida
                    const recordedTab = document.getElementById('recorded-classes-tab');
                    if (recordedTab) {
                        recordedTab.style.display = 'none';
                        recordedTab.classList.remove('active');
                    }
                } else if (activeTab && activeTab.id === 'recorded-classes-tab') {
                    await loadRecordedClasses();
                    // Garantir que a aba de aulas ao vivo está escondida
                    const liveTab = document.getElementById('live-classes-tab');
                    if (liveTab) {
                        liveTab.style.display = 'none';
                        liveTab.classList.remove('active');
                    }
                }
            });
        }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            authService.logout();
            window.location.href = '/page/login.html';
        });
    }

    // Os botões já têm onclick no HTML, mas vamos garantir que funcionem
    // Removendo event listeners duplicados para evitar conflitos
    // if (liveClassesTabBtn) {
    //     liveClassesTabBtn.addEventListener('click', () => switchClassroomTab('live'));
    // }
    // if (recordedClassesTabBtn) {
    //     recordedClassesTabBtn.addEventListener('click', () => switchClassroomTab('recorded'));
    // }
}

// Criar sala de aula
async function createMeet() {
    const token = localStorage.getItem('token');
    const title = document.getElementById('meet-title').value.trim();
    const description = document.getElementById('meet-description').value.trim();
    const link = document.getElementById('meet-link').value.trim();
    const startDate = document.getElementById('meet-start').value;
    const endDate = document.getElementById('meet-end').value;

    if (!title || !link || !startDate || !endDate) {
        showMessage('Por favor, preencha todos os campos obrigatórios', 'error');
        return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
        showMessage('A data de término deve ser posterior à data de início', 'error');
        return;
    }

    try {
        // Converter datas para ISO string e depois para LocalDateTime no backend
        const dto = {
            title: title, // Título da aula
            description: description, // Descrição da aula
            linkOfMeet: link, // Link da aula ao vivo (Google Meet)
            linkRecordClass: link, // Link da gravação (mesmo link por enquanto)
            dateTimeStart: new Date(startDate).toISOString(),
            dateTimeEnd: new Date(endDate).toISOString()
        };
        
        console.log('🔍 DEBUG: DTO sendo enviado:', dto);

        const response = await fetch(`${API}/meets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dto)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Erro HTTP: ${response.status}`);
        }

        const meet = await response.json();
        showMessage('Sala de aula criada com sucesso! Os alunos receberão um email de notificação automaticamente.', 'success');

        // Limpar formulário
        document.getElementById('create-meet-form').reset();

        // Recarregar lista
        await loadMeets();

    } catch (error) {
        console.error('Erro ao criar sala de aula:', error);
        showMessage('Erro ao criar sala de aula: ' + error.message, 'error');
    }
}

// Carregar todas as salas de aula
async function loadMeets() {
    const token = localStorage.getItem('token');
    const meetsList = document.getElementById('meets-list');

    try {
        meetsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

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
            meetsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>Nenhuma sala de aula criada</h3>
                    <p>Crie uma nova sala de aula usando o formulário ao lado</p>
                </div>
            `;
            return;
        }

        // Ordenar por data (mais recentes primeiro)
        meets.sort((a, b) => {
            const dateA = new Date(a.dateTimeStart || a.startDate || 0);
            const dateB = new Date(b.dateTimeStart || b.startDate || 0);
            return dateB - dateA;
        });

        meetsList.innerHTML = meets.map(meet => {
            const startDate = new Date(meet.dateTimeStart || meet.startDate);
            const endDate = new Date(meet.dateTimeEnd || meet.endDate);
            const isPast = endDate < new Date();
            const isUpcoming = startDate > new Date();
            const isOngoing = startDate <= new Date() && endDate >= new Date();

            return `
                <div class="meet-card">
                    <div class="meet-header">
                        <div style="flex: 1;">
                            <div class="meet-title">${escapeHtml(meet.title || 'Sem título')}</div>
                            ${meet.description ? `
                                <div class="meet-description">${escapeHtml(meet.description)}</div>
                            ` : ''}
                        </div>
                        <div style="text-align: right;">
                            ${isPast ? '<span style="color: #94a3b8; font-size: 0.85rem;">Finalizada</span>' : ''}
                            ${isOngoing ? '<span style="color: #10b981; font-size: 0.85rem; font-weight: 600;">Ao Vivo</span>' : ''}
                            ${isUpcoming ? '<span style="color: #fbbf24; font-size: 0.85rem; font-weight: 600;">Agendada</span>' : ''}
                        </div>
                    </div>

                    <div class="meet-meta">
                        <div>
                            <i class="fas fa-calendar-alt"></i>
                            <strong>Início:</strong> ${formatDateTime(meet.dateTimeStart || meet.startDate)}
                        </div>
                        <div>
                            <i class="fas fa-calendar-check"></i>
                            <strong>Fim:</strong> ${formatDateTime(meet.dateTimeEnd || meet.endDate)}
                        </div>
                        ${meet.presentCount !== undefined ? `
                            <div class="present-count">
                                <i class="fas fa-users"></i>
                                ${meet.presentCount} presentes
                            </div>
                        ` : ''}
                    </div>

                    ${meet.linkRecordClass ? `
                        <div class="meet-link">
                            <i class="fas fa-video" style="color: #3b82f6;"></i>
                            <a href="${meet.linkRecordClass}" target="_blank" rel="noopener noreferrer">
                                ${meet.linkRecordClass}
                            </a>
                        </div>
                    ` : ''}

                    <div class="meet-actions">
                        <button class="btn-action btn-send-email" onclick="sendMeetEmail(${meet.id})">
                            <i class="fas fa-envelope"></i> Enviar Link por Email
                        </button>
                        <button class="btn-action btn-edit" onclick="editMeet(${meet.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-action btn-delete" onclick="deleteMeet(${meet.id})">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar salas de aula:', error);
        meetsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar salas de aula</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Enviar email com link do meet
async function sendMeetEmail(meetId) {
    const token = localStorage.getItem('token');

    try {
        // Buscar informações do meet
        const meetResponse = await fetch(`${API}/meets/${meetId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!meetResponse.ok) {
            throw new Error('Erro ao buscar informações da sala de aula');
        }

        const meet = await meetResponse.json();

        // Buscar todos os alunos
        const studentsResponse = await fetch(`${API}/students`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!studentsResponse.ok) {
            throw new Error('Erro ao buscar lista de alunos');
        }

        const students = await studentsResponse.json();

        if (students.length === 0) {
            showMessage('Nenhum aluno cadastrado no sistema', 'error');
            return;
        }

        // Confirmar envio
        const confirmMessage = `Deseja enviar o link da aula "${meet.title}" para ${students.length} aluno(s)?`;
        if (!confirm(confirmMessage)) {
            return;
        }

        showMessage('Enviando emails... Isso pode levar alguns instantes.', 'info');

        // Enviar email para cada aluno
        let successCount = 0;
        let errorCount = 0;

        for (const student of students) {
            try {
                const emailResponse = await fetch(`${API}/email/send-meet`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: student.email,
                        userName: student.userName,
                        meetTitle: meet.title,
                        meetDescription: meet.description,
                        meetLink: meet.linkRecordClass,
                        meetStartDate: meet.startDate,
                        meetEndDate: meet.endDate
                    })
                });

                if (emailResponse.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (error) {
                console.error(`Erro ao enviar email para ${student.email}:`, error);
                errorCount++;
            }
        }

        if (successCount > 0) {
            showMessage(`Emails enviados com sucesso! ${successCount} aluno(s) notificado(s).`, 'success');
        }

        if (errorCount > 0) {
            showMessage(`Alguns emails falharam: ${errorCount} erro(s).`, 'error');
        }

    } catch (error) {
        console.error('Erro ao enviar emails:', error);
        showMessage('Erro ao enviar emails: ' + error.message, 'error');
    }
}

// Editar sala de aula
async function editMeet(meetId) {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API}/meets/${meetId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar informações da sala de aula');
        }

        const meet = await response.json();

        // Preencher formulário
        document.getElementById('meet-title').value = meet.title || '';
        document.getElementById('meet-description').value = meet.description || '';
        document.getElementById('meet-link').value = meet.linkRecordClass || meet.linkOfMeet || '';
        
        // Formatar datas para datetime-local
        const startDateValue = meet.dateTimeStart || meet.startDate;
        if (startDateValue) {
            const startDate = new Date(startDateValue);
            document.getElementById('meet-start').value = formatDateTimeLocal(startDate);
        }
        
        const endDateValue = meet.dateTimeEnd || meet.endDate;
        if (endDateValue) {
            const endDate = new Date(endDateValue);
            document.getElementById('meet-end').value = formatDateTimeLocal(endDate);
        }

        // Alterar botão do formulário para atualizar
        const form = document.getElementById('create-meet-form');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar Sala de Aula';
        submitBtn.onclick = async (e) => {
            e.preventDefault();
            await updateMeet(meetId);
        };

        // Scroll para o formulário
        document.querySelector('.create-panel').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Erro ao editar sala de aula:', error);
        showMessage('Erro ao carregar dados da sala de aula: ' + error.message, 'error');
    }
}

// Atualizar sala de aula
async function updateMeet(meetId) {
    const token = localStorage.getItem('token');
    const title = document.getElementById('meet-title').value.trim();
    const description = document.getElementById('meet-description').value.trim();
    const link = document.getElementById('meet-link').value.trim();
    const startDate = document.getElementById('meet-start').value;
    const endDate = document.getElementById('meet-end').value;

    if (!title || !link || !startDate || !endDate) {
        showMessage('Por favor, preencha todos os campos obrigatórios', 'error');
        return;
    }

    try {
        const dto = {
            title: title,
            description: description,
            linkOfMeet: link,
            linkRecordClass: link,
            dateTimeStart: new Date(startDate).toISOString(),
            dateTimeEnd: new Date(endDate).toISOString()
        };
        
        console.log('🔍 DEBUG: Atualizando meet com DTO:', dto);

        const response = await fetch(`${API}/meets/${meetId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dto)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Erro HTTP: ${response.status}`);
        }

        showMessage('Sala de aula atualizada com sucesso!', 'success');

        // Resetar formulário
        document.getElementById('create-meet-form').reset();
        const submitBtn = document.querySelector('#create-meet-form button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Criar Sala de Aula';
        submitBtn.onclick = null;

        // Recarregar lista
        await loadMeets();

    } catch (error) {
        console.error('Erro ao atualizar sala de aula:', error);
        showMessage('Erro ao atualizar sala de aula: ' + error.message, 'error');
    }
}

// Deletar sala de aula
async function deleteMeet(meetId) {
    const token = localStorage.getItem('token');

    if (!confirm('Tem certeza que deseja excluir esta sala de aula?')) {
        return;
    }

    try {
        const response = await fetch(`${API}/meets/${meetId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Erro HTTP: ${response.status}`);
        }

        showMessage('Sala de aula excluída com sucesso!', 'success');
        await loadMeets();

    } catch (error) {
        console.error('Erro ao excluir sala de aula:', error);
        showMessage('Erro ao excluir sala de aula: ' + error.message, 'error');
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

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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

// Função para alternar entre tabs
function switchClassroomTab(tabName) {
    console.log('🔍 switchClassroomTab chamado com:', tabName);
    
    // Esconder todos os tabs e garantir que estão realmente escondidos
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.setProperty('display', 'none', 'important');
        tab.style.setProperty('visibility', 'hidden', 'important');
    });
    
    // Remover active de todos os botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar tab selecionado
    const tabId = `${tabName === 'live' ? 'live-classes' : 'recorded-classes'}-tab`;
    const btnId = `${tabName === 'live' ? 'live-classes' : 'recorded-classes'}-tab-btn`;
    const selectedTab = document.getElementById(tabId);
    const selectedBtn = document.getElementById(btnId);
    
    console.log('🔍 Tab ID:', tabId, 'Encontrado:', !!selectedTab);
    console.log('🔍 Button ID:', btnId, 'Encontrado:', !!selectedBtn);
    
    if (selectedTab) {
        // Forçar exibição da aba - usar múltiplas abordagens
        selectedTab.classList.add('active');
        selectedTab.removeAttribute('hidden');
        
        // Método 1: setAttribute com style completo
        selectedTab.setAttribute('style', 'display: block !important; visibility: visible !important; opacity: 1 !important; height: auto !important; overflow: visible !important; position: relative !important; z-index: 10 !important;');
        
        // Método 2: style.setProperty com important
        selectedTab.style.setProperty('display', 'block', 'important');
        selectedTab.style.setProperty('visibility', 'visible', 'important');
        selectedTab.style.setProperty('opacity', '1', 'important');
        selectedTab.style.setProperty('height', 'auto', 'important');
        selectedTab.style.setProperty('overflow', 'visible', 'important');
        selectedTab.style.setProperty('position', 'relative', 'important');
        selectedTab.style.setProperty('z-index', '10', 'important');
        
        console.log('✅ Tab exibido:', tabId);
        console.log('🔍 Tab display:', window.getComputedStyle(selectedTab).display);
        console.log('🔍 Tab visibility:', window.getComputedStyle(selectedTab).visibility);
        console.log('🔍 Tab opacity:', window.getComputedStyle(selectedTab).opacity);
        console.log('🔍 Tab height:', window.getComputedStyle(selectedTab).height);
        console.log('🔍 Tab position:', window.getComputedStyle(selectedTab).position);
        console.log('🔍 Tab z-index:', window.getComputedStyle(selectedTab).zIndex);
        console.log('🔍 Tab offsetHeight:', selectedTab.offsetHeight);
        console.log('🔍 Tab offsetWidth:', selectedTab.offsetWidth);
        console.log('🔍 Tab scrollHeight:', selectedTab.scrollHeight);
        
        // Verificar se o botão "Adicionar Aula Gravada" está visível
        if (tabName === 'recorded') {
            // Aguardar um pouco para garantir que o DOM esteja atualizado
            setTimeout(() => {
                const addButton = selectedTab.querySelector('button[onclick*="openRecordedClassModal"]');
                console.log('🔍 Botão "Adicionar Aula Gravada" encontrado:', !!addButton);
                if (addButton) {
                    console.log('🔍 Botão display:', window.getComputedStyle(addButton).display);
                    console.log('🔍 Botão visibility:', window.getComputedStyle(addButton).visibility);
                    // Garantir que o botão esteja visível
                    addButton.style.display = 'inline-flex';
                    addButton.style.visibility = 'visible';
                    addButton.style.opacity = '1';
                } else {
                    console.error('❌ Botão "Adicionar Aula Gravada" não encontrado no DOM!');
                    console.error('🔍 Conteúdo do tab:', selectedTab.innerHTML.substring(0, 500));
                }
                
                // Verificar se o grid está visível
                const grid = selectedTab.querySelector('#recorded-classes-grid');
                console.log('🔍 Grid encontrado:', !!grid);
                if (grid) {
                    console.log('🔍 Grid display:', window.getComputedStyle(grid).display);
                    grid.style.display = 'grid';
                    grid.style.visibility = 'visible';
                    grid.style.opacity = '1';
                    
                    // Verificar se o grid tem conteúdo
                    console.log('🔍 Grid innerHTML length:', grid.innerHTML.length);
                    console.log('🔍 Grid tem filhos?', grid.children.length);
                } else {
                    console.error('❌ Grid não encontrado!');
                }
                
                // Verificar todo o conteúdo do tab
                const tabContent = selectedTab.querySelector('div');
                console.log('🔍 Tab tem div filho?', !!tabContent);
                if (tabContent) {
                    console.log('🔍 Div filho display:', window.getComputedStyle(tabContent).display);
                    tabContent.style.display = 'block';
                    tabContent.style.visibility = 'visible';
                }
            }, 50);
        }
    } else {
        console.error('❌ Tab não encontrado:', tabId);
    }
    
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Carregar dados se necessário
    if (tabName === 'recorded') {
        console.log('📹 Carregando aulas gravadas...');
        
        // Garantir que a aba de aulas ao vivo está escondida
        const liveTab = document.getElementById('live-classes-tab');
        if (liveTab) {
            liveTab.style.setProperty('display', 'none', 'important');
            liveTab.style.setProperty('visibility', 'hidden', 'important');
            liveTab.classList.remove('active');
        }
        
        // Aguardar um pouco e carregar aulas gravadas
        setTimeout(() => {
            loadRecordedClasses();
        }, 100);
    } else if (tabName === 'live') {
        console.log('📹 Carregando aulas ao vivo...');
        
        // Garantir que a aba de aulas gravadas está escondida
        const recordedTab = document.getElementById('recorded-classes-tab');
        if (recordedTab) {
            recordedTab.style.setProperty('display', 'none', 'important');
            recordedTab.style.setProperty('visibility', 'hidden', 'important');
            recordedTab.classList.remove('active');
        }
        
        loadMeets();
    }
}

// Carregar aulas gravadas
async function loadRecordedClasses() {
    console.log('📹 loadRecordedClasses iniciado');
    const token = localStorage.getItem('token');
    
    // Aguardar um pouco para garantir que o DOM esteja pronto
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Garantir que estamos buscando o grid APENAS dentro da aba recorded-classes-tab
    const recordedTab = document.getElementById('recorded-classes-tab');
    if (!recordedTab) {
        console.error('❌ Aba recorded-classes-tab não encontrada!');
        return;
    }
    
    // Buscar o grid APENAS dentro da aba recorded-classes-tab
    let grid = recordedTab.querySelector('#recorded-classes-grid');
    
    console.log('🔍 Grid encontrado:', !!grid);
    console.log('🔍 Token encontrado:', !!token);
    console.log('🔍 Grid está dentro da aba correta?', grid && grid.closest('#recorded-classes-tab') !== null);
    
    if (!grid) {
        console.error('❌ Elemento recorded-classes-grid não encontrado dentro da aba!');
        console.error('🔍 Tentando encontrar novamente...');
        // Tentar novamente após um delay
        await new Promise(resolve => setTimeout(resolve, 200));
        grid = recordedTab.querySelector('#recorded-classes-grid');
        if (!grid) {
            console.error('❌ Elemento ainda não encontrado após retry');
            return;
        }
    }
    
    // Verificar se o grid está realmente dentro da aba correta
    if (grid && !grid.closest('#recorded-classes-tab')) {
        console.error('❌ Grid encontrado mas NÃO está dentro da aba recorded-classes-tab!');
        return;
    }
    
    if (!token) {
        console.error('❌ Token não encontrado!');
        grid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><h3>Erro</h3><p>Usuário não autenticado</p></div>';
        return;
    }
    
    try {
        grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><span>Carregando aulas gravadas...</span></div>';
        
        console.log('🌐 Fazendo requisição para:', `${API}/recorded-classes/teacher`);
        const response = await fetch(`${API}/recorded-classes/teacher`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Resposta recebida:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na resposta:', errorText);
            throw new Error(`Erro ao carregar aulas gravadas: ${response.status} - ${errorText}`);
        }
        
        const classes = await response.json();
        console.log('✅ Aulas gravadas recebidas:', classes.length);
        
        if (classes.length === 0) {
            console.log('📝 Renderizando estado vazio...');
            const emptyStateHtml = `
                <div class="empty-state" style="grid-column: 1 / -1 !important; text-align: center !important; padding: 100px 40px !important; color: #94a3b8 !important; width: 100% !important; background: linear-gradient(135deg, rgba(15, 23, 42, 0.4), rgba(30, 41, 59, 0.4)) !important; border-radius: 20px !important; border: 3px dashed rgba(251, 191, 36, 0.4) !important; display: block !important; visibility: visible !important; opacity: 1 !important; position: relative !important; z-index: 1 !important; overflow: hidden !important;">
                    <!-- Decoração de fundo -->
                    <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: radial-gradient(circle, rgba(251, 191, 36, 0.1), transparent); border-radius: 50%; pointer-events: none;"></div>
                    <div style="position: absolute; bottom: -30px; left: -30px; width: 150px; height: 150px; background: radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent); border-radius: 50%; pointer-events: none;"></div>
                    
                    <div style="position: relative; z-index: 1;">
                        <div style="display: inline-block; padding: 30px; background: rgba(251, 191, 36, 0.1); border-radius: 50%; margin-bottom: 30px; border: 3px solid rgba(251, 191, 36, 0.3);">
                            <i class="fas fa-film" style="font-size: 5rem; color: #fbbf24; display: block;"></i>
                        </div>
                        <h3 style="color: #f8fafc !important; margin-bottom: 15px !important; font-size: 2rem !important; font-weight: 700 !important; text-shadow: 0 2px 10px rgba(251, 191, 36, 0.2) !important; visibility: visible !important; display: block !important;">Nenhuma aula gravada ainda</h3>
                        <p style="color: #cbd5e1 !important; margin-bottom: 50px !important; font-size: 1.15rem !important; line-height: 1.8 !important; max-width: 600px !important; margin-left: auto !important; margin-right: auto !important; visibility: visible !important; display: block !important;">
                            Você ainda não adicionou nenhuma aula gravada.<br>
                            Use o botão <strong style="color: #3b82f6; font-weight: 600;">"Adicionar Aula Gravada"</strong> no topo desta página para começar a criar sua galeria.
                        </p>
                        <div style="margin-top: 40px !important; visibility: visible !important; display: block !important;">
                            <button class="btn btn-primary" onclick="openRecordedClassModal()" style="display: inline-flex !important; align-items: center !important; gap: 12px !important; padding: 16px 32px !important; font-size: 1.15rem !important; font-weight: 600 !important; cursor: pointer !important; border: none !important; border-radius: 12px !important; background: linear-gradient(135deg, #3b82f6, #2563eb) !important; color: white !important; transition: all 0.3s ease !important; box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4) !important; visibility: visible !important; opacity: 1 !important;" onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 8px 25px rgba(59, 130, 246, 0.5)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 20px rgba(59, 130, 246, 0.4)'">
                                <i class="fas fa-plus-circle" style="font-size: 1.2rem;"></i> Adicionar Primeira Aula Gravada
                            </button>
                        </div>
                    </div>
                </div>
            `;
            grid.innerHTML = emptyStateHtml;
            
            // Forçar visibilidade do grid e do conteúdo
            grid.style.setProperty('display', 'grid', 'important');
            grid.style.setProperty('visibility', 'visible', 'important');
            grid.style.setProperty('opacity', '1', 'important');
            grid.style.setProperty('min-height', '400px', 'important');
            grid.style.setProperty('width', '100%', 'important');
            grid.style.setProperty('position', 'relative', 'important');
            grid.style.setProperty('z-index', '1', 'important');
            
            console.log('🔍 Grid offsetHeight:', grid.offsetHeight);
            console.log('🔍 Grid offsetWidth:', grid.offsetWidth);
            console.log('🔍 Grid scrollHeight:', grid.scrollHeight);
            
            // Forçar visibilidade do elemento empty-state
            const emptyState = grid.querySelector('.empty-state');
            if (emptyState) {
                emptyState.style.setProperty('display', 'block', 'important');
                emptyState.style.setProperty('visibility', 'visible', 'important');
                emptyState.style.setProperty('opacity', '1', 'important');
                emptyState.style.setProperty('position', 'relative', 'important');
                emptyState.style.setProperty('z-index', '2', 'important');
                emptyState.style.setProperty('min-height', '300px', 'important');
                console.log('✅ Empty state forçado a ser visível');
                console.log('🔍 Empty state offsetHeight:', emptyState.offsetHeight);
                console.log('🔍 Empty state offsetWidth:', emptyState.offsetWidth);
            }
            
            console.log('✅ Estado vazio renderizado. Grid innerHTML length:', grid.innerHTML.length);
            console.log('🔍 Grid visível?', window.getComputedStyle(grid).display !== 'none');
            console.log('🔍 Grid parent visível?', window.getComputedStyle(grid.parentElement).display !== 'none');
            console.log('🔍 Grid computed display:', window.getComputedStyle(grid).display);
            console.log('🔍 Grid computed visibility:', window.getComputedStyle(grid).visibility);
            console.log('🔍 Empty state encontrado?', !!emptyState);
            if (emptyState) {
                console.log('🔍 Empty state computed display:', window.getComputedStyle(emptyState).display);
                console.log('🔍 Empty state computed visibility:', window.getComputedStyle(emptyState).visibility);
            }
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
            const formattedDateShort = `${day} ${monthName} ${year}`;
            
            return `
                <div class="recorded-class-card" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95)); border-radius: 16px; padding: 0; border: 2px solid rgba(251, 191, 36, 0.2); transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);">
                    <!-- Header do Card com gradiente -->
                    <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(251, 191, 36, 0.05)); padding: 20px; border-bottom: 1px solid rgba(251, 191, 36, 0.2); position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                            <div style="flex: 1; margin-right: 100px;">
                                <h3 style="color: #f8fafc; margin: 0 0 8px 0; font-size: 1.3rem; font-weight: 700; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(recordedClass.title)}</h3>
                                <p style="color: #94a3b8; margin: 0; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                                    <i class="fas fa-calendar-alt" style="color: #fbbf24;"></i> 
                                    <span>${formattedDate}</span>
                                </p>
                            </div>
                            <!-- Botões de ação -->
                            <div style="display: flex; gap: 8px; position: absolute; top: 20px; right: 20px;">
                                <button onclick="editRecordedClass(${recordedClass.id})" style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; border: 2px solid rgba(59, 130, 246, 0.4); padding: 10px 14px; border-radius: 10px; cursor: pointer; font-size: 0.9rem; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;" title="Editar" onmouseover="this.style.background='rgba(59, 130, 246, 0.3)'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.2)'; this.style.transform='scale(1)'">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button onclick="deleteRecordedClass(${recordedClass.id})" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 2px solid rgba(239, 68, 68, 0.4); padding: 10px 14px; border-radius: 10px; cursor: pointer; font-size: 0.9rem; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;" title="Excluir" onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'; this.style.transform='scale(1.1)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.transform='scale(1)'">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                        ${recordedClass.description ? `
                            <p style="color: #cbd5e1; margin: 12px 0 0 0; font-size: 0.95rem; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(recordedClass.description)}</p>
                        ` : ''}
                    </div>
                    
                    <!-- Player de Vídeo ou Thumbnail -->
                    <div style="margin: 0; border-radius: 0 0 16px 16px; overflow: hidden; background: #000; aspect-ratio: 16/9; position: relative; cursor: ${isYouTube ? 'default' : 'pointer'};" ${!isYouTube ? `onclick="window.open('${escapeHtml(recordedClass.videoUrl)}', '_blank')"` : ''}>
                        ${isYouTube ? `
                            <iframe 
                                width="100%" 
                                height="100%" 
                                src="${videoEmbedUrl}" 
                                frameborder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowfullscreen
                                style="border: none; display: block;"
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
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('❌ Erro ao carregar aulas gravadas:', error);
        if (grid) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao carregar aulas gravadas</h3>
                    <p>${error.message}</p>
                    <p style="margin-top: 10px; font-size: 0.9rem; color: #94a3b8;">Verifique o console para mais detalhes.</p>
                </div>
            `;
        }
    }
}

// Abrir modal de aula gravada
function openRecordedClassModal(recordedClassId = null) {
    console.log('🔍 openRecordedClassModal chamado com ID:', recordedClassId);
    const modal = document.getElementById('recorded-class-modal');
    const form = document.getElementById('recorded-class-form');
    const modalTitle = document.getElementById('recorded-class-modal-title');
    
    console.log('🔍 Modal encontrado:', !!modal);
    console.log('🔍 Form encontrado:', !!form);
    console.log('🔍 ModalTitle encontrado:', !!modalTitle);
    
    if (!modal) {
        console.error('❌ Modal recorded-class-modal não encontrado!');
        return;
    }
    
    if (!form) {
        console.error('❌ Form recorded-class-form não encontrado!');
        return;
    }
    
    // Resetar formulário
    form.reset();
    const idInput = document.getElementById('recorded-class-id');
    if (idInput) {
        idInput.value = '';
    }
    
    if (recordedClassId) {
        // Modo edição
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Aula Gravada';
        }
        loadRecordedClassForEdit(recordedClassId);
    } else {
        // Modo criação
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Adicionar Aula Gravada';
        }
    }
    
    modal.style.display = 'flex';
    console.log('✅ Modal exibido');
}

// Fechar modal de aula gravada
function closeRecordedClassModal() {
    const modal = document.getElementById('recorded-class-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Carregar aula gravada para edição
async function loadRecordedClassForEdit(recordedClassId) {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API}/recorded-classes/${recordedClassId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar aula gravada');
        }
        
        const recordedClass = await response.json();
        
        // Preencher formulário
        document.getElementById('recorded-class-id').value = recordedClass.id;
        document.getElementById('recorded-class-title').value = recordedClass.title || '';
        document.getElementById('recorded-class-description').value = recordedClass.description || '';
        document.getElementById('recorded-class-video-url').value = recordedClass.videoUrl || '';
        
        // Formatar data para input type="date"
        if (recordedClass.classDate) {
            const classDate = new Date(recordedClass.classDate);
            const year = classDate.getFullYear();
            const month = String(classDate.getMonth() + 1).padStart(2, '0');
            const day = String(classDate.getDate()).padStart(2, '0');
            document.getElementById('recorded-class-date').value = `${year}-${month}-${day}`;
        }
        
    } catch (error) {
        console.error('Erro ao carregar aula gravada:', error);
        showMessage('Erro ao carregar aula gravada: ' + error.message, 'error');
    }
}

// Salvar aula gravada (criar ou atualizar)
async function saveRecordedClass() {
    const token = localStorage.getItem('token');
    const recordedClassId = document.getElementById('recorded-class-id').value;
    const title = document.getElementById('recorded-class-title').value.trim();
    const description = document.getElementById('recorded-class-description').value.trim();
    const videoUrl = document.getElementById('recorded-class-video-url').value.trim();
    const classDate = document.getElementById('recorded-class-date').value;
    
    if (!title || !videoUrl || !classDate) {
        showMessage('Por favor, preencha todos os campos obrigatórios', 'error');
        return;
    }
    
    try {
        const dto = {
            title: title,
            description: description || null,
            videoUrl: videoUrl,
            classDate: classDate
        };
        
        let response;
        if (recordedClassId) {
            // Atualizar
            response = await fetch(`${API}/recorded-classes/${recordedClassId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dto)
            });
        } else {
            // Criar
            response = await fetch(`${API}/recorded-classes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dto)
            });
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Erro HTTP: ${response.status}`);
        }
        
        showMessage(recordedClassId ? 'Aula gravada atualizada com sucesso!' : 'Aula gravada adicionada com sucesso!', 'success');
        
        // Fechar modal
        closeRecordedClassModal();
        
        // Recarregar lista
        await loadRecordedClasses();
        
    } catch (error) {
        console.error('Erro ao salvar aula gravada:', error);
        showMessage('Erro ao salvar aula gravada: ' + error.message, 'error');
    }
}

// Editar aula gravada
function editRecordedClass(recordedClassId) {
    openRecordedClassModal(recordedClassId);
}

// Excluir aula gravada
async function deleteRecordedClass(recordedClassId) {
    const token = localStorage.getItem('token');
    
    if (!confirm('Tem certeza que deseja excluir esta aula gravada?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API}/recorded-classes/${recordedClassId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Erro HTTP: ${response.status}`);
        }
        
        showMessage('Aula gravada excluída com sucesso!', 'success');
        await loadRecordedClasses();
        
    } catch (error) {
        console.error('Erro ao excluir aula gravada:', error);
        showMessage('Erro ao excluir aula gravada: ' + error.message, 'error');
    }
}

// Exportar funções globais
window.sendMeetEmail = sendMeetEmail;
window.editMeet = editMeet;
window.deleteMeet = deleteMeet;
window.switchClassroomTab = switchClassroomTab;
window.openRecordedClassModal = openRecordedClassModal;
window.closeRecordedClassModal = closeRecordedClassModal;
window.editRecordedClass = editRecordedClass;
window.deleteRecordedClass = deleteRecordedClass;

})();

