// Usar API configurada em config.js
if (typeof window.API === 'undefined') {
    window.API = 'http://localhost:8080';
}
const API = (function() { return window.API; })();

// Função para mostrar mensagens
function showMessage(message, type = 'info') {
    const container = document.getElementById('message-container');
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; margin-left: auto;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(messageDiv);
    
    // Remover após 5 segundos
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, 5000);
}

let currentStudentId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadStudents();
    setupEventListeners();
});

async function loadStudents() {
    const token = localStorage.getItem('token');
    const container = document.getElementById('students-container');

    if (!container) {
        console.error('❌ Container de alunos não encontrado!');
        return;
    }

    if (!token) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro de autenticação</h3>
                <p>Você precisa estar logado para ver os alunos</p>
            </div>
        `;
        return;
    }

    try {
        container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando alunos...</div>';

        console.log('🔍 DEBUG: Buscando alunos em:', `${API}/students`);
        console.log('🔍 DEBUG: Token presente:', !!token);

        // Buscar todos os alunos
        const studentsResponse = await fetch(`${API}/students`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('🔍 DEBUG: Resposta de alunos:', studentsResponse.status, studentsResponse.statusText);

        if (!studentsResponse.ok) {
            const errorText = await studentsResponse.text();
            console.error('❌ Erro ao carregar alunos:', errorText);
            throw new Error(`Erro ao carregar alunos: ${studentsResponse.status} ${studentsResponse.statusText}`);
        }

        const students = await studentsResponse.json();
        console.log('🔍 DEBUG: Alunos recebidos:', students.length, students);

        // Buscar todas as questões
        console.log('🔍 DEBUG: Buscando questões em:', `${API}/questions`);
        const questionsResponse = await fetch(`${API}/questions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('🔍 DEBUG: Resposta de questões:', questionsResponse.status, questionsResponse.statusText);

        if (questionsResponse.status === 401) {
            // Token inválido ou expirado
            console.error('❌ Erro 401 - Token inválido ao buscar questões');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Sessão expirada</h3>
                    <p>Faça login novamente</p>
                </div>
            `;
            setTimeout(() => {
                window.location.href = '/page/login.html';
            }, 2000);
            return;
        }

        if (questionsResponse.status === 403) {
            // Erro 403 - pode ser CORS ou permissões
            let errorText = '';
            try {
                errorText = await questionsResponse.text();
            } catch (e) {
                errorText = 'Não foi possível ler a mensagem de erro';
            }
            
            console.error('❌ Erro 403 ao buscar questões:', errorText);
            console.warn('⚠️ Possíveis causas: CORS não configurado, usuário sem permissão, ou endpoint protegido');
            
            // Continuar mesmo com erro 403 - questões podem não ser essenciais para listar alunos
            console.warn('⚠️ Continuando sem questões - lista de alunos será exibida sem dados de questões');
            // Não lançar erro, apenas logar e continuar
        } else if (!questionsResponse.ok) {
            const errorText = await questionsResponse.text();
            console.error('❌ Erro ao carregar questões:', questionsResponse.status, errorText);
            throw new Error(`Erro ao carregar questões: ${questionsResponse.status} ${errorText || questionsResponse.statusText}`);
        }

        const allQuestions = await questionsResponse.json();

        // Buscar todas as respostas
        const answersResponse = await fetch(`${API}/answers`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!answersResponse.ok) {
            throw new Error('Erro ao carregar respostas');
        }

        const allAnswers = await answersResponse.json();

        if (!students || students.length === 0) {
            console.warn('⚠️ Nenhum aluno encontrado');
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-graduate"></i>
                    <h3>Nenhum aluno cadastrado</h3>
                    <p>Aguarde o cadastro de alunos no sistema</p>
                </div>
            `;
            return;
        }

        // Processar dados por aluno
        const studentsData = students.map(student => {
            const studentAnswers = allAnswers.filter(a => {
                if (!a.student) return false;
                const answerStudentId = a.student.id || a.student;
                return answerStudentId === student.id;
            });

            // Agrupar questões e respostas por semana
            const weeklyStats = {};
            
            allQuestions.forEach(question => {
                if (!question.createdAt) return;
                const questionDate = new Date(question.createdAt);
                const weekKey = getWeekKey(questionDate);
                
                if (!weeklyStats[weekKey]) {
                    weeklyStats[weekKey] = {
                        date: questionDate,
                        questions: [],
                        answeredCount: 0
                    };
                }
                
                const isAnswered = studentAnswers.some(a => a.question?.id === question.id);
                weeklyStats[weekKey].questions.push({
                    id: question.id,
                    title: question.title || 'Sem título',
                    answered: isAnswered
                });
                
                if (isAnswered) {
                    weeklyStats[weekKey].answeredCount++;
                }
            });

            // Ordenar semanas por data (mais recente primeiro)
            const sortedWeeks = Object.keys(weeklyStats).sort((a, b) => {
                return new Date(weeklyStats[b].date) - new Date(weeklyStats[a].date);
            });

            return {
                id: student.id,
                name: student.userName || student.email?.split('@')[0] || `Aluno ${student.id}`,
                email: student.email || '',
                weeklyStats: sortedWeeks.map(weekKey => ({
                    weekKey,
                    date: weeklyStats[weekKey].date,
                    totalQuestions: weeklyStats[weekKey].questions.length,
                    answeredCount: weeklyStats[weekKey].answeredCount,
                    questions: weeklyStats[weekKey].questions
                }))
            };
        });

        // Renderizar alunos
        container.innerHTML = studentsData.map(student => `
            <div class="student-card">
                <div class="student-header">
                    <div onclick="viewStudentDetails(${student.id})" style="flex: 1; cursor: pointer;">
                        <div class="student-name">${escapeHtml(student.name)}</div>
                        ${student.email ? `<div class="student-email">${escapeHtml(student.email)}</div>` : ''}
                    </div>
                    <button 
                        class="btn btn-danger" 
                        onclick="event.stopPropagation(); deleteStudent(${student.id}, '${escapeHtml(student.name)}')"
                        style="padding: 8px 16px; margin-left: 10px;"
                        title="Excluir aluno"
                    >
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="weekly-stats">
                    ${student.weeklyStats.length > 0 ? student.weeklyStats.map(week => `
                        <div class="week-item">
                            <div class="week-date">
                                <i class="fas fa-calendar"></i> ${formatDate(week.date)}
                            </div>
                            <div class="week-count">
                                ${week.answeredCount} de ${week.totalQuestions} questões respondidas
                            </div>
                        </div>
                    `).join('') : '<div style="color: #94a3b8; padding: 10px;">Nenhuma questão disponível ainda</div>'}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Erro ao carregar alunos:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar alunos</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function getWeekKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

let weeklyChart = null;
let examChart = null;

async function viewStudentDetails(studentId) {
    currentStudentId = studentId;
    const token = localStorage.getItem('token');
    const modal = document.getElementById('student-details-modal');
    const modalTitle = document.getElementById('modal-student-name');

    try {
        // Buscar dados do aluno
        const studentResponse = await fetch(`${API}/students/${studentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!studentResponse.ok) {
            throw new Error('Erro ao carregar dados do aluno');
        }

        const student = await studentResponse.json();
        const studentName = student.userName || student.email?.split('@')[0] || `Aluno ${student.id}`;
        modalTitle.textContent = `Notas de ${escapeHtml(studentName)}`;

        // Buscar notas semanais (lições)
        const weeklyGradesResponse = await fetch(`${API}/weekly-grades/student/${studentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        let weeklyGrades = [];
        if (weeklyGradesResponse.ok) {
            weeklyGrades = await weeklyGradesResponse.json();
        }

        // Buscar notas de provas
        const examGradesResponse = await fetch(`${API}/exam-grades/student/${studentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        let examGrades = [];
        if (examGradesResponse.ok) {
            examGrades = await examGradesResponse.json();
        }

        // Calcular médias
        const weeklyAverage = calculateAverage(weeklyGrades);
        const examAverage = calculateAverage(examGrades);

        // Atualizar médias na interface
        document.getElementById('weekly-average').textContent = weeklyAverage.average !== null ? weeklyAverage.average.toFixed(1) : '--';
        document.getElementById('weekly-count').textContent = weeklyAverage.count;
        document.getElementById('exam-average').textContent = examAverage.average !== null ? examAverage.average.toFixed(1) : '--';
        document.getElementById('exam-count').textContent = examAverage.count;

        // Renderizar listas de notas
        renderWeeklyGrades(weeklyGrades);
        renderExamGrades(examGrades);

        // Criar gráficos
        createWeeklyChart(weeklyGrades);
        createExamChart(examGrades);

        modal.classList.add('active');
    } catch (error) {
        console.error('Erro ao carregar detalhes do aluno:', error);
        showMessage('Erro ao carregar detalhes do aluno: ' + error.message, 'error');
    }
}

// Função para calcular média
function calculateAverage(grades) {
    if (!grades || grades.length === 0) {
        return { average: null, count: 0 };
    }

    // Converter notas para valores numéricos
    const gradeValues = {
        'A+': 10, 'A_PLUS': 10,
        'A': 9,
        'A-': 8.5, 'A_MINUS': 8.5,
        'B+': 8, 'B_PLUS': 8,
        'B': 7,
        'B-': 6.5, 'B_MINUS': 6.5,
        'C+': 6, 'C_PLUS': 6,
        'C': 5,
        'C-': 4.5, 'C_MINUS': 4.5,
        'D+': 4, 'D_PLUS': 4,
        'D': 3,
        'F': 0
    };

    let total = 0;
    let count = 0;

    grades.forEach(grade => {
        if (grade.grade) {
            const value = gradeValues[grade.grade] || 0;
            total += value;
            count++;
        } else if (grade.pointsObtained !== null && grade.totalPoints !== null && grade.totalPoints > 0) {
            // Calcular nota baseada em pontos
            const percentage = (grade.pointsObtained / grade.totalPoints) * 10;
            total += percentage;
            count++;
        }
    });

    return {
        average: count > 0 ? total / count : null,
        count: count
    };
}

// Função para renderizar notas semanais
function renderWeeklyGrades(grades) {
    const container = document.getElementById('weekly-grades-list');
    
    if (!grades || grades.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>Nenhuma nota de lição registrada ainda</p>
            </div>
        `;
        return;
    }

    // Ordenar por data (mais recente primeiro)
    const sortedGrades = [...grades].sort((a, b) => {
        const dateA = new Date(a.weekStartDate || a.createdAt);
        const dateB = new Date(b.weekStartDate || b.createdAt);
        return dateB - dateA;
    });

    container.innerHTML = sortedGrades.map(grade => {
        const date = new Date(grade.weekStartDate || grade.createdAt);
        const formattedDate = formatDate(date);
        const gradeDisplay = grade.grade || (grade.pointsObtained !== null && grade.totalPoints !== null 
            ? `${grade.pointsObtained}/${grade.totalPoints}` 
            : 'N/A');
        
        return `
            <div class="grade-item weekly">
                <div class="grade-header">
                    <div>
                        <div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 5px;">
                            <i class="fas fa-calendar"></i> Semana de ${formattedDate}
                        </div>
                        <div class="grade-value">${gradeDisplay}</div>
                    </div>
                    <div class="grade-meta">
                        ${grade.pointsObtained !== null && grade.totalPoints !== null ? `
                            <div><i class="fas fa-chart-pie"></i> ${grade.pointsObtained} de ${grade.totalPoints} pontos</div>
                        ` : ''}
                        <div><i class="fas fa-clock"></i> ${formatDateTime(date)}</div>
                    </div>
                </div>
                ${grade.feedback ? `
                    <div class="grade-feedback">
                        <strong style="color: #3b82f6; margin-bottom: 8px; display: block;">
                            <i class="fas fa-comment"></i> Feedback:
                        </strong>
                        ${escapeHtml(grade.feedback)}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Função para renderizar notas de provas
function renderExamGrades(grades) {
    const container = document.getElementById('exam-grades-list');
    
    if (!grades || grades.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>Nenhuma nota de prova registrada ainda</p>
            </div>
        `;
        return;
    }

    // Ordenar por data (mais recente primeiro)
    const sortedGrades = [...grades].sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA;
    });

    container.innerHTML = sortedGrades.map(grade => {
        const date = new Date(grade.createdAt);
        const formattedDate = formatDateTime(date);
        const examName = grade.exam?.title || 'Prova Geral';
        const gradeDisplay = grade.grade || (grade.pointsObtained !== null && grade.totalPoints !== null 
            ? `${grade.pointsObtained}/${grade.totalPoints}` 
            : 'N/A');
        
        return `
            <div class="grade-item exam">
                <div class="grade-header">
                    <div>
                        <div style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 5px;">
                            <i class="fas fa-clipboard-check"></i> ${escapeHtml(examName)}
                        </div>
                        <div class="grade-value">${gradeDisplay}</div>
                    </div>
                    <div class="grade-meta">
                        ${grade.pointsObtained !== null && grade.totalPoints !== null ? `
                            <div><i class="fas fa-chart-pie"></i> ${grade.pointsObtained} de ${grade.totalPoints} pontos</div>
                        ` : ''}
                        <div><i class="fas fa-clock"></i> ${formattedDate}</div>
                    </div>
                </div>
                ${grade.feedback ? `
                    <div class="grade-feedback">
                        <strong style="color: #8b5cf6; margin-bottom: 8px; display: block;">
                            <i class="fas fa-comment"></i> Feedback:
                        </strong>
                        ${escapeHtml(grade.feedback)}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Função para criar gráfico de notas semanais
function createWeeklyChart(grades) {
    const ctx = document.getElementById('weekly-grades-chart');
    if (!ctx) return;

    // Destruir gráfico anterior se existir
    if (weeklyChart) {
        weeklyChart.destroy();
    }

    if (!grades || grades.length === 0) {
        ctx.parentElement.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-chart-line" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>Nenhum dado disponível para o gráfico</p>
            </div>
        `;
        return;
    }

    // Ordenar por data
    const sortedGrades = [...grades].sort((a, b) => {
        const dateA = new Date(a.weekStartDate || a.createdAt);
        const dateB = new Date(b.weekStartDate || b.createdAt);
        return dateA - dateB;
    });

    // Converter notas para valores numéricos
    const gradeValues = {
        'A+': 10, 'A_PLUS': 10,
        'A': 9,
        'A-': 8.5, 'A_MINUS': 8.5,
        'B+': 8, 'B_PLUS': 8,
        'B': 7,
        'B-': 6.5, 'B_MINUS': 6.5,
        'C+': 6, 'C_PLUS': 6,
        'C': 5,
        'C-': 4.5, 'C_MINUS': 4.5,
        'D+': 4, 'D_PLUS': 4,
        'D': 3,
        'F': 0
    };

    const labels = sortedGrades.map(grade => {
        const date = new Date(grade.weekStartDate || grade.createdAt);
        return formatDate(date);
    });

    const data = sortedGrades.map(grade => {
        if (grade.grade) {
            return gradeValues[grade.grade] || 0;
        } else if (grade.pointsObtained !== null && grade.totalPoints !== null && grade.totalPoints > 0) {
            return (grade.pointsObtained / grade.totalPoints) * 10;
        }
        return 0;
    });

    weeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Notas de Lições',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    ticks: {
                        color: '#94a3b8',
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// Função para criar gráfico de notas de provas
function createExamChart(grades) {
    const ctx = document.getElementById('exam-grades-chart');
    if (!ctx) return;

    // Destruir gráfico anterior se existir
    if (examChart) {
        examChart.destroy();
    }

    if (!grades || grades.length === 0) {
        ctx.parentElement.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #94a3b8;">
                <i class="fas fa-chart-area" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <p>Nenhum dado disponível para o gráfico</p>
            </div>
        `;
        return;
    }

    // Ordenar por data
    const sortedGrades = [...grades].sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateA - dateB;
    });

    // Converter notas para valores numéricos
    const gradeValues = {
        'A+': 10, 'A_PLUS': 10,
        'A': 9,
        'A-': 8.5, 'A_MINUS': 8.5,
        'B+': 8, 'B_PLUS': 8,
        'B': 7,
        'B-': 6.5, 'B_MINUS': 6.5,
        'C+': 6, 'C_PLUS': 6,
        'C': 5,
        'C-': 4.5, 'C_MINUS': 4.5,
        'D+': 4, 'D_PLUS': 4,
        'D': 3,
        'F': 0
    };

    const labels = sortedGrades.map(grade => {
        const date = new Date(grade.createdAt);
        return formatDate(date);
    });

    const data = sortedGrades.map(grade => {
        if (grade.grade) {
            return gradeValues[grade.grade] || 0;
        } else if (grade.pointsObtained !== null && grade.totalPoints !== null && grade.totalPoints > 0) {
            return (grade.pointsObtained / grade.totalPoints) * 10;
        }
        return 0;
    });

    examChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Notas de Provas',
                data: data,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 10,
                    ticks: {
                        color: '#94a3b8',
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// Função para alternar entre tabs de notas
function switchGradeTab(tab) {
    // Atualizar botões
    document.querySelectorAll('.grade-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (tab === 'weekly') {
        document.getElementById('weekly-tab-btn').classList.add('active');
        document.getElementById('weekly-grades-content').style.display = 'block';
        document.getElementById('exam-grades-content').style.display = 'none';
    } else {
        document.getElementById('exam-tab-btn').classList.add('active');
        document.getElementById('weekly-grades-content').style.display = 'none';
        document.getElementById('exam-grades-content').style.display = 'block';
    }
}

// Função para formatar data e hora
function formatDateTime(date) {
    const d = new Date(date);
    return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function closeStudentModal() {
    const modal = document.getElementById('student-details-modal');
    modal.classList.remove('active');
    currentStudentId = null;
    
    // Destruir gráficos ao fechar o modal
    if (weeklyChart) {
        weeklyChart.destroy();
        weeklyChart = null;
    }
    if (examChart) {
        examChart.destroy();
        examChart = null;
    }
    
    // Resetar para a tab de lições
    switchGradeTab('weekly');
}

function setupEventListeners() {
    // Fechar modal ao clicar fora
    document.getElementById('student-details-modal').addEventListener('click', (e) => {
        if (e.target.id === 'student-details-modal') {
            closeStudentModal();
        }
    });

    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeStudentModal();
        }
    });
}

// Excluir aluno
async function deleteStudent(studentId, studentName) {
    if (!confirm(`Tem certeza que deseja excluir o aluno "${studentName}"?\n\nEsta ação não pode ser desfeita e todos os dados do aluno serão removidos permanentemente.`)) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API}/students/${studentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Erro ao excluir aluno');
        }
        
        showMessage(`Aluno "${studentName}" excluído com sucesso!`, 'success');
        
        // Recarregar lista de alunos
        setTimeout(() => {
            loadStudents();
        }, 1000);
        
    } catch (error) {
        console.error('Erro ao excluir aluno:', error);
        showMessage('Erro ao excluir aluno: ' + error.message, 'error');
    }
}

// Tornar função global para uso no onclick
window.viewStudentDetails = viewStudentDetails;
window.closeStudentModal = closeStudentModal;
window.deleteStudent = deleteStudent;
window.switchGradeTab = switchGradeTab;

