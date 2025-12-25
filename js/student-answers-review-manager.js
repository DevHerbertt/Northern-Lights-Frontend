// Declarar API global apenas uma vez
if (typeof window.API === 'undefined') {
    window.API = 'http://localhost:8080';
}
// Usar window.API diretamente através de uma função para evitar conflito de escopo
const API = (function() { return window.API; })();

// Função para alternar entre tabs - definir ANTES do DOMContentLoaded para estar disponível no onclick
function switchTab(tabName) {
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
    const selectedTab = document.getElementById(`${tabName}-tab`);
    const selectedBtn = document.getElementById(`${tabName}-tab-btn`);
    
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.style.display = 'block';
    }
    
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
        // Carregar dados se necessário
        if (tabName === 'weekly-grade') {
            loadWeeklyGrade();
        } else if (tabName === 'exam-grade') {
            loadExamGrades();
        } else if (tabName === 'answers') {
            loadMyAnswers();
        }
}

// Tornar funções globais imediatamente para uso em onclick
window.switchTab = switchTab;
window.loadExamGrades = loadExamGrades;

    // Inicialização
    document.addEventListener('DOMContentLoaded', async () => {
        await loadMyAnswers();
        await loadWeeklyGrade();
        await loadExamGrades();
        setupEventListeners();
    });

function setupEventListeners() {
    const refreshBtn = document.getElementById('refresh-btn');
    const logoutBtn = document.getElementById('logout-btn');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                const activeTab = document.querySelector('.tab-content.active');
                if (activeTab && activeTab.id === 'weekly-grade-tab') {
                    await loadWeeklyGrade();
                } else if (activeTab && activeTab.id === 'exam-grade-tab') {
                    await loadExamGrades();
                } else {
                    await loadMyAnswers();
                }
            });
        }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (authService) {
                authService.logout();
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/page/login.html';
            }
        });
    }
}

// Carregar nota da semana
async function loadWeeklyGrade() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const weeklyGradeView = document.getElementById('weekly-grade-view');

    if (!token || !user || !user.id) {
        weeklyGradeView.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 20px;"></i>
                <p>Erro ao carregar nota. Por favor, faça login novamente.</p>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(`${API}/weekly-grades/student/${user.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar notas semanais');
        }

        const weeklyGrades = await response.json();
        
        if (weeklyGrades.length === 0) {
            weeklyGradeView.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #94a3b8;">
                    <i class="fas fa-star" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;"></i>
                    <h2 style="color: #f8fafc; margin-bottom: 10px;">Nenhuma nota disponível ainda</h2>
                    <p>Seu professor ainda não atribuiu notas semanais. Continue estudando!</p>
                </div>
            `;
            return;
        }

        // Mostrar a nota mais recente (primeira da lista)
        const latestGrade = weeklyGrades[0];
        
        // Formatar nota no formato X/Y (A+)
        let gradeDisplay;
        if (latestGrade.pointsObtained != null && latestGrade.totalPoints != null) {
            gradeDisplay = `${latestGrade.pointsObtained}/${latestGrade.totalPoints} (${formatGradeDisplay(latestGrade.grade)})`;
        } else {
            gradeDisplay = formatGradeDisplay(latestGrade.grade);
        }
        
        const weekInfo = formatWeekInfo(latestGrade.weekStartDate);

        weeklyGradeView.innerHTML = `
            <div class="weekly-grade-card">
                <div class="grade-display">
                    <p style="margin: 0; color: #94a3b8; font-size: 1rem; text-transform: uppercase; letter-spacing: 1px;">Nota da Semana</p>
                    <div class="grade-value">${gradeDisplay}</div>
                </div>
                
                <div class="week-info">
                    <p style="margin: 0;"><strong><i class="fas fa-calendar"></i> Semana:</strong> ${weekInfo}</p>
                    <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: rgba(255, 255, 255, 0.7);">
                        <i class="fas fa-clock"></i> Recebida em: ${formatDate(latestGrade.createdAt)}
                    </p>
                </div>
                
                ${latestGrade.feedback ? `
                    <div class="feedback-box">
                        <h3 style="margin-top: 0; color: #8b5cf6;"><i class="fas fa-comment"></i> Feedback do Professor:</h3>
                        <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(latestGrade.feedback)}</p>
                    </div>
                ` : ''}
                
                ${weeklyGrades.length > 1 ? `
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                        <h3 style="color: #f8fafc; margin-bottom: 15px;"><i class="fas fa-history"></i> Histórico de Notas</h3>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${weeklyGrades.slice(1).map(grade => `
                                <div style="background: rgba(30, 41, 59, 0.5); padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <strong style="color: #f8fafc;">${formatWeekInfo(grade.weekStartDate)}</strong>
                                        <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #94a3b8;">${formatDate(grade.createdAt)}</p>
                                    </div>
                                    <div style="font-size: 1.5rem; font-weight: 700; color: #14b8a6;">
                                        ${grade.pointsObtained != null && grade.totalPoints != null ? 
                                            `${grade.pointsObtained}/${grade.totalPoints} (${formatGradeDisplay(grade.grade)})` : 
                                            formatGradeDisplay(grade.grade)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

    } catch (error) {
        console.error('Erro ao carregar nota da semana:', error);
        weeklyGradeView.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i>
                <p>Erro ao carregar nota da semana. Por favor, tente novamente.</p>
            </div>
        `;
    }
}

function formatGradeDisplay(grade) {
    if (!grade) return 'N/A';
    return grade.replace('_PLUS', '+').replace('_MINUS', '-');
}

function formatWeekInfo(weekStartDate) {
    if (!weekStartDate) return 'Data não informada';
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };
    
    return `${formatDate(start)} a ${formatDate(end)}`;
}

function formatDate(dateString) {
    if (!dateString) return 'Data não informada';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

// Carregar notas de prova do aluno
async function loadExamGrades() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const examGradeView = document.getElementById('exam-grade-view');

    if (!token || !user || !user.id) {
        if (examGradeView) {
            examGradeView.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-exclamation-circle" style="font-size: 3rem; margin-bottom: 20px;"></i>
                    <p>Erro ao carregar notas. Por favor, faça login novamente.</p>
                </div>
            `;
        }
        return;
    }

    if (!examGradeView) return;

    try {
        const response = await fetch(`${API}/exam-grades/student/${user.id}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao buscar notas de prova');
        }

        const examGrades = await response.json();
        
        if (examGrades.length === 0) {
            examGradeView.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #94a3b8;">
                    <i class="fas fa-book" style="font-size: 4rem; margin-bottom: 20px; opacity: 0.3;"></i>
                    <h2 style="color: #f8fafc; margin-bottom: 10px;">Nenhuma nota de prova disponível ainda</h2>
                    <p>Seu professor ainda não atribuiu notas de prova. Continue estudando!</p>
                </div>
            `;
            return;
        }

        // Mostrar a nota mais recente (primeira da lista)
        const latestGrade = examGrades[0];
        
        // Formatar nota no formato X/Y (A+)
        let gradeDisplay;
        if (latestGrade.pointsObtained != null && latestGrade.totalPoints != null) {
            gradeDisplay = `${latestGrade.pointsObtained}/${latestGrade.totalPoints} (${formatGradeDisplay(latestGrade.grade)})`;
        } else {
            gradeDisplay = formatGradeDisplay(latestGrade.grade);
        }

        examGradeView.innerHTML = `
            <div class="weekly-grade-card">
                <div class="grade-display">
                    <p style="margin: 0; color: #94a3b8; font-size: 1rem; text-transform: uppercase; letter-spacing: 1px;">Nota da Prova</p>
                    <div class="grade-value">${gradeDisplay}</div>
                </div>
                
                <div class="week-info">
                    <p style="margin: 0;"><strong><i class="fas fa-calendar"></i> Data:</strong> ${formatDate(latestGrade.createdAt)}</p>
                    ${latestGrade.exam && latestGrade.exam.title ? `
                        <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: rgba(255, 255, 255, 0.7);">
                            <i class="fas fa-book"></i> Prova: ${escapeHtml(latestGrade.exam.title)}
                        </p>
                    ` : '<p style="margin: 5px 0 0 0; font-size: 0.9rem; color: rgba(255, 255, 255, 0.7);"><i class="fas fa-book"></i> Prova Geral</p>'}
                </div>
                
                ${latestGrade.feedback ? `
                    <div class="feedback-box">
                        <h3 style="margin-top: 0; color: #8b5cf6;"><i class="fas fa-comment"></i> Feedback do Professor:</h3>
                        <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(latestGrade.feedback)}</p>
                    </div>
                ` : ''}
                
                ${examGrades.length > 1 ? `
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                        <h3 style="color: #f8fafc; margin-bottom: 15px;"><i class="fas fa-history"></i> Histórico de Notas de Prova</h3>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${examGrades.slice(1).map(grade => {
                                const histGradeDisplay = grade.pointsObtained != null && grade.totalPoints != null ? 
                                    `${grade.pointsObtained}/${grade.totalPoints} (${formatGradeDisplay(grade.grade)})` : 
                                    formatGradeDisplay(grade.grade);
                                return `
                                    <div style="background: rgba(30, 41, 59, 0.5); padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <strong style="color: #f8fafc;">${formatDate(grade.createdAt)}</strong>
                                            ${grade.exam && grade.exam.title ? `
                                                <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #94a3b8;">${escapeHtml(grade.exam.title)}</p>
                                            ` : '<p style="margin: 5px 0 0 0; font-size: 0.9rem; color: #94a3b8;">Prova Geral</p>'}
                                        </div>
                                        <div style="font-size: 1.5rem; font-weight: 700; color: #3b82f6;">
                                            ${histGradeDisplay}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

    } catch (error) {
        console.error('Erro ao carregar notas de prova:', error);
        if (examGradeView) {
            examGradeView.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #ef4444;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i>
                    <p>Erro ao carregar notas de prova. Por favor, tente novamente.</p>
                </div>
            `;
        }
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Carregar respostas do aluno agrupadas por dia
async function loadMyAnswers() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const answersView = document.getElementById('answers-view');

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
        answersView.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

        const response = await fetch(`${API}/answers/my-answers`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro ao carregar respostas:', response.status, errorText);
            throw new Error(`Erro ao carregar respostas: ${response.status}`);
        }

        const answers = await response.json();
        console.log('🔍 DEBUG: Respostas carregadas:', answers.length, answers);

        if (answers.length === 0) {
            answersView.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>Nenhuma resposta encontrada</h3>
                    <p>Você ainda não respondeu nenhuma questão</p>
                </div>
            `;
            return;
        }

        // Carregar correções para cada resposta
        const answersWithCorrections = await Promise.all(
            answers.map(async (answer) => {
                try {
                    const correctionsResponse = await fetch(`${API}/corrections/answer/${answer.id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    const corrections = correctionsResponse.ok ? await correctionsResponse.json() : [];
                    return { ...answer, correction: corrections.length > 0 ? corrections[0] : null };
                } catch (error) {
                    console.error('Erro ao carregar correção:', error);
                    return { ...answer, correction: null };
                }
            })
        );

        // Agrupar por dia
        const answersByDate = {};
        answersWithCorrections.forEach(answer => {
            // Usar createdAt da resposta ou createdAt da questão como fallback
            let answerDate = null;
            if (answer.createdAt) {
                answerDate = new Date(answer.createdAt);
            } else if (answer.question && answer.question.createdAt) {
                answerDate = new Date(answer.question.createdAt);
            } else {
                // Se não tiver data, usar data atual (não ideal, mas evita erro)
                answerDate = new Date();
            }
            
            const dateKey = answerDate.toLocaleDateString('pt-BR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            const dateKeyForSort = answerDate.toISOString().split('T')[0]; // Para ordenação

            if (!answersByDate[dateKeyForSort]) {
                answersByDate[dateKeyForSort] = {
                    displayDate: dateKey,
                    answers: []
                };
            }
            answersByDate[dateKeyForSort].answers.push(answer);
        });

        // Ordenar por data (mais recente primeiro)
        const sortedDates = Object.keys(answersByDate).sort().reverse();

        // Renderizar
        let html = '';
        sortedDates.forEach(dateKey => {
            const dateGroup = answersByDate[dateKey];
            const answers = dateGroup.answers;

            // Calcular estatísticas do dia
            const total = answers.length;
            const corrected = answers.filter(a => a.correction).length;
            const correct = answers.filter(a => a.correction && isCorrectAnswer(a.correction)).length;
            const incorrect = corrected - correct;
            const pending = total - corrected;

            html += `
                <div class="answers-by-date">
                    <div class="date-header">
                        <h2>
                            <i class="fas fa-calendar-day"></i> ${dateGroup.displayDate}
                        </h2>
                        <div class="date-stats">
                            <div class="stat-item">
                                <i class="fas fa-check-circle" style="color: #10b981;"></i>
                                <span>${correct} Corretas</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-times-circle" style="color: #ef4444;"></i>
                                <span>${incorrect} Incorretas</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-clock" style="color: #fbbf24;"></i>
                                <span>${pending} Pendentes</span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-list"></i>
                                <span>${total} Total</span>
                            </div>
                        </div>
                    </div>

                    ${answers.map(answer => renderAnswer(answer)).join('')}
                </div>
            `;
        });

        answersView.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar respostas:', error);
        answersView.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar respostas</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function renderAnswer(answer) {
    const hasCorrection = answer.correction != null;
    const isMultipleChoice = answer.question?.multipleChoice || false;
    const expiresAt = answer.question?.expiresAt;
    const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
    
    // Determinar status
    let statusClass, statusText, statusIcon;
    
    if (hasCorrection) {
        const isCorrect = isCorrectAnswer(answer.correction);
        console.log('🔍 DEBUG: Resposta ID', answer.id, '- Grade:', answer.correction.grade, '- isCorrect:', isCorrect);
        statusClass = isCorrect ? 'correct' : 'incorrect';
        statusText = isCorrect ? 'Correta' : 'Incorreta';
        statusIcon = isCorrect ? 'fa-check-circle' : 'fa-times-circle';
    } else if (isMultipleChoice && isExpired) {
        // Múltipla escolha expirada mas ainda não corrigida (pode estar processando)
        statusClass = 'pending';
        statusText = 'Aguardando Correção Automática';
        statusIcon = 'fa-clock';
    } else if (isMultipleChoice && !isExpired && expiresAt) {
        // Múltipla escolha ainda não expirada
        statusClass = 'pending';
        statusText = 'Aguardando Expiração';
        statusIcon = 'fa-hourglass-half';
    } else {
        // Questão de texto aguardando correção manual
        statusClass = 'pending';
        statusText = 'Aguardando Correção do Professor';
        statusIcon = 'fa-user-edit';
    }

    return `
        <div class="answer-item ${statusClass}">
            <div class="answer-header">
                <h3 class="answer-title">${escapeHtml(answer.question?.title || 'Questão sem título')}</h3>
                <div class="answer-status ${statusClass}">
                    <i class="fas ${statusIcon}"></i>
                    <span>${statusText}</span>
                </div>
            </div>

            <div class="question-info">
                <i class="fas fa-question-circle"></i>
                ${escapeHtml(answer.question?.description || 'Sem descrição')}
            </div>

            <div class="answer-text">
                <strong>Sua Resposta:</strong><br>
                ${escapeHtml(answer.text || 'Sem resposta')}
            </div>

            ${answer.imagePath ? `
                <img 
                    src="${API}${answer.imagePath.startsWith('/') ? answer.imagePath : '/' + answer.imagePath}" 
                    alt="Resposta" 
                    style="max-width: 100%; border-radius: 8px; margin-top: 10px;"
                    onerror="this.style.display='none';"
                >
            ` : ''}

            ${hasCorrection ? `
                <div class="correction-info">
                    <div class="correction-grade">
                        <i class="fas fa-star"></i> Nota: ${formatGrade(answer.correction.grade)}
                    </div>
                    <div class="correction-feedback">
                        <strong>${isMultipleChoice ? 'Correção Automática' : 'Correção do Professor'}:</strong><br>
                        ${escapeHtml(answer.correction.feedback || 'Sem feedback')}
                    </div>
                </div>
            ` : `
                <div class="no-correction">
                    ${isMultipleChoice && !isExpired && expiresAt ? `
                        <i class="fas fa-hourglass-half"></i> 
                        <strong>Aguardando Expiração:</strong> Esta questão de múltipla escolha será corrigida automaticamente após ${new Date(expiresAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.
                    ` : isMultipleChoice && isExpired ? `
                        <i class="fas fa-clock"></i> 
                        <strong>Aguardando Correção Automática:</strong> A questão expirou e está sendo processada. A correção aparecerá em breve.
                    ` : `
                        <i class="fas fa-user-edit"></i> 
                        <strong>Aguardando Correção Manual:</strong> Questões de texto/escrita só aparecerão aqui após serem corrigidas pelo professor.
                    `}
                </div>
            `}
        </div>
    `;
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

function isCorrectAnswer(correction) {
    if (!correction || !correction.grade) {
        console.log('🔍 DEBUG isCorrectAnswer: Sem correção ou nota');
        return false;
    }
    
    // Para múltipla escolha: A, A+, A- são corretas, F é incorreta
    // O sistema atribui Grade.A para corretas e Grade.F para incorretas
    const grade = correction.grade;
    console.log('🔍 DEBUG isCorrectAnswer: Grade recebida:', grade);
    
    // Se for nota F, definitivamente incorreta
    if (grade === 'F') {
        console.log('🔍 DEBUG isCorrectAnswer: Nota F - Retornando FALSE (incorreta)');
        return false;
    }
    
    // Se for nota A (ou A+, A-), definitivamente correta
    if (grade === 'A' || grade === 'A_PLUS' || grade === 'A_MINUS') {
        console.log('🔍 DEBUG isCorrectAnswer: Nota A/A+/A- - Retornando TRUE (correta)');
        return true;
    }
    
    // Para outras notas, considerar baseado no contexto
    // Mas para múltipla escolha automática, apenas A e F são usados
    // Então qualquer coisa que não seja F é considerada correta
    const result = grade !== 'F';
    console.log('🔍 DEBUG isCorrectAnswer: Outra nota - Retornando', result);
    return result;
}

function getInitials(name) {
    if (!name) return 'AL';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function showMessage(message, type = 'info') {
    const container = document.getElementById('message-container');
    if (!container) return;

    const alertClass = type === 'error' ? 'alert-danger' : 
                      type === 'success' ? 'alert-success' : 'alert-info';
    
    container.innerHTML = `
        <div class="alert ${alertClass}" style="margin: 20px 0;">
            ${message}
        </div>
    `;

    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

