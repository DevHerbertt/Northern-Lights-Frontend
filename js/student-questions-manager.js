// student-questions-manager.js
// Usar API configurada em config.js
if (typeof window.API === 'undefined') {
    window.API = "http://localhost:8080";
}
const API = (function() { return window.API; })();

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar se o usuário é estudante
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'STUDENT') {
        alert('Esta página é apenas para estudantes. Faça login como estudante.');
        window.location.href = '/page/login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const questionId = urlParams.get('questionId');
    const tab = urlParams.get('tab');

    // Atualizar navegação ativa
    if (tab === 'lost') {
        const navLost = document.getElementById('nav-lost');
        const navQuestions = document.getElementById('nav-questions');
        if (navLost) navLost.classList.add('active');
        if (navQuestions) navQuestions.classList.remove('active');
    } else {
        const navLost = document.getElementById('nav-lost');
        const navQuestions = document.getElementById('nav-questions');
        if (navLost) navLost.classList.remove('active');
        if (navQuestions) navQuestions.classList.add('active');
    }

    if (questionId) {
        await loadQuestion(questionId);
    } else if (tab === 'lost') {
        await loadLostQuestions();
    } else {
        await loadAllQuestions();
    }

    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    const refreshBtn = document.getElementById('refresh-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const questionId = urlParams.get('questionId');
            if (questionId) {
                await loadQuestion(questionId);
            } else {
                await loadAllQuestions();
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

// Carregar todas as questões
async function loadAllQuestions() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const questionsView = document.getElementById('questions-view');

    try {
        questionsView.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

        const response = await fetch(`${API}/questions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar questões');
        }

        const questions = await response.json();

        // Carregar respostas do aluno
        let studentAnswers = [];
        if (user.id) {
            try {
                const allAnswers = await fetch(`${API}/answers`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }).then(r => r.ok ? r.json() : []);

                studentAnswers = allAnswers.filter(a => a.student?.id === user.id);
            } catch (error) {
                console.error('Erro ao carregar respostas:', error);
            }
        }

        const answeredQuestionIds = new Set(studentAnswers.map(a => a.question?.id).filter(Boolean));

        if (questions.length === 0) {
            questionsView.innerHTML = `
                <div class="question-card">
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <h3>Nenhuma questão disponível</h3>
                        <p>Aguarde o professor criar questões</p>
                    </div>
                </div>
            `;
            return;
        }

        // Agrupar questões por data
        const questionsByDate = {};
        questions.forEach(question => {
            if (question.createdAt) {
                const date = new Date(question.createdAt);
                const dateKey = date.toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                });
                
                if (!questionsByDate[dateKey]) {
                    questionsByDate[dateKey] = [];
                }
                questionsByDate[dateKey].push(question);
            } else {
                // Se não tiver data, coloca em "Sem data"
                if (!questionsByDate['Sem data']) {
                    questionsByDate['Sem data'] = [];
                }
                questionsByDate['Sem data'].push(question);
            }
        });

        // Ordenar datas (mais recentes primeiro)
        const sortedDates = Object.keys(questionsByDate).sort((a, b) => {
            if (a === 'Sem data') return 1;
            if (b === 'Sem data') return -1;
            return new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'));
        });

        questionsView.innerHTML = sortedDates.map(dateKey => {
            const dateQuestions = questionsByDate[dateKey];
            
            return `
                <div style="margin-bottom: 40px;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid rgba(59, 130, 246, 0.3);">
                        <i class="fas fa-calendar-alt" style="font-size: 1.5rem; color: #3b82f6;"></i>
                        <h2 style="color: #3b82f6; margin: 0; font-size: 1.5rem;">
                            ${dateKey === 'Sem data' ? 'Questões sem data' : `Questões de ${dateKey}`}
                        </h2>
                        <span style="background: rgba(59, 130, 246, 0.2); color: #3b82f6; padding: 5px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">
                            ${dateQuestions.length} questão(ões)
                        </span>
                    </div>
                    <div class="questions-list">
                        ${dateQuestions.map(question => {
                            const isAnswered = answeredQuestionIds.has(question.id);
                            const answer = studentAnswers.find(a => a.question?.id === question.id);

                            return `
                                <div class="question-item ${isAnswered ? 'answered' : ''}" onclick="viewQuestion(${question.id})">
                                    <div class="question-title">
                                        <i class="fas fa-file-alt"></i> ${escapeHtml(question.title || 'Sem título')}
                                        ${question.hasHelp ? `
                                            <button 
                                                class="help-btn" 
                                                onclick="event.stopPropagation(); toggleHelp(${question.id})"
                                                title="Ver ajuda em português"
                                            >
                                                <i class="fas fa-question-circle"></i> Ajuda
                                            </button>
                                        ` : ''}
                                    </div>
                                    ${question.hasHelp ? `
                                        <div id="help-${question.id}" class="help-translation" style="display: none; margin: 10px 0; padding: 15px; background: rgba(251, 191, 36, 0.1); border-left: 4px solid #fbbf24; border-radius: 8px;">
                                            <strong style="color: #fbbf24;">
                                                <i class="fas fa-language"></i> Ajuda em Português:
                                            </strong>
                                            <p style="margin-top: 10px; color: #f8fafc; white-space: pre-wrap;">${escapeHtml(question.portugueseTranslation || '')}</p>
                                        </div>
                                    ` : ''}
                                    ${question.expiresAt ? `
                                        <div style="margin: 10px 0; padding: 10px 12px; background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; border-radius: 6px; display: flex; align-items: center; gap: 8px; font-size: 0.9rem;">
                                            <i class="fas fa-calendar-times" style="color: #3b82f6;"></i>
                                            <strong style="color: #3b82f6;">Expira em:</strong>
                                            <span style="color: #f8fafc;">
                                                ${new Date(question.expiresAt).toLocaleDateString('pt-BR', { 
                                                    day: '2-digit', 
                                                    month: '2-digit', 
                                                    year: 'numeric', 
                                                    hour: '2-digit', 
                                                    minute: '2-digit' 
                                                })}
                                            </span>
                                        </div>
                                    ` : ''}
                                    <div style="margin: 10px 0; color: #94a3b8;">
                                        ${escapeHtml(question.description?.substring(0, 150) || 'Sem descrição')}${question.description?.length > 150 ? '...' : ''}
                                    </div>
                                    <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                                        <span class="status-badge ${isAnswered ? 'status-answered' : 'status-pending'}">
                                            ${isAnswered ? '<i class="fas fa-check"></i> Respondida' : '<i class="fas fa-clock"></i> Pendente'}
                                        </span>
                                        ${answer && answer.corrections && answer.corrections.length > 0 ? `
                                            <span style="color: #10b981; font-weight: 600;">
                                                Nota: ${formatGrade(answer.corrections[0].grade)}
                                            </span>
                                        ` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar questões:', error);
        questionsView.innerHTML = `
            <div class="question-card">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao carregar questões</h3>
                    <p>${error.message}</p>
                </div>
            </div>
        `;
    }
}

// Carregar questões perdidas (não respondidas e expiradas)
async function loadLostQuestions() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const questionsView = document.getElementById('questions-view');

    try {
        questionsView.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando questões perdidas...</div>';

        // Carregar todas as questões
        const questionsResponse = await fetch(`${API}/questions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!questionsResponse.ok) {
            throw new Error('Erro ao carregar questões');
        }

        const questions = await questionsResponse.json();

        // Carregar respostas do aluno
        let studentAnswers = [];
        if (user.id) {
            try {
                const allAnswers = await fetch(`${API}/answers`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }).then(r => r.ok ? r.json() : []);

                studentAnswers = allAnswers.filter(a => a.student?.id === user.id);
            } catch (error) {
                console.error('Erro ao carregar respostas:', error);
            }
        }

        const answeredQuestionIds = new Set(studentAnswers.map(a => a.question?.id).filter(Boolean));
        const now = new Date();

        // Filtrar questões perdidas (não respondidas e expiradas)
        const lostQuestions = questions.filter(question => {
            const isAnswered = answeredQuestionIds.has(question.id);
            const isExpired = question.expiresAt && new Date(question.expiresAt) < now;
            return !isAnswered && isExpired;
        });

        if (lostQuestions.length === 0) {
            questionsView.innerHTML = `
                <div class="question-card">
                    <div class="empty-state">
                        <i class="fas fa-check-circle" style="color: #10b981;"></i>
                        <h3>Nenhuma questão perdida!</h3>
                        <p>Parabéns! Você respondeu todas as questões antes de expirarem.</p>
                    </div>
                </div>
            `;
            return;
        }

        // Agrupar por data
        const questionsByDate = {};
        lostQuestions.forEach(question => {
            if (question.expiresAt) {
                const date = new Date(question.expiresAt);
                const dateKey = date.toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric' 
                });
                
                if (!questionsByDate[dateKey]) {
                    questionsByDate[dateKey] = [];
                }
                questionsByDate[dateKey].push(question);
            }
        });

        const sortedDates = Object.keys(questionsByDate).sort((a, b) => {
            return new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-'));
        });

        questionsView.innerHTML = `
            <div style="margin-bottom: 30px; padding: 20px; background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 8px;">
                <h3 style="color: #ef4444; margin: 0 0 10px 0;">
                    <i class="fas fa-exclamation-triangle"></i> Questões Perdidas
                </h3>
                <p style="color: #f8fafc; margin: 0;">
                    Estas são questões que expiraram antes de você respondê-las. Você não pode mais respondê-las.
                </p>
            </div>
            ${sortedDates.map(dateKey => {
                const dateQuestions = questionsByDate[dateKey];
                
                return `
                    <div style="margin-bottom: 40px;">
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid rgba(239, 68, 68, 0.3);">
                            <i class="fas fa-calendar-times" style="font-size: 1.5rem; color: #ef4444;"></i>
                            <h2 style="color: #ef4444; margin: 0; font-size: 1.5rem;">
                                Questões expiradas em ${dateKey}
                            </h2>
                            <span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 5px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">
                                ${dateQuestions.length} questão(ões)
                            </span>
                        </div>
                        <div class="questions-list">
                            ${dateQuestions.map(question => `
                                <div class="question-item" style="opacity: 0.7; cursor: not-allowed; border-color: #ef4444;">
                                    <div class="question-title" style="color: #ef4444;">
                                        <i class="fas fa-ban"></i> ${escapeHtml(question.title || 'Sem título')}
                                    </div>
                                    <div style="margin: 10px 0; padding: 10px 12px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 6px; font-size: 0.9rem; color: #fca5a5;">
                                        <i class="fas fa-calendar-times"></i> 
                                        <strong>Expirada em:</strong> 
                                        ${new Date(question.expiresAt).toLocaleDateString('pt-BR', { 
                                            day: '2-digit', 
                                            month: '2-digit', 
                                            year: 'numeric', 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        })}
                                    </div>
                                    <div style="margin: 10px 0; color: #94a3b8;">
                                        ${escapeHtml(question.description?.substring(0, 150) || 'Sem descrição')}${question.description?.length > 150 ? '...' : ''}
                                    </div>
                                    <div style="margin-top: 15px;">
                                        <span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
                                            <i class="fas fa-ban"></i> Não Respondida
                                        </span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        `;

    } catch (error) {
        console.error('Erro ao carregar questões perdidas:', error);
        questionsView.innerHTML = `
            <div class="question-card">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao carregar questões perdidas</h3>
                    <p>${error.message}</p>
                </div>
            </div>
        `;
    }
}

// Carregar questão específica
async function loadQuestion(questionId) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const questionsView = document.getElementById('questions-view');

    try {
        questionsView.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

        // Carregar questão
        const questionResponse = await fetch(`${API}/questions/${questionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!questionResponse.ok) {
            throw new Error('Erro ao carregar questão');
        }

        let question;
        try {
            const responseText = await questionResponse.text();
            question = JSON.parse(responseText);
        } catch (jsonError) {
            console.error('Erro ao parsear JSON:', jsonError);
            console.error('Resposta recebida:', await questionResponse.text());
            throw new Error('Erro ao processar resposta do servidor. Formato JSON inválido.');
        }

        // Carregar resposta existente do aluno
        let existingAnswer = null;
        let corrections = [];

        if (user.id) {
            try {
                const allAnswers = await fetch(`${API}/answers/question/${questionId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }).then(r => r.ok ? r.json() : []);

                existingAnswer = allAnswers.find(a => a.student?.id === user.id);

                if (existingAnswer) {
                    const correctionsResponse = await fetch(`${API}/corrections/answer/${existingAnswer.id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (correctionsResponse.ok) {
                        corrections = await correctionsResponse.json();
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar resposta:', error);
            }
        }

        const hasCorrection = corrections.length > 0;
        const correction = hasCorrection ? corrections[0] : null;

        questionsView.innerHTML = `
            <div class="question-card">
                <div class="question-header">
                    <div>
                        <div class="question-title">
                            ${escapeHtml(question.title || 'Sem título')}
                            ${question.hasHelp ? `
                                <button 
                                    class="help-btn" 
                                    onclick="toggleHelp(${question.id})"
                                    title="Ver ajuda em português"
                                >
                                    <i class="fas fa-question-circle"></i> Ajuda
                                </button>
                            ` : ''}
                        </div>
                        <span class="question-type">${question.type || 'TEXT'}</span>
                    </div>
                </div>

                ${(() => {
                    const now = new Date();
                    const expiresAt = question.expiresAt ? new Date(question.expiresAt) : null;
                    const isExpired = expiresAt && expiresAt < now;
                    
                    if (isExpired) {
                        return `
                            <div style="margin-bottom: 20px; padding: 12px 16px; background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 8px; display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                                <div>
                                    <strong style="color: #ef4444;">Questão Expirada</strong>
                                    <span style="color: #f8fafc; margin-left: 8px;">
                                        Esta questão expirou em ${expiresAt.toLocaleDateString('pt-BR', { 
                                            day: '2-digit', 
                                            month: '2-digit', 
                                            year: 'numeric', 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        })}
                                    </span>
                                    <span style="color: #fca5a5; font-size: 0.9rem; display: block; margin-top: 5px;">
                                        <i class="fas fa-ban"></i> 
                                        Você não pode mais responder esta questão.
                                    </span>
                                </div>
                            </div>
                        `;
                    } else if (expiresAt) {
                        return `
                            <div style="margin-bottom: 20px; padding: 12px 16px; background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; border-radius: 8px; display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-calendar-times" style="color: #3b82f6;"></i>
                                <div>
                                    <strong style="color: #3b82f6;">Data de Expiração:</strong>
                                    <span style="color: #f8fafc; margin-left: 8px;">
                                        ${expiresAt.toLocaleDateString('pt-BR', { 
                                            day: '2-digit', 
                                            month: '2-digit', 
                                            year: 'numeric', 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        })}
                                    </span>
                                    ${question.multipleChoice ? `
                                        <span style="color: #94a3b8; font-size: 0.9rem; display: block; margin-top: 5px;">
                                            <i class="fas fa-info-circle"></i> 
                                            Esta questão será corrigida automaticamente após esta data.
                                        </span>
                                    ` : `
                                        <span style="color: #94a3b8; font-size: 0.9rem; display: block; margin-top: 5px;">
                                            <i class="fas fa-info-circle"></i> 
                                            Após esta data, o professor poderá corrigir sua resposta.
                                        </span>
                                    `}
                                </div>
                            </div>
                        `;
                    }
                    return '';
                })()}

                ${question.hasHelp ? `
                    <div id="help-${question.id}" class="help-translation" style="display: none; margin-bottom: 20px; padding: 15px; background: rgba(251, 191, 36, 0.1); border-left: 4px solid #fbbf24; border-radius: 8px;">
                        <strong style="color: #fbbf24;">
                            <i class="fas fa-language"></i> Ajuda em Português:
                        </strong>
                        <p style="margin-top: 10px; color: #f8fafc; white-space: pre-wrap;">${escapeHtml(question.portugueseTranslation || '')}</p>
                    </div>
                ` : ''}

                <div style="margin: 20px 0; padding: 25px; background: rgba(15, 23, 42, 0.8); border-radius: 12px; border-left: 4px solid #3b82f6;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <i class="fas fa-question-circle" style="color: #3b82f6; font-size: 1.3rem;"></i>
                        <strong style="color: #3b82f6; font-size: 1.1rem;">Enunciado da Questão:</strong>
                    </div>
                    <div id="question-desc-${question.id}" style="line-height: 1.9; color: #f8fafc; white-space: pre-wrap; word-wrap: break-word; font-size: 1.05rem; padding: 15px; background: rgba(30, 41, 59, 0.5); border-radius: 8px;">
                        ${formatTextResponse(question.description || 'Sem descrição')}
                    </div>
                </div>

                ${question.imagePath && question.imagePath.trim() !== '' ? `
                    <img 
                        src="${API}${question.imagePath.startsWith('/') ? question.imagePath : '/' + question.imagePath}" 
                        alt="Questão" 
                        class="question-image"
                        onerror="this.style.display='none';"
                    >
                ` : ''}

                ${question.multipleChoice && question.options && question.options.length > 0 ? `
                    <div class="question-options" style="margin: 25px 0; padding: 20px; background: rgba(15, 23, 42, 0.8); border-radius: 12px; border: 2px solid rgba(59, 130, 246, 0.3);">
                        <h4 style="color: #3b82f6; margin-bottom: 15px; font-size: 1.1rem;">
                            <i class="fas fa-list-ul"></i> Opções de Resposta:
                        </h4>
                        <div class="options-list" style="display: flex; flex-direction: column; gap: 12px;">
                            ${question.options.map((option, index) => `
                                <div class="option-item" style="display: flex; align-items: center; gap: 12px; padding: 15px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; border: 2px solid rgba(255, 255, 255, 0.1);">
                                    <div style="width: 30px; height: 30px; border-radius: 50%; background: rgba(59, 130, 246, 0.2); display: flex; align-items: center; justify-content: center; color: #3b82f6; font-weight: 700; flex-shrink: 0;">
                                        ${String.fromCharCode(65 + index)}
                                    </div>
                                    <div style="flex: 1; color: #f8fafc; font-size: 1rem;">
                                        ${escapeHtml(option.text || '')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <p style="margin-top: 15px; color: #94a3b8; font-size: 0.9rem; font-style: italic;">
                            <i class="fas fa-info-circle"></i> Selecione a opção correta na sua resposta abaixo
                        </p>
                    </div>
                ` : ''}

                ${existingAnswer ? `
                    <div class="answer-status ${hasCorrection ? 'corrected' : 'submitted'}">
                        <i class="fas fa-${hasCorrection ? 'check-circle' : 'clock'}"></i>
                        <span>${hasCorrection ? 'Resposta corrigida pelo professor' : 'Resposta enviada - Aguardando correção'}</span>
                    </div>

                    ${hasCorrection ? `
                        <div style="margin: 20px 0; padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; border-left: 4px solid #10b981;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.2rem;"></i>
                                <strong style="color: #10b981; font-size: 1.1rem;">Correção do Professor:</strong>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: rgba(16, 185, 129, 0.2); border-radius: 8px; margin-bottom: 15px;">
                                <i class="fas fa-star" style="color: #fbbf24;"></i>
                                <strong style="color: #10b981;">Nota:</strong> 
                                <span style="color: #10b981; font-weight: 700; font-size: 1.2rem;">${formatGrade(correction.grade)}</span>
                            </div>
                            <div style="background: rgba(15, 23, 42, 0.6); padding: 20px; border-radius: 8px; line-height: 1.8; color: #f8fafc; white-space: pre-wrap; word-wrap: break-word; font-size: 1rem;">
                                ${formatTextResponse(correction.feedback || 'Sem feedback')}
                            </div>
                        </div>
                    ` : ''}

                    <div style="margin-top: 20px; padding: 20px; background: rgba(59, 130, 246, 0.1); border-radius: 12px; border-left: 4px solid #3b82f6;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                            <i class="fas fa-comment-dots" style="color: #3b82f6; font-size: 1.2rem;"></i>
                            <strong style="color: #3b82f6; font-size: 1.1rem;">Sua Resposta:</strong>
                        </div>
                        <div style="background: rgba(15, 23, 42, 0.6); padding: 20px; border-radius: 8px; line-height: 1.8; color: #f8fafc; white-space: pre-wrap; word-wrap: break-word; font-size: 1rem;">
                            ${formatTextResponse(existingAnswer.text || 'Sem resposta de texto')}
                        </div>
                        ${existingAnswer.imagePath && existingAnswer.imagePath.trim() !== '' ? `
                            <div style="margin-top: 15px;">
                                <img 
                                    src="${API}${existingAnswer.imagePath.startsWith('/') ? existingAnswer.imagePath : '/' + existingAnswer.imagePath}" 
                                    alt="Resposta" 
                                    style="max-width: 100%; border-radius: 8px; border: 2px solid rgba(59, 130, 246, 0.3);"
                                    onerror="this.style.display='none';"
                                >
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <div class="answer-form">
                        <h3 style="margin-bottom: 20px; color: #3b82f6;">
                            <i class="fas fa-edit"></i> Sua Resposta
                        </h3>

                        <form id="answer-form" onsubmit="submitAnswer(event, ${questionId})">
                            ${question.multipleChoice && question.options && question.options.length > 0 ? `
                                <div class="form-group">
                                    <label class="form-label">Selecione a opção correta *</label>
                                    <div class="options-radio-group" style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
                                        ${question.options.map((option, index) => `
                                            <label class="option-radio-label" style="display: flex; align-items: center; gap: 15px; padding: 15px; background: rgba(30, 41, 59, 0.5); border-radius: 8px; border: 2px solid rgba(255, 255, 255, 0.1); cursor: pointer; transition: all 0.3s ease;">
                                                <input 
                                                    type="radio" 
                                                    name="selected-option" 
                                                    value="${index}" 
                                                    required
                                                    style="width: 20px; height: 20px; cursor: pointer;"
                                                >
                                                <div style="width: 30px; height: 30px; border-radius: 50%; background: rgba(59, 130, 246, 0.2); display: flex; align-items: center; justify-content: center; color: #3b82f6; font-weight: 700; flex-shrink: 0;">
                                                    ${String.fromCharCode(65 + index)}
                                                </div>
                                                <span style="flex: 1; color: #f8fafc; font-size: 1rem;">${escapeHtml(option.text || '')}</span>
                                            </label>
                                        `).join('')}
                                    </div>
                                    <input type="hidden" id="answer-text" value="">
                                </div>
                            ` : `
                                <div class="form-group">
                                    <label class="form-label">Resposta *</label>
                                    <textarea 
                                        class="form-textarea" 
                                        id="answer-text" 
                                        placeholder="Digite sua resposta aqui..."
                                        required
                                    ></textarea>
                                </div>
                            `}

                            <div class="form-group">
                                <label class="form-label">Imagem (Opcional)</label>
                                <div class="file-upload">
                                    <input 
                                        type="file" 
                                        id="answer-image" 
                                        class="file-upload-input" 
                                        accept="image/*"
                                        onchange="previewImage(event)"
                                    >
                                    <label for="answer-image" class="file-upload-label">
                                        <i class="fas fa-image"></i>
                                        <span id="file-label">Escolher imagem</span>
                                    </label>
                                    <div class="file-preview" id="file-preview"></div>
                                </div>
                            </div>

                            ${(() => {
                                const now = new Date();
                                const expiresAt = question.expiresAt ? new Date(question.expiresAt) : null;
                                const isExpired = expiresAt && expiresAt < now;
                                
                                if (isExpired) {
                                    return `
                                        <button type="button" class="btn-submit" disabled style="opacity: 0.5; cursor: not-allowed;">
                                            <i class="fas fa-ban"></i> Questão Expirada
                                        </button>
                                    `;
                                }
                                return `
                                    <button type="submit" class="btn-submit" id="submit-btn">
                                        <i class="fas fa-paper-plane"></i> Enviar Resposta
                                    </button>
                                `;
                            })()}
                        </form>
                    </div>
                `}
            </div>
        `;

    } catch (error) {
        console.error('Erro ao carregar questão:', error);
        questionsView.innerHTML = `
            <div class="question-card">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao carregar questão</h3>
                    <p>${error.message}</p>
                </div>
            </div>
        `;
    }
}

// Enviar resposta
async function submitAnswer(event, questionId) {
    event.preventDefault();

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Verificar se é múltipla escolha
    const selectedOption = document.querySelector('input[name="selected-option"]:checked');
    let text = '';
    
    if (selectedOption) {
        // É múltipla escolha - pegar o texto da opção selecionada
        const optionIndex = parseInt(selectedOption.value);
        // Buscar a questão para pegar o texto da opção
        try {
            const questionResponse = await fetch(`${API}/questions/${questionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (questionResponse.ok) {
                const question = await questionResponse.json();
        
        // Debug: verificar se opções estão presentes
        console.log('🔍 DEBUG: Questão carregada:', {
            id: question.id,
            title: question.title,
            multipleChoice: question.multipleChoice,
            hasOptions: !!question.options,
            optionsCount: question.options ? question.options.length : 0,
            options: question.options
        });
                if (question.options && question.options[optionIndex]) {
                    const optionLetter = String.fromCharCode(65 + optionIndex); // A, B, C, D...
                    text = `${optionLetter}) ${question.options[optionIndex].text}`;
                } else {
                    text = `Opção ${optionIndex + 1} selecionada`;
                }
            }
        } catch (error) {
            console.error('Erro ao buscar questão:', error);
            text = `Opção ${optionIndex + 1} selecionada`;
        }
    } else {
        // É texto livre
        text = document.getElementById('answer-text').value.trim();
    }
    
    const imageFile = document.getElementById('answer-image')?.files[0];

    if (!text) {
        showMessage('Por favor, selecione uma opção ou digite sua resposta', 'error');
        return;
    }

    if (!user.id) {
        showMessage('Erro: Usuário não identificado. Faça login novamente.', 'error');
        return;
    }

    // Verificar se o usuário é realmente um estudante
    if (user.role !== 'STUDENT') {
        showMessage('Erro: Você precisa estar logado como estudante para responder questões. Faça login como estudante.', 'error');
        setTimeout(() => {
            window.location.href = '/page/login.html';
        }, 2000);
        return;
    }

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
        console.log('🔍 DEBUG Frontend: Enviando resposta', {
            questionId,
            userFromStorage: user,
            studentIdFromUser: user.id,
            userRole: user.role,
            userType: typeof user.id
        });
        
        const formData = new FormData();
        formData.append('text', text);
        formData.append('questionId', questionId);
        formData.append('studentId', user.id);

        if (imageFile) {
            formData.append('imageFile', imageFile);
        }

        const response = await fetch(`${API}/answers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Erro HTTP: ${response.status}`);
        }

        const answer = await response.json();
        showMessage('Resposta enviada com sucesso!', 'success');

        // Recarregar questão
        setTimeout(() => {
            loadQuestion(questionId);
        }, 1000);

    } catch (error) {
        console.error('Erro ao enviar resposta:', error);
        showMessage('Erro ao enviar resposta: ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Resposta';
    }
}

// Preview de imagem
function previewImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('file-preview');
    const label = document.getElementById('file-label');

    if (file) {
        label.textContent = file.name;
        preview.style.display = 'block';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
        label.textContent = 'Escolher imagem';
    }
}

// Ver questão
function viewQuestion(questionId) {
    window.location.href = `/page/student-questions.html?questionId=${questionId}`;
}

// Funções auxiliares
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

// Toggle ajuda
function toggleHelp(questionId) {
    const helpDiv = document.getElementById(`help-${questionId}`);
    if (helpDiv) {
        helpDiv.style.display = helpDiv.style.display === 'none' ? 'block' : 'none';
    }
}

// Função para formatar nota do enum para exibição (A_PLUS -> A+, B_PLUS -> B+, etc)
function formatGrade(grade) {
    if (!grade) return 'N/A';
    
    // Se já estiver no formato correto (A+, B+, etc), retorna direto
    if (typeof grade === 'string' && (grade.includes('+') || grade.includes('-') || (grade.length === 1 && /[A-F]/.test(grade)))) {
        return grade;
    }
    
    // Mapear valores do enum para formato de exibição
    const gradeMap = {
        'A_PLUS': 'A+',
        'A': 'A',
        'A_MINUS': 'A-',
        'B_PLUS': 'B+',
        'B': 'B',
        'B_MINUS': 'B-',
        'C_PLUS': 'C+',
        'C': 'C',
        'C_MINUS': 'C-',
        'D_PLUS': 'D+',
        'D': 'D',
        'F': 'F'
    };
    
    return gradeMap[grade] || grade;
}

// Função para formatar texto preservando quebras de linha, espaços e tópicos
function formatTextResponse(text) {
    if (!text) return 'Sem resposta de texto';
    
    // Escapar HTML para segurança
    let formatted = escapeHtml(text);
    
    // Preservar quebras de linha múltiplas
    formatted = formatted.replace(/\n\n+/g, '\n\n');
    
    // Converter listas simples (linhas começando com -, *, ou números)
    formatted = formatted.replace(/^(\s*)([-*•])\s+(.+)$/gm, '<div style="margin: 8px 0; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: #3b82f6;">•</span> $3</div>');
    
    // Converter listas numeradas
    formatted = formatted.replace(/^(\s*)(\d+[.)])\s+(.+)$/gm, '<div style="margin: 8px 0; padding-left: 25px; position: relative;"><span style="position: absolute; left: 0; color: #3b82f6; font-weight: 600;">$2</span> $3</div>');
    
    // Converter quebras de linha simples em <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

// Exportar funções globais
window.submitAnswer = submitAnswer;
window.previewImage = previewImage;
window.viewQuestion = viewQuestion;
window.toggleHelp = toggleHelp;

