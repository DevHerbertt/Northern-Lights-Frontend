// student-dashboard-manager.js
// Declarar API global apenas uma vez
if (typeof window.API === 'undefined') {
    window.API = "http://localhost:8080";
}
// Usar window.API diretamente através de uma função para evitar conflito de escopo
const API = (function() { return window.API; })();
let performanceChart = null;
let progressChart = null;

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardData();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    const refreshBtn = document.getElementById('refresh-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await loadDashboardData();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            authService.logout();
            window.location.href = '/page/login.html';
        });
    }
}

// Carregar todos os dados do dashboard
async function loadDashboardData() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
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
        // Carregar questões
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
        const studentId = user.id;
        let studentAnswers = [];
        
        if (studentId) {
            try {
                // Buscar todas as respostas e filtrar pelo aluno
                const allAnswers = await fetch(`${API}/answers`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }).then(r => r.ok ? r.json() : []);

                studentAnswers = allAnswers.filter(a => a.student?.id === studentId);
            } catch (error) {
                console.error('Erro ao carregar respostas:', error);
            }
        }

        // Carregar correções
        let corrections = [];
        try {
            const correctionsResponse = await fetch(`${API}/corrections`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (correctionsResponse.ok) {
                corrections = await correctionsResponse.json();
            }
        } catch (error) {
            console.error('Erro ao carregar correções:', error);
        }

        // Processar dados
        processDashboardData(questions, studentAnswers, corrections);

        // Renderizar questões
        renderQuestions(questions, studentAnswers);

    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        showMessage('Erro ao carregar dados: ' + error.message, 'error');
    }
}

// Processar dados para estatísticas e gráficos
function processDashboardData(questions, answers, corrections) {
    const now = new Date();
    const answeredQuestionIds = new Set(answers.map(a => a.question?.id).filter(Boolean));
    const correctedAnswerIds = new Set(corrections.map(c => c.answer?.id).filter(Boolean));
    
    // Estatísticas
    const total = questions.length;
    
    // Separar questões por status
    let correct = 0;
    let incorrect = 0;
    let pending = 0;
    let expired = 0;
    
    questions.forEach(question => {
        const isAnswered = answeredQuestionIds.has(question.id);
        const isExpired = question.expiresAt && new Date(question.expiresAt) < now;
        
        if (isExpired && !isAnswered) {
            expired++;
        } else if (!isAnswered) {
            pending++;
        } else {
            // Buscar correção para esta resposta
            const answer = answers.find(a => a.question?.id === question.id);
            if (answer) {
                const correction = corrections.find(c => c.answer?.id === answer.id);
                if (correction) {
                    // Usar a função isCorrectAnswer para verificar se está correta
                    // A nota vem como enum (A, A_PLUS, A_MINUS, F, etc.), não como número
                    if (isCorrectAnswer(correction)) {
                        correct++;
                    } else {
                        incorrect++;
                    }
                } else {
                    pending++;
                }
            }
        }
    });

    // Atualizar estatísticas
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-correct').textContent = correct;
    document.getElementById('stat-incorrect').textContent = incorrect;

    // Criar gráficos
    createPerformanceChart(correct, incorrect, pending, expired);
    createProgressChart(corrections);
}

// Criar gráfico de desempenho (pizza)
function createPerformanceChart(correct, incorrect, pending, expired = 0) {
    const ctx = document.getElementById('performance-chart');
    if (!ctx) return;

    if (performanceChart) {
        performanceChart.destroy();
    }

    const labels = ['Corretas', 'Incorretas', 'Pendentes'];
    const data = [correct, incorrect, pending];
    const backgroundColor = [
        'rgba(16, 185, 129, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(251, 191, 36, 0.8)'
    ];
    const borderColor = [
        'rgb(16, 185, 129)',
        'rgb(239, 68, 68)',
        'rgb(251, 191, 36)'
    ];
    
    // Adicionar questões expiradas se houver
    if (expired > 0) {
        labels.push('Expiradas');
        data.push(expired);
        backgroundColor.push('rgba(107, 114, 128, 0.8)');
        borderColor.push('rgb(107, 114, 128)');
    }

    performanceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 1.5,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#f8fafc',
                        padding: 15,
                        font: {
                            size: 14
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Criar gráfico de progresso (linha)
function createProgressChart(corrections) {
    const ctx = document.getElementById('progress-chart');
    if (!ctx) return;

    // Agrupar correções por data
    const correctionsByDate = {};
    corrections.forEach(c => {
        if (c.createdAt) {
            const date = new Date(c.createdAt).toLocaleDateString('pt-BR');
            if (!correctionsByDate[date]) {
                correctionsByDate[date] = { correct: 0, total: 0 };
            }
            correctionsByDate[date].total++;
            if (parseFloat(c.grade) >= 7) {
                correctionsByDate[date].correct++;
            }
        }
    });

    const dates = Object.keys(correctionsByDate).sort();
    const correctData = dates.map(d => correctionsByDate[d].correct);
    const totalData = dates.map(d => correctionsByDate[d].total);

    if (progressChart) {
        progressChart.destroy();
    }

    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Corretas',
                    data: correctData,
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7
                },
                {
                    label: 'Total',
                    data: totalData,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 1.5,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#f8fafc',
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#94a3b8'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: '#94a3b8',
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// Renderizar questões
function renderQuestions(questions, answers) {
    const questionsGrid = document.getElementById('questions-grid');
    const answeredQuestionIds = new Set(answers.map(a => a.question?.id).filter(Boolean));

    if (questions.length === 0) {
        questionsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-inbox"></i>
                <h3>Nenhuma questão disponível</h3>
                <p>Aguarde o professor criar questões</p>
            </div>
        `;
        return;
    }

    questionsGrid.innerHTML = questions.map(question => {
        const isAnswered = answeredQuestionIds.has(question.id);
        const answer = answers.find(a => a.question?.id === question.id);

        return `
            <div class="question-card ${isAnswered ? 'answered' : 'pending'}" onclick="viewQuestion(${question.id})">
                <div class="question-title">
                    <i class="fas fa-file-alt"></i> ${escapeHtml(question.title || 'Sem título')}
                </div>
                <div style="margin: 10px 0; color: #94a3b8; font-size: 0.9rem;">
                    ${escapeHtml(question.description?.substring(0, 100) || 'Sem descrição')}${question.description?.length > 100 ? '...' : ''}
                </div>
                ${question.imagePath && question.imagePath.trim() !== '' ? `
                    <img 
                        src="${API}${question.imagePath.startsWith('/') ? question.imagePath : '/' + question.imagePath}" 
                        alt="Questão" 
                        style="max-width: 100%; border-radius: 8px; margin: 10px 0;"
                        onerror="this.style.display='none';"
                    >
                ` : ''}
                <div class="question-meta">
                    <span>
                        <i class="fas fa-calendar"></i> ${formatDate(question.createdAt)}
                    </span>
                    <span class="status-badge ${isAnswered ? 'status-answered' : 'status-pending'}">
                        ${isAnswered ? '<i class="fas fa-check"></i> Respondida' : '<i class="fas fa-clock"></i> Pendente'}
                    </span>
                </div>
                ${answer && answer.corrections && answer.corrections.length > 0 ? `
                    <div style="margin-top: 10px; padding: 10px; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
                        <strong style="color: #10b981;">Nota: ${answer.corrections[0].grade}/10</strong>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Ver questão
function viewQuestion(questionId) {
    window.location.href = `/page/student-questions.html?questionId=${questionId}`;
}

// Função para verificar se uma resposta está correta baseada na nota (enum)
function isCorrectAnswer(correction) {
    if (!correction || !correction.grade) {
        console.log('🔍 DEBUG isCorrectAnswer (dashboard): Sem correção ou nota');
        return false;
    }
    
    // Para múltipla escolha: A, A+, A- são corretas, F é incorreta
    // O sistema atribui Grade.A para corretas e Grade.F para incorretas
    const grade = correction.grade;
    console.log('🔍 DEBUG isCorrectAnswer (dashboard): Grade recebida:', grade);
    
    // Se for nota F, definitivamente incorreta
    if (grade === 'F') {
        console.log('🔍 DEBUG isCorrectAnswer (dashboard): Nota F - Retornando FALSE (incorreta)');
        return false;
    }
    
    // Se for nota A (ou A+, A-), definitivamente correta
    if (grade === 'A' || grade === 'A_PLUS' || grade === 'A_MINUS') {
        console.log('🔍 DEBUG isCorrectAnswer (dashboard): Nota A/A+/A- - Retornando TRUE (correta)');
        return true;
    }
    
    // Para outras notas, considerar baseado no contexto
    // Mas para múltipla escolha automática, apenas A e F são usados
    // Então qualquer coisa que não seja F é considerada correta
    const result = grade !== 'F';
    console.log('🔍 DEBUG isCorrectAnswer (dashboard): Outra nota - Retornando', result);
    return result;
}

// Funções auxiliares
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'Data não disponível';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
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

// Funções de fullscreen
let fullscreenChart = null;
let fullscreenChartType = null;

function toggleFullscreen(chartId) {
    const modal = document.getElementById('fullscreen-modal');
    const title = document.getElementById('fullscreen-title');
    const canvas = document.getElementById('fullscreen-chart');
    
    if (!modal || !canvas) return;
    
    modal.style.display = 'block';
    
    // Determinar qual gráfico
    if (chartId === 'performance-chart') {
        title.innerHTML = '<i class="fas fa-chart-pie"></i> Desempenho Geral';
        fullscreenChartType = 'performance';
        createFullscreenChart(canvas, performanceChart);
    } else if (chartId === 'progress-chart') {
        title.innerHTML = '<i class="fas fa-chart-line"></i> Progresso ao Longo do Tempo';
        fullscreenChartType = 'progress';
        createFullscreenChart(canvas, progressChart);
    }
}

function createFullscreenChart(canvas, originalChart) {
    if (fullscreenChart) {
        fullscreenChart.destroy();
    }
    
    const config = JSON.parse(JSON.stringify(originalChart.config));
    config.options.maintainAspectRatio = false;
    config.options.responsive = true;
    
    // Aumentar tamanhos para fullscreen
    if (config.options.plugins) {
        if (config.options.plugins.legend) {
            config.options.plugins.legend.labels.font.size = 16;
            config.options.plugins.legend.padding = 20;
        }
        if (config.options.plugins.tooltip) {
            config.options.plugins.tooltip.padding = 15;
            config.options.plugins.tooltip.titleFont = { size: 16 };
            config.options.plugins.tooltip.bodyFont = { size: 14 };
        }
    }
    
    if (config.options.scales) {
        Object.keys(config.options.scales).forEach(key => {
            if (config.options.scales[key].ticks) {
                config.options.scales[key].ticks.font = { size: 14 };
            }
        });
    }
    
    fullscreenChart = new Chart(canvas, config);
}

function closeFullscreen() {
    const modal = document.getElementById('fullscreen-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    if (fullscreenChart) {
        fullscreenChart.destroy();
        fullscreenChart = null;
    }
}

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeFullscreen();
    }
});

// Exportar funções globais
window.viewQuestion = viewQuestion;
window.toggleFullscreen = toggleFullscreen;
window.closeFullscreen = closeFullscreen;

