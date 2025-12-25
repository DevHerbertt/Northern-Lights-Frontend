// corrections-manager.js
(function() {
'use strict';

// Declarar API global apenas uma vez
if (typeof window.API === 'undefined') {
    window.API = "http://localhost:8080";
}
// Usar window.API diretamente
const API = window.API;
let selectedQuestionId = null;
let selectedAnswerId = null;

// Carregar questões ao iniciar
document.addEventListener('DOMContentLoaded', async () => {
    await loadQuestions();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    const refreshBtn = document.getElementById('refresh-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await loadQuestions();
            if (selectedQuestionId) {
                await loadAnswersForQuestion(selectedQuestionId);
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
async function loadQuestions() {
    const token = localStorage.getItem('token');
    const questionsList = document.getElementById('questions-list');

    try {
        questionsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

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
        
        // Filtrar apenas questões de texto (não múltipla escolha)
        const textQuestions = questions.filter(q => 
            q.type === 'TEXT' || (!q.multipleChoice && q.type !== 'MULTIPLE_CHOICE')
        );
        
        if (textQuestions.length === 0) {
            questionsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>Nenhuma questão de texto encontrada</h3>
                    <p>Crie questões de texto primeiro para poder corrigi-las</p>
                </div>
            `;
            return;
        }

        // Agrupar questões por semana
        const questionsByWeek = groupQuestionsByWeek(textQuestions);
        
        // Renderizar questões agrupadas por semana
        questionsList.innerHTML = Object.keys(questionsByWeek)
            .sort((a, b) => new Date(b) - new Date(a)) // Mais recentes primeiro
            .map(weekStart => {
                const weekQuestions = questionsByWeek[weekStart];
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                
                return `
                    <div class="week-group" style="margin-bottom: 30px;">
                        <h3 style="color: #3b82f6; margin-bottom: 15px; padding: 10px; background: rgba(59, 130, 246, 0.1); border-radius: 8px;">
                            <i class="fas fa-calendar-week"></i> Semana: ${formatWeekRange(weekStart, weekEnd)}
                        </h3>
                        ${weekQuestions.map(q => `
                            <div class="question-card" data-question-id="${q.id}" onclick="selectQuestion(${q.id})">
                                <div class="question-header">
                                    <div class="question-title">${escapeHtml(q.title || 'Sem título')}</div>
                                    <span class="question-type">${q.type || 'TEXT'}</span>
                                </div>
                                <div class="question-description">
                                    ${escapeHtml(q.description || 'Sem descrição')}
                                </div>
                                ${q.imagePath && q.imagePath.trim() !== '' ? `
                                    <img 
                                        src="${API}${q.imagePath.startsWith('/') ? q.imagePath : '/' + q.imagePath}" 
                                        alt="Questão" 
                                        class="question-image"
                                        onerror="this.style.display='none';"
                                    >
                                ` : ''}
                                <div style="margin-top: 10px; font-size: 0.9rem; color: #94a3b8;">
                                    <i class="fas fa-calendar"></i> Criada em: ${formatDate(q.createdAt)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }).join('');

    } catch (error) {
        console.error('Erro ao carregar questões:', error);
        questionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar questões</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Selecionar questão
async function selectQuestion(questionId) {
    selectedQuestionId = questionId;
    
    // Atualizar UI
    document.querySelectorAll('.question-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`[data-question-id="${questionId}"]`)?.classList.add('active');

    // Carregar respostas
    await loadAnswersForQuestion(questionId);
}

// Carregar respostas de uma questão
async function loadAnswersForQuestion(questionId) {
    const token = localStorage.getItem('token');
    const answersList = document.getElementById('answers-list');

    try {
        answersList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando respostas...</div>';

        const response = await fetch(`${API}/answers/question/${questionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const answers = await response.json();

        if (answers.length === 0) {
            answersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment-slash"></i>
                    <h3>Nenhuma resposta ainda</h3>
                    <p>Os alunos ainda não responderam esta questão</p>
                </div>
            `;
            return;
        }

        // Carregar correções existentes
        const correctionsMap = await loadCorrectionsForAnswers(answers.map(a => a.id));

        answersList.innerHTML = answers.map(answer => {
            const correction = correctionsMap[answer.id];
            const isCorrected = !!correction;

            return `
                <div class="answer-card ${isCorrected ? 'active' : ''}" data-answer-id="${answer.id}">
                    <div class="answer-student">
                        <div class="student-avatar">
                            ${getInitials(answer.student?.userName || 'Aluno')}
                        </div>
                        <div>
                            <div style="font-weight: 600;">${escapeHtml(answer.student?.userName || 'Aluno Desconhecido')}</div>
                            <div style="font-size: 0.85rem; color: #94a3b8;">${answer.student?.email || ''}</div>
                        </div>
                        <div style="margin-left: auto;">
                            <span class="status-badge ${isCorrected ? 'status-corrected' : 'status-pending'}">
                                ${isCorrected ? '<i class="fas fa-check"></i> Corrigida' : '<i class="fas fa-clock"></i> Pendente'}
                            </span>
                        </div>
                    </div>
                    
                    <div style="margin: 15px 0; padding: 20px; background: rgba(59, 130, 246, 0.1); border-radius: 12px; border-left: 4px solid #3b82f6;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                            <i class="fas fa-comment-dots" style="color: #3b82f6; font-size: 1.2rem;"></i>
                            <strong style="color: #3b82f6; font-size: 1.1rem;">Resposta do Aluno:</strong>
                        </div>
                        <div style="background: rgba(15, 23, 42, 0.6); padding: 20px; border-radius: 8px; line-height: 1.8; color: #f8fafc; white-space: pre-wrap; word-wrap: break-word; font-size: 1rem;">
                            ${formatTextResponse(answer.text || 'Sem resposta de texto')}
                        </div>
                        ${answer.imagePath && answer.imagePath.trim() !== '' ? `
                            <div style="margin-top: 15px;">
                                <img 
                                    src="${API}${answer.imagePath.startsWith('/') ? answer.imagePath : '/' + answer.imagePath}" 
                                    alt="Resposta" 
                                    class="question-image" 
                                    style="max-width: 100%; border-radius: 8px; border: 2px solid rgba(59, 130, 246, 0.3);"
                                    onerror="this.style.display='none';"
                                >
                            </div>
                        ` : ''}
                    </div>

                    ${isCorrected ? `
                        <div style="margin: 15px 0; padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; border-left: 4px solid #10b981;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.2rem;"></i>
                                <strong style="color: #10b981; font-size: 1.1rem;">Correção Anterior:</strong>
                            </div>
                            <div style="background: rgba(15, 23, 42, 0.6); padding: 20px; border-radius: 8px; line-height: 1.8; color: #f8fafc; white-space: pre-wrap; word-wrap: break-word; font-size: 1rem; margin-bottom: 15px;">
                                ${formatTextResponse(correction.feedback || 'Sem feedback')}
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px; padding: 12px; background: rgba(16, 185, 129, 0.2); border-radius: 8px;">
                                <i class="fas fa-star" style="color: #fbbf24;"></i>
                                <strong style="color: #10b981;">Nota:</strong> 
                                <span style="color: #10b981; font-weight: 700; font-size: 1.2rem;">${formatGrade(correction.grade)}</span>
                            </div>
                        </div>
                    ` : ''}

                    <div class="correction-form" id="correction-form-${answer.id}">
                        <h3 style="margin-bottom: 15px; color: #10b981;">
                            <i class="fas fa-edit"></i> ${isCorrected ? 'Atualizar Correção' : 'Fazer Correção'}
                        </h3>
                        
                        <div class="form-group">
                            <label class="form-label">Nota (0-10)</label>
                            <input 
                                type="number" 
                                class="grade-input" 
                                id="grade-${answer.id}" 
                                min="0" 
                                max="10" 
                                step="0.1"
                                value="${correction?.grade ? gradeEnumToNumber(correction.grade) : ''}"
                                placeholder="0.0"
                            >
                        </div>

                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-comment-alt"></i> Feedback / Comentários
                                <span style="font-size: 0.85rem; color: #94a3b8; font-weight: normal; margin-left: 8px;">
                                    (Você pode usar quebras de linha, tópicos com "-" ou "*", e listas numeradas)
                                </span>
                            </label>
                            <textarea 
                                class="form-textarea" 
                                id="feedback-${answer.id}" 
                                placeholder="Digite seus comentários sobre a resposta do aluno...&#10;&#10;Exemplo:&#10;- Ponto positivo: ...&#10;- Ponto a melhorar: ...&#10;&#10;1. Primeiro item&#10;2. Segundo item"
                                rows="8"
                                style="line-height: 1.6; font-size: 1rem; padding: 15px;"
                            >${correction?.feedback || ''}</textarea>
                        </div>

                        <button 
                            class="btn-save-correction" 
                            onclick="saveCorrection(${answer.id}, ${questionId})"
                        >
                            <i class="fas fa-save"></i> ${isCorrected ? 'Atualizar Correção' : 'Salvar Correção'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar respostas:', error);
        answersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar respostas</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Carregar correções existentes
async function loadCorrectionsForAnswers(answerIds) {
    const token = localStorage.getItem('token');
    const correctionsMap = {};

    try {
        for (const answerId of answerIds) {
            const response = await fetch(`${API}/corrections/answer/${answerId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const corrections = await response.json();
                if (corrections.length > 0) {
                    // Pegar a correção mais recente
                    correctionsMap[answerId] = corrections[0];
                }
            }
        }
    } catch (error) {
        console.error('Erro ao carregar correções:', error);
    }

    return correctionsMap;
}

// Salvar correção
async function saveCorrection(answerId, questionId) {
    const token = localStorage.getItem('token');
    const gradeInput = document.getElementById(`grade-${answerId}`);
    const feedbackInput = document.getElementById(`feedback-${answerId}`);

    const gradeNumber = parseFloat(gradeInput.value);
    const feedback = feedbackInput.value.trim();

    if (isNaN(gradeNumber) || gradeNumber < 0 || gradeNumber > 10) {
        showMessage('Por favor, insira uma nota válida entre 0 e 10', 'error');
        return;
    }
    
    // Converter número para enum Grade
    const grade = numberToGradeEnum(gradeNumber);
    if (!grade) {
        showMessage('Erro ao converter nota para formato de avaliação', 'error');
        return;
    }

    if (!feedback) {
        showMessage('Por favor, adicione um feedback para o aluno', 'error');
        return;
    }

    try {
        // Verificar se já existe correção
        const existingResponse = await fetch(`${API}/corrections/answer/${answerId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        let correctionId = null;
        if (existingResponse.ok) {
            const existingCorrections = await existingResponse.json();
            if (existingCorrections.length > 0) {
                correctionId = existingCorrections[0].id;
            }
        }

        const correctionDTO = {
            answerId: answerId,
            grade: grade,
            feedback: feedback
        };

        let response;
        if (correctionId) {
            // Atualizar correção existente
            response = await fetch(`${API}/corrections/${correctionId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(correctionDTO)
            });
        } else {
            // Criar nova correção
            response = await fetch(`${API}/corrections`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(correctionDTO)
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Erro HTTP: ${response.status}`);
        }

        showMessage('Correção salva com sucesso!', 'success');
        
        // Recarregar respostas
        await loadAnswersForQuestion(questionId);

    } catch (error) {
        console.error('Erro ao salvar correção:', error);
        showMessage('Erro ao salvar correção: ' + error.message, 'error');
    }
}

// Funções auxiliares
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'Data não disponível';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Agrupar questões por semana
function groupQuestionsByWeek(questions) {
    const grouped = {};
    
    questions.forEach(question => {
        if (!question.createdAt) return;
        
        const questionDate = new Date(question.createdAt);
        const weekStart = getWeekStart(questionDate);
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!grouped[weekKey]) {
            grouped[weekKey] = [];
        }
        grouped[weekKey].push(question);
    });
    
    return grouped;
}

// Obter início da semana (domingo)
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Ajustar para domingo
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - day);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
}

// Formatar range da semana
function formatWeekRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
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

// Funções para alternar entre abas
function showGradesTab() {
    document.getElementById('grades-tab').style.display = 'block';
    document.getElementById('corrections-tab').style.display = 'none';
    document.getElementById('grades-tab-btn').style.display = 'none';
    document.getElementById('corrections-tab-btn').style.display = 'inline-block';
    loadStudentsGrades();
}

function showCorrectionsTab() {
    document.getElementById('grades-tab').style.display = 'none';
    document.getElementById('corrections-tab').style.display = 'grid';
    document.getElementById('grades-tab-btn').style.display = 'inline-block';
    document.getElementById('corrections-tab-btn').style.display = 'none';
}

// Carregar alunos para dar notas
async function loadStudentsGrades() {
    const token = localStorage.getItem('token');
    const studentsList = document.getElementById('students-grades-list');

    try {
        studentsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando alunos...</div>';

        // Buscar todos os alunos
        const studentsResponse = await fetch(`${API}/students`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!studentsResponse.ok) {
            throw new Error(`Erro HTTP: ${studentsResponse.status}`);
        }

        const students = await studentsResponse.json();

        // Buscar todas as respostas
        const answersResponse = await fetch(`${API}/answers`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!answersResponse.ok) {
            throw new Error(`Erro HTTP: ${answersResponse.status}`);
        }

        const allAnswers = await answersResponse.json();

        // Buscar todas as questões
        const questionsResponse = await fetch(`${API}/questions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!questionsResponse.ok) {
            throw new Error(`Erro HTTP: ${questionsResponse.status}`);
        }

        const allQuestions = await questionsResponse.json();

        // Buscar todas as correções
        const correctionsResponse = await fetch(`${API}/corrections`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        let allCorrections = [];
        if (correctionsResponse.ok) {
            allCorrections = await correctionsResponse.json();
        }

        if (students.length === 0) {
            studentsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-graduate"></i>
                    <h3>Nenhum aluno encontrado</h3>
                    <p>Não há alunos cadastrados no sistema</p>
                </div>
            `;
            return;
        }

        // Processar dados para cada aluno
        studentsList.innerHTML = students.map(student => {
            const studentAnswers = allAnswers.filter(a => a.student?.id === student.id);
            
            // Separar questões de múltipla escolha e texto
            const multipleChoiceQuestions = allQuestions.filter(q => 
                q.type === 'MULTIPLE_CHOICE' || q.multipleChoice
            );
            const textQuestions = allQuestions.filter(q => 
                q.type === 'TEXT' || (!q.multipleChoice && q.type !== 'MULTIPLE_CHOICE')
            );

            // Calcular estatísticas de múltipla escolha
            let multipleChoiceCorrect = 0;
            let multipleChoiceTotal = 0;
            
            studentAnswers.forEach(answer => {
                const question = allQuestions.find(q => q.id === answer.question?.id);
                if (question && (question.type === 'MULTIPLE_CHOICE' || question.multipleChoice)) {
                    multipleChoiceTotal++;
                    const correction = allCorrections.find(c => c.answer?.id === answer.id);
                    const formattedGrade = correction ? formatGrade(correction.grade) : '';
                    if (correction && (formattedGrade === 'A+' || formattedGrade === 'A' || formattedGrade === 'A-')) {
                        multipleChoiceCorrect++;
                    }
                }
            });

            // Buscar respostas escritas corrigidas
            const correctedTextAnswers = studentAnswers.filter(answer => {
                const question = allQuestions.find(q => q.id === answer.question?.id);
                if (!question) return false;
                const isTextQuestion = question.type === 'TEXT' || (!question.multipleChoice && question.type !== 'MULTIPLE_CHOICE');
                if (!isTextQuestion) return false;
                
                const correction = allCorrections.find(c => c.answer?.id === answer.id);
                return !!correction;
            }).map(answer => {
                const question = allQuestions.find(q => q.id === answer.question?.id);
                const correction = allCorrections.find(c => c.answer?.id === answer.id);
                return {
                    answer,
                    question,
                    correction
                };
            });

            const studentName = student.userName || student.email?.split('@')[0] || `Aluno ${student.id}`;

            return `
                <div class="student-grade-card" style="background: rgba(15, 23, 42, 0.8); border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 2px solid rgba(255, 255, 255, 0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div>
                            <h3 style="color: #3b82f6; margin: 0;">
                                <i class="fas fa-user-graduate"></i> ${escapeHtml(studentName)}
                            </h3>
                            <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 0.9rem;">${escapeHtml(student.email || '')}</p>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div style="background: rgba(59, 130, 246, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                            <div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 5px;">Múltipla Escolha</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #3b82f6;">
                                ${multipleChoiceCorrect} / ${multipleChoiceTotal}
                            </div>
                            <div style="color: #94a3b8; font-size: 0.85rem; margin-top: 5px;">
                                ${multipleChoiceTotal > 0 ? Math.round((multipleChoiceCorrect / multipleChoiceTotal) * 100) : 0}% de acerto
                            </div>
                        </div>

                        <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                            <div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 5px;">Respostas Escritas Corrigidas</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">
                                ${correctedTextAnswers.length}
                            </div>
                            <div style="color: #94a3b8; font-size: 0.85rem; margin-top: 5px;">
                                de ${studentAnswers.filter(a => {
                                    const q = allQuestions.find(q => q.id === a.question?.id);
                                    return q && (q.type === 'TEXT' || (!q.multipleChoice && q.type !== 'MULTIPLE_CHOICE'));
                                }).length} respostas escritas
                            </div>
                        </div>
                    </div>

                    ${correctedTextAnswers.length > 0 ? `
                        <div style="margin-bottom: 20px;">
                            <h4 style="color: #f8fafc; margin-bottom: 15px;">
                                <i class="fas fa-file-alt"></i> Respostas Escritas Corrigidas:
                            </h4>
                            ${correctedTextAnswers.map(({ answer, question, correction }) => `
                                <div style="background: rgba(30, 41, 59, 0.8); padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #10b981;">
                                    <div style="font-weight: 600; color: #3b82f6; margin-bottom: 8px;">
                                        ${escapeHtml(question?.title || 'Questão sem título')}
                                    </div>
                                    <div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 10px;">
                                        <strong>Resposta:</strong> ${escapeHtml(answer.text || 'Sem resposta')}
                                    </div>
                                    <div style="color: #10b981; font-weight: 600;">
                                        <i class="fas fa-star"></i> Nota: ${formatGrade(correction.grade)}
                                    </div>
                                    ${correction.feedback ? `
                                        <div style="color: #94a3b8; font-size: 0.85rem; margin-top: 5px;">
                                            <strong>Feedback:</strong> ${escapeHtml(correction.feedback)}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    <div style="background: rgba(251, 191, 36, 0.1); padding: 20px; border-radius: 8px; border: 2px solid rgba(251, 191, 36, 0.3); margin-top: 20px;">
                        <label style="display: block; color: #fbbf24; font-weight: 600; margin-bottom: 15px;">
                            <i class="fas fa-star"></i> Tipo de Nota:
                        </label>
                        <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input 
                                    type="radio" 
                                    name="grade-type-${student.id}" 
                                    value="weekly" 
                                    id="grade-type-weekly-${student.id}"
                                    checked
                                    style="cursor: pointer;"
                                >
                                <span style="color: #f8fafc;">Nota da Lição da Semana</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input 
                                    type="radio" 
                                    name="grade-type-${student.id}" 
                                    value="exam" 
                                    id="grade-type-exam-${student.id}"
                                    style="cursor: pointer;"
                                >
                                <span style="color: #f8fafc;">Nota da Prova</span>
                            </label>
                        </div>
                        
                        <!-- Removido campo de seleção de prova - nota de prova é geral -->

                        <label style="display: block; color: #fbbf24; font-weight: 600; margin-bottom: 10px;">
                            <i class="fas fa-star"></i> Pontos Obtidos:
                        </label>
                        <input 
                            type="number" 
                            id="points-obtained-${student.id}" 
                            min="0" 
                            step="0.1"
                            placeholder="Ex: 18"
                            style="width: 150px; padding: 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(30, 41, 59, 0.8); color: #f8fafc; font-size: 1.1rem; font-weight: 700; text-align: center; margin-bottom: 10px;"
                        >
                        
                        <label style="display: block; color: #fbbf24; font-weight: 600; margin-bottom: 10px; margin-top: 15px;">
                            <i class="fas fa-star"></i> Total de Pontos:
                        </label>
                        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px; flex-wrap: wrap;">
                            <input 
                                type="number" 
                                id="total-points-${student.id}" 
                                min="0" 
                                step="0.1"
                                placeholder="Ex: 20"
                                style="width: 150px; padding: 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(30, 41, 59, 0.8); color: #f8fafc; font-size: 1.1rem; font-weight: 700; text-align: center;"
                            >
                            <div id="grade-preview-${student.id}" style="padding: 10px 15px; background: rgba(20, 184, 166, 0.2); border-radius: 8px; color: #14b8a6; font-weight: 700; font-size: 1.1rem; min-width: 100px; text-align: center;">
                                -
                            </div>
                            <button 
                                onclick="saveFinalGrade(${student.id})"
                                style="padding: 10px 20px; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; white-space: nowrap;"
                            >
                                <i class="fas fa-paper-plane"></i> Enviar Nota
                            </button>
                        </div>
                        <label style="display: block; color: #fbbf24; font-weight: 600; margin-bottom: 10px; margin-top: 15px;">
                            <i class="fas fa-comment"></i> Feedback (opcional):
                        </label>
                        <textarea 
                            id="final-feedback-${student.id}"
                            placeholder="Digite um feedback para o aluno..."
                            style="width: 100%; min-height: 80px; padding: 12px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(30, 41, 59, 0.8); color: #f8fafc; font-size: 0.95rem; resize: vertical; font-family: inherit;"
                        ></textarea>
                        <p style="margin-top: 8px; font-size: 0.85rem; color: rgba(255, 255, 255, 0.6);">
                            <i class="fas fa-info-circle"></i> A nota será enviada por email para o aluno no formato X/Y (A+).
                        </p>
                    </div>
                    
                    <script>
                        // Adicionar listeners para atualizar preview e mostrar/ocultar seleção de prova
                        (function() {
                            const pointsInput = document.getElementById('points-obtained-${student.id}');
                            const totalInput = document.getElementById('total-points-${student.id}');
                            const preview = document.getElementById('grade-preview-${student.id}');
                            const weeklyRadio = document.getElementById('grade-type-weekly-${student.id}');
                            const examRadio = document.getElementById('grade-type-exam-${student.id}');
                            const examSelect = document.getElementById('exam-select-${student.id}');
                            
                            function updatePreview() {
                                const points = parseFloat(pointsInput.value) || 0;
                                const total = parseFloat(totalInput.value) || 0;
                                if (total > 0) {
                                    const percentage = (points / total) * 100;
                                    let grade = 'F';
                                    if (percentage >= 95) grade = 'A+';
                                    else if (percentage >= 90) grade = 'A';
                                    else if (percentage >= 85) grade = 'A-';
                                    else if (percentage >= 80) grade = 'B+';
                                    else if (percentage >= 70) grade = 'B';
                                    else if (percentage >= 65) grade = 'B-';
                                    else if (percentage >= 60) grade = 'C+';
                                    else if (percentage >= 50) grade = 'C';
                                    else if (percentage >= 45) grade = 'C-';
                                    else if (percentage >= 40) grade = 'D+';
                                    else if (percentage >= 30) grade = 'D';
                                    preview.textContent = points + '/' + total + ' (' + grade + ')';
                                } else {
                                    preview.textContent = '-';
                                }
                            }
                            
                            pointsInput.addEventListener('input', updatePreview);
                            totalInput.addEventListener('input', updatePreview);
                            
                            weeklyRadio.addEventListener('change', function() {
                                examSelect.style.display = 'none';
                            });
                            
                            examRadio.addEventListener('change', function() {
                                // Não precisa selecionar prova - nota de prova é geral
                            });
                        })();
                    </script>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Erro ao carregar notas dos alunos:', error);
        studentsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar alunos</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Salvar nota (semanal ou de prova) para o aluno
async function saveFinalGrade(studentId) {
    const pointsInput = document.getElementById(`points-obtained-${studentId}`);
    const totalInput = document.getElementById(`total-points-${studentId}`);
    const feedbackInput = document.getElementById(`final-feedback-${studentId}`);
    const weeklyRadio = document.getElementById(`grade-type-weekly-${studentId}`);
    const examRadio = document.getElementById(`grade-type-exam-${studentId}`);

    if (!pointsInput || !totalInput) {
        showMessage('Erro: Campos de nota não encontrados.', 'error');
        return;
    }

    const pointsObtained = parseFloat(pointsInput.value);
    const totalPoints = parseFloat(totalInput.value);
    const feedback = feedbackInput ? feedbackInput.value.trim() : '';
    const isExam = examRadio && examRadio.checked;

    if (isNaN(pointsObtained) || pointsObtained < 0) {
        showMessage('Por favor, insira pontos obtidos válidos', 'error');
        return;
    }

    if (isNaN(totalPoints) || totalPoints <= 0) {
        showMessage('Por favor, insira um total de pontos válido maior que zero', 'error');
        return;
    }

    if (pointsObtained > totalPoints) {
        showMessage('Pontos obtidos não podem ser maiores que o total de pontos', 'error');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Erro: Usuário não autenticado.', 'error');
        return;
    }

    try {
        // Calcular porcentagem e grade
        const percentage = (pointsObtained / totalPoints) * 100;
        let gradeEnum = 'F';
        if (percentage >= 95) gradeEnum = 'A_PLUS';
        else if (percentage >= 90) gradeEnum = 'A';
        else if (percentage >= 85) gradeEnum = 'A_MINUS';
        else if (percentage >= 80) gradeEnum = 'B_PLUS';
        else if (percentage >= 70) gradeEnum = 'B';
        else if (percentage >= 65) gradeEnum = 'B_MINUS';
        else if (percentage >= 60) gradeEnum = 'C_PLUS';
        else if (percentage >= 50) gradeEnum = 'C';
        else if (percentage >= 45) gradeEnum = 'C_MINUS';
        else if (percentage >= 40) gradeEnum = 'D_PLUS';
        else if (percentage >= 30) gradeEnum = 'D';

        let response;
        if (isExam) {
            // Salvar nota de prova (sem examId - nota geral)
            response = await fetch(`${API}/exam-grades`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentId: studentId,
                    examId: null, // Nota de prova geral, sem prova específica
                    pointsObtained: pointsObtained,
                    totalPoints: totalPoints,
                    grade: gradeEnum,
                    feedback: feedback || `Nota ${pointsObtained}/${totalPoints} atribuída pelo professor.`
                })
            });
        } else {
            // Salvar nota semanal
            response = await fetch(`${API}/weekly-grades`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    studentId: studentId,
                    pointsObtained: pointsObtained,
                    totalPoints: totalPoints,
                    grade: gradeEnum,
                    feedback: feedback || `Nota ${pointsObtained}/${totalPoints} atribuída pelo professor.`
                })
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Erro ao salvar nota ${isExam ? 'de prova' : 'semanal'}`);
        }

        const savedGrade = await response.json();
        const gradeType = isExam ? 'de prova' : 'semanal';
        showMessage(`Nota ${gradeType} ${pointsObtained}/${totalPoints} enviada para o aluno com sucesso! Email de notificação enviado.`, 'success');
        console.log(`Nota ${gradeType} salva:`, savedGrade);
        
        // Recarregar dados
        await loadStudentsGrades();

    } catch (error) {
        console.error(`Erro ao salvar nota ${isExam ? 'de prova' : 'semanal'}:`, error);
        showMessage(`Erro ao salvar nota ${isExam ? 'de prova' : 'semanal'}: ` + error.message, 'error');
    }
}

// Função para converter número (0-10) para enum Grade
function numberToGradeEnum(number) {
    const num = parseFloat(number);
    if (isNaN(num) || num < 0 || num > 10) {
        return null;
    }
    
    if (num >= 9.5) return 'A_PLUS';
    if (num >= 9.0) return 'A';
    if (num >= 8.5) return 'A_MINUS';
    if (num >= 8.0) return 'B_PLUS';
    if (num >= 7.0) return 'B';
    if (num >= 6.5) return 'B_MINUS';
    if (num >= 6.0) return 'C_PLUS';
    if (num >= 5.0) return 'C';
    if (num >= 4.5) return 'C_MINUS';
    if (num >= 4.0) return 'D_PLUS';
    if (num >= 3.0) return 'D';
    return 'F';
}

// Função para converter enum Grade para número aproximado (para exibição no input)
function gradeEnumToNumber(grade) {
    if (!grade) return '';
    
    const gradeMap = {
        'A_PLUS': '9.5',
        'A': '9.0',
        'A_MINUS': '8.5',
        'B_PLUS': '8.0',
        'B': '7.0',
        'B_MINUS': '6.5',
        'C_PLUS': '6.0',
        'C': '5.0',
        'C_MINUS': '4.5',
        'D_PLUS': '4.0',
        'D': '3.0',
        'F': '0'
    };
    
    return gradeMap[grade] || '';
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

// Funções para modais de CSV
function showImportCsvModal() {
    const modal = document.getElementById('import-csv-modal');
    if (modal) {
        modal.style.display = 'flex';
        const gradeTypeSelect = document.getElementById('csv-grade-type');
        const examSelectDiv = document.getElementById('exam-select-csv');
        
        if (gradeTypeSelect) {
            gradeTypeSelect.addEventListener('change', function() {
                if (this.value === 'prova') {
                    examSelectDiv.style.display = 'block';
                    loadExamsForCsv();
                } else {
                    examSelectDiv.style.display = 'none';
                }
            });
        }
    }
}

function closeImportCsvModal() {
    const modal = document.getElementById('import-csv-modal');
    if (modal) {
        modal.style.display = 'none';
        const fileInput = document.getElementById('csv-file-input');
        const resultDiv = document.getElementById('csv-import-result');
        if (fileInput) fileInput.value = '';
        if (resultDiv) resultDiv.innerHTML = '';
    }
}

function showExportCsvModal() {
    const modal = document.getElementById('export-csv-modal');
    if (modal) {
        modal.style.display = 'flex';
        const exportTypeSelect = document.getElementById('export-type');
        const examSelectDiv = document.getElementById('export-exam-select');
        
        if (exportTypeSelect) {
            exportTypeSelect.addEventListener('change', function() {
                if (this.value === 'exam') {
                    examSelectDiv.style.display = 'block';
                    loadExamsForExport();
                } else {
                    examSelectDiv.style.display = 'none';
                }
            });
        }
    }
}

function closeExportCsvModal() {
    const modal = document.getElementById('export-csv-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function loadExamsForCsv() {
    const examSelect = document.getElementById('csv-exam-id');
    if (!examSelect) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API}/exams`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const exams = await response.json();
            examSelect.innerHTML = '<option value="">Selecione uma prova...</option>';
            exams.forEach(exam => {
                const option = document.createElement('option');
                option.value = exam.id;
                option.textContent = exam.title || `Prova ${exam.id}`;
                examSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar provas:', error);
    }
}

async function loadExamsForExport() {
    const examSelect = document.getElementById('export-exam-id');
    if (!examSelect) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${API}/exams`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const exams = await response.json();
            examSelect.innerHTML = '<option value="">Selecione uma prova...</option>';
            exams.forEach(exam => {
                const option = document.createElement('option');
                option.value = exam.id;
                option.textContent = exam.title || `Prova ${exam.id}`;
                examSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar provas:', error);
    }
}

let previewData = null; // Armazenar dados da prévia

async function importCsvGrades() {
    const fileInput = document.getElementById('csv-file-input');
    const gradeTypeSelect = document.getElementById('csv-grade-type');
    const resultDiv = document.getElementById('csv-import-result');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        if (resultDiv) {
            resultDiv.innerHTML = '<div style="color: #ef4444; padding: 10px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">Por favor, selecione um arquivo CSV.</div>';
        }
        return;
    }

    const gradeType = gradeTypeSelect ? gradeTypeSelect.value : 'homework';
    const examId = null; // Nota de prova é geral, não precisa de examId

    const token = localStorage.getItem('token');
    if (!token) {
        if (resultDiv) {
            resultDiv.innerHTML = '<div style="color: #ef4444; padding: 10px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">Erro: Usuário não autenticado.</div>';
        }
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('gradeType', gradeType);
    if (examId) {
        formData.append('examId', examId);
    }

    try {
        if (resultDiv) {
            resultDiv.innerHTML = '<div style="color: #fbbf24; padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Analisando CSV...</div>';
        }

        // Primeiro, gerar prévia
        const previewResponse = await fetch(`${API}/csv/import/preview`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!previewResponse.ok) {
            const errorText = await previewResponse.text();
            throw new Error(errorText || 'Erro ao analisar CSV');
        }

        const previewResult = await previewResponse.json();
        previewData = previewResult;

        // Mostrar prévia
        displayPreview(previewResult, gradeType, examId, resultDiv);

    } catch (error) {
        console.error('Erro ao analisar CSV:', error);
        if (resultDiv) {
            resultDiv.innerHTML = `<div style="color: #ef4444; padding: 10px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">Erro ao analisar CSV: ${error.message}</div>`;
        }
    }
}

function displayPreview(previewResult, gradeType, examId, resultDiv) {
    const items = previewResult.items || [];
    const foundItems = items.filter(item => item.found);
    const notFoundItems = items.filter(item => !item.found);

    let html = '<div style="max-height: 400px; overflow-y: auto; margin-bottom: 20px;">';
    html += '<h3 style="color: #f8fafc; margin-bottom: 15px;"><i class="fas fa-eye"></i> Prévia da Importação</h3>';
    
    if (foundItems.length > 0) {
        html += `<div style="margin-bottom: 20px;">`;
        html += `<p style="color: #10b981; font-weight: 600; margin-bottom: 10px;"><i class="fas fa-check-circle"></i> ${foundItems.length} estudante(s) encontrado(s):</p>`;
        html += '<div style="display: flex; flex-direction: column; gap: 10px;">';
        
        foundItems.forEach((item, index) => {
            const gradeDisplay = item.pointsObtained != null && item.totalPoints != null ? 
                `${item.pointsObtained}/${item.totalPoints}` : item.score || 'N/A';
            const gradeClass = item.grade ? item.grade.replace('_PLUS', '+').replace('_MINUS', '-') : '';
            
            html += `
                <div style="background: rgba(16, 185, 129, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                        <div style="flex: 1;">
                            <p style="margin: 0; color: #f8fafc; font-weight: 600;">${escapeHtml(item.studentName || item.fullName)}</p>
                            <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 0.9rem;">${escapeHtml(item.email)}</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0; color: #14b8a6; font-size: 1.2rem; font-weight: 700;">${gradeDisplay}</p>
                            ${gradeClass ? `<p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 0.85rem;">(${gradeClass})</p>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        html += '</div>';
    }

    if (notFoundItems.length > 0) {
        html += `<div style="margin-bottom: 20px;">`;
        html += `<p style="color: #fbbf24; font-weight: 600; margin-bottom: 10px;"><i class="fas fa-exclamation-triangle"></i> ${notFoundItems.length} estudante(s) não encontrado(s):</p>`;
        html += '<div style="display: flex; flex-direction: column; gap: 10px;">';
        
        notFoundItems.forEach(item => {
            html += `
                <div style="background: rgba(251, 191, 36, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #fbbf24;">
                    <p style="margin: 0; color: #f8fafc; font-weight: 600;">${escapeHtml(item.fullName)}</p>
                    <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 0.9rem;">${escapeHtml(item.email)}</p>
                    <p style="margin: 5px 0 0 0; color: #fbbf24; font-size: 0.85rem;">${escapeHtml(item.errorMessage || 'Estudante não encontrado')}</p>
                </div>
            `;
        });
        
        html += '</div>';
        html += '</div>';
    }

    html += '</div>';

    // Botões de ação
    if (foundItems.length > 0) {
        html += '<div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px;">';
        html += '<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #f8fafc;">';
        html += '<input type="checkbox" id="send-email-checkbox" checked style="cursor: pointer;">';
        html += '<span>Enviar por Email</span>';
        html += '</label>';
        html += '<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #f8fafc; margin-left: 15px;">';
        html += '<input type="checkbox" id="send-dashboard-checkbox" checked style="cursor: pointer;">';
        html += '<span>Enviar para Dashboard dos Alunos</span>';
        html += '</label>';
        html += '</div>';
        
        html += '<div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">';
        html += '<button onclick="closeImportCsvModal()" class="btn btn-secondary">Cancelar</button>';
        html += `<button onclick="confirmImportCsv('${gradeType}', ${examId || 'null'})" class="btn btn-primary" style="background: linear-gradient(135deg, #10b981, #059669);">`;
        html += '<i class="fas fa-check"></i> Confirmar e Importar';
        html += '</button>';
        html += '</div>';
    } else {
        html += '<div style="text-align: center; margin-top: 20px;">';
        html += '<p style="color: #fbbf24;">Nenhum estudante encontrado. Verifique os emails/nomes no CSV.</p>';
        html += '<button onclick="closeImportCsvModal()" class="btn btn-secondary" style="margin-top: 10px;">Fechar</button>';
        html += '</div>';
    }

    if (resultDiv) {
        resultDiv.innerHTML = html;
    }
}

async function confirmImportCsv(gradeType, examId) {
    if (!previewData || !previewData.items) {
        showMessage('Erro: Dados da prévia não encontrados.', 'error');
        return;
    }

    const sendEmail = document.getElementById('send-email-checkbox') ? 
        document.getElementById('send-email-checkbox').checked : true;
    const sendToDashboard = document.getElementById('send-dashboard-checkbox') ? 
        document.getElementById('send-dashboard-checkbox').checked : true;

    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Erro: Usuário não autenticado.', 'error');
        return;
    }

    const resultDiv = document.getElementById('csv-import-result');
    
    try {
        if (resultDiv) {
            resultDiv.innerHTML = '<div style="color: #fbbf24; padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Importando...</div>';
        }

        const response = await fetch(`${API}/csv/import/grades`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: previewData.items,
                gradeType: gradeType,
                examId: examId,
                sendEmail: sendEmail,
                sendToDashboard: sendToDashboard
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Erro ao importar CSV');
        }

        const result = await response.json();
        
        if (resultDiv) {
            let resultHtml = '<div style="padding: 15px; background: rgba(16, 185, 129, 0.1); border-radius: 8px; border-left: 4px solid #10b981;">';
            resultHtml += `<h3 style="color: #10b981; margin-top: 0;"><i class="fas fa-check-circle"></i> Importação Concluída</h3>`;
            resultHtml += `<p style="color: #f8fafc; margin: 5px 0;"><strong>Sucesso:</strong> ${result.successCount} notas importadas</p>`;
            if (sendEmail) {
                resultHtml += `<p style="color: #3b82f6; margin: 5px 0;"><i class="fas fa-envelope"></i> Emails enviados para os alunos</p>`;
            }
            if (sendToDashboard) {
                resultHtml += `<p style="color: #8b5cf6; margin: 5px 0;"><i class="fas fa-chart-line"></i> Notas disponíveis no dashboard dos alunos</p>`;
            }
            if (result.errorCount > 0) {
                resultHtml += `<p style="color: #fbbf24; margin: 5px 0;"><strong>Erros:</strong> ${result.errorCount} notas com erro</p>`;
                if (result.errors && result.errors.length > 0) {
                    resultHtml += '<ul style="margin: 10px 0; padding-left: 20px; color: #fbbf24;">';
                    result.errors.forEach(error => {
                        resultHtml += `<li>${error}</li>`;
                    });
                    resultHtml += '</ul>';
                }
            }
            resultHtml += '</div>';
            resultDiv.innerHTML = resultHtml;
        }
        
        // Recarregar dados após 2 segundos
        setTimeout(() => {
            loadStudentsGrades();
            setTimeout(() => closeImportCsvModal(), 2000);
        }, 2000);

    } catch (error) {
        console.error('Erro ao importar CSV:', error);
        if (resultDiv) {
            resultDiv.innerHTML = `<div style="color: #ef4444; padding: 10px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">Erro ao importar CSV: ${error.message}</div>`;
        }
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function exportCsvGrades() {
    const exportTypeSelect = document.getElementById('export-type');
    const examIdSelect = document.getElementById('export-exam-id');

    const exportType = exportTypeSelect ? exportTypeSelect.value : 'weekly';
    const examId = exportType === 'exam' && examIdSelect ? examIdSelect.value : null;

    if (exportType === 'exam' && !examId) {
        showMessage('Por favor, selecione uma prova.', 'error');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        showMessage('Erro: Usuário não autenticado.', 'error');
        return;
    }

    try {
        let url;
        if (exportType === 'exam') {
            url = `${API}/csv/export/exam/${examId}`;
        } else {
            url = `${API}/csv/export/weekly`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao exportar CSV');
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = exportType === 'exam' ? `notas_prova_${examId}.csv` : 'notas_semanais.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);

        showMessage('CSV exportado com sucesso!', 'success');
        closeExportCsvModal();

    } catch (error) {
        console.error('Erro ao exportar CSV:', error);
        showMessage('Erro ao exportar CSV: ' + error.message, 'error');
    }
}

// Exportar funções globais
window.selectQuestion = selectQuestion;
window.saveCorrection = saveCorrection;
window.showGradesTab = showGradesTab;
window.showCorrectionsTab = showCorrectionsTab;
window.saveFinalGrade = saveFinalGrade;
window.showImportCsvModal = showImportCsvModal;
window.closeImportCsvModal = closeImportCsvModal;
window.showExportCsvModal = showExportCsvModal;
window.closeExportCsvModal = closeExportCsvModal;
window.importCsvGrades = importCsvGrades;
window.confirmImportCsv = confirmImportCsv;
window.exportCsvGrades = exportCsvGrades;
window.loadExamsForStudent = loadExamsForStudent;

})(); // Fechar IIFE

