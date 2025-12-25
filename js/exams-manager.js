// exams-manager.js
// Declarar API global apenas uma vez
if (typeof window.API === 'undefined') {
    window.API = "http://localhost:8080";
}
// Usar window.API diretamente através de uma função para evitar conflito de escopo
const API = (function() { return window.API; })();

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', async () => {
    await loadQuestions();
    await loadExams();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    const form = document.getElementById('create-exam-form');
    const refreshBtn = document.getElementById('refresh-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await createExam();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await loadQuestions();
            await loadExams();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            authService.logout();
            window.location.href = '/page/login.html';
        });
    }
}

// Carregar questões para seleção
async function loadQuestions() {
    const token = localStorage.getItem('token');
    const selector = document.getElementById('questions-selector');

    try {
        const response = await fetch(`${API}/questions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const questions = await response.json();

        if (questions.length === 0) {
            selector.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Nenhuma questão disponível</p>
                    <p style="font-size: 0.9rem; margin-top: 10px;">
                        <a href="/page/DashBoardTeacher-Nav/Questions.html" style="color: #3b82f6;">
                            Criar questões primeiro
                        </a>
                    </p>
                </div>
            `;
            return;
        }

        selector.innerHTML = questions.map(q => `
            <div class="question-checkbox">
                <input 
                    type="checkbox" 
                    id="question-${q.id}" 
                    value="${q.id}"
                    class="question-checkbox-input"
                >
                <label for="question-${q.id}" style="flex: 1; cursor: pointer;">
                    <strong>${escapeHtml(q.title || 'Sem título')}</strong>
                    <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 5px;">
                        ${escapeHtml(q.description?.substring(0, 80) || 'Sem descrição')}${q.description?.length > 80 ? '...' : ''}
                    </div>
                </label>
            </div>
        `).join('');

    } catch (error) {
        console.error('Erro ao carregar questões:', error);
        selector.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Erro ao carregar questões</p>
            </div>
        `;
    }
}

// Criar prova
async function createExam() {
    const token = localStorage.getItem('token');
    const title = document.getElementById('exam-title').value.trim();
    const description = document.getElementById('exam-description').value.trim();
    const startDate = document.getElementById('exam-start').value;
    const endDate = document.getElementById('exam-end').value;
    const duration = document.getElementById('exam-duration').value;
    const score = document.getElementById('exam-score').value;

    if (!title || !startDate || !endDate) {
        showMessage('Título, data de início e fim são obrigatórios', 'error');
        return;
    }

    // Coletar questões selecionadas
    const selectedQuestions = Array.from(document.querySelectorAll('.question-checkbox-input:checked'))
        .map(cb => parseInt(cb.value));

    if (selectedQuestions.length === 0) {
        showMessage('Selecione pelo menos uma questão', 'error');
        return;
    }

    const dto = {
        title: title,
        description: description,
        startDate: startDate,
        endDate: endDate,
        durationMinutes: duration ? parseInt(duration) : null,
        totalScore: score ? parseInt(score) : null,
        isActive: true,
        questionIds: selectedQuestions
    };

    try {
        const response = await fetch(`${API}/exams`, {
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

        const exam = await response.json();
        showMessage('Prova criada com sucesso!', 'success');

        // Limpar formulário
        document.getElementById('create-exam-form').reset();
        document.querySelectorAll('.question-checkbox-input').forEach(cb => cb.checked = false);

        // Recarregar lista
        await loadExams();

    } catch (error) {
        console.error('Erro ao criar prova:', error);
        showMessage('Erro ao criar prova: ' + error.message, 'error');
    }
}

// Carregar provas
async function loadExams() {
    const token = localStorage.getItem('token');
    const examsList = document.getElementById('exams-list');

    try {
        examsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

        const response = await fetch(`${API}/exams/my-exams`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const exams = await response.json();

        if (exams.length === 0) {
            examsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>Nenhuma prova criada</h3>
                    <p>Crie uma nova prova usando o formulário ao lado</p>
                </div>
            `;
            return;
        }

        examsList.innerHTML = exams.map(exam => {
            const startDate = new Date(exam.startDate);
            const endDate = new Date(exam.endDate);
            const now = new Date();

            return `
                <div class="exam-card">
                    <div class="exam-header">
                        <div style="flex: 1;">
                            <div class="exam-title">${escapeHtml(exam.title || 'Sem título')}</div>
                            <span class="status-badge ${exam.isActive ? 'status-active' : 'status-inactive'}">
                                ${exam.isActive ? '<i class="fas fa-check-circle"></i> Ativa' : '<i class="fas fa-times-circle"></i> Inativa'}
                            </span>
                        </div>
                    </div>
                    ${exam.description ? `
                        <div style="color: #94a3b8; margin: 10px 0;">
                            ${escapeHtml(exam.description)}
                        </div>
                    ` : ''}
                    <div class="exam-meta">
                        <div>
                            <i class="fas fa-calendar-alt"></i>
                            <strong>Início:</strong> ${formatDateTime(exam.startDate)}
                        </div>
                        <div>
                            <i class="fas fa-calendar-check"></i>
                            <strong>Fim:</strong> ${formatDateTime(exam.endDate)}
                        </div>
                        ${exam.durationMinutes ? `
                            <div>
                                <i class="fas fa-clock"></i>
                                <strong>Duração:</strong> ${exam.durationMinutes} minutos
                            </div>
                        ` : ''}
                        ${exam.totalScore ? `
                            <div>
                                <i class="fas fa-star"></i>
                                <strong>Pontuação Total:</strong> ${exam.totalScore} pontos
                            </div>
                        ` : ''}
                        ${exam.questions ? `
                            <div>
                                <i class="fas fa-file-alt"></i>
                                <strong>Questões:</strong> ${exam.questions.length} questão(ões)
                            </div>
                        ` : ''}
                    </div>
                    <div class="exam-actions">
                        <button class="btn btn-success" onclick="toggleExamStatus(${exam.id}, ${!exam.isActive})">
                            <i class="fas fa-${exam.isActive ? 'pause' : 'play'}"></i>
                            ${exam.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <button class="btn btn-danger" onclick="deleteExam(${exam.id})">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar provas:', error);
        examsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar provas</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Toggle status da prova
async function toggleExamStatus(examId, newStatus) {
    const token = localStorage.getItem('token');

    try {
        const examResponse = await fetch(`${API}/exams/${examId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!examResponse.ok) {
            throw new Error('Erro ao buscar prova');
        }

        const exam = await examResponse.json();

        const dto = {
            title: exam.title,
            description: exam.description,
            startDate: exam.startDate,
            endDate: exam.endDate,
            durationMinutes: exam.durationMinutes,
            totalScore: exam.totalScore,
            isActive: newStatus,
            questionIds: exam.questions ? exam.questions.map(q => q.id) : []
        };

        const response = await fetch(`${API}/exams/${examId}`, {
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

        showMessage(`Prova ${newStatus ? 'ativada' : 'desativada'} com sucesso!`, 'success');
        await loadExams();

    } catch (error) {
        console.error('Erro ao alterar status da prova:', error);
        showMessage('Erro ao alterar status: ' + error.message, 'error');
    }
}

// Deletar prova
async function deleteExam(examId) {
    if (!confirm('Tem certeza que deseja excluir esta prova?')) {
        return;
    }

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API}/exams/${examId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Erro HTTP: ${response.status}`);
        }

        showMessage('Prova excluída com sucesso!', 'success');
        await loadExams();

    } catch (error) {
        console.error('Erro ao excluir prova:', error);
        showMessage('Erro ao excluir prova: ' + error.message, 'error');
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

// Exportar funções globais
window.toggleExamStatus = toggleExamStatus;
window.deleteExam = deleteExam;


