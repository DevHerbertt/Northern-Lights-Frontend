// Configuração
// Função para obter a URL da API (aguarda config.js se necessário)
function getApiBaseUrl() {
    if (window.API || window.API_BASE_URL) {
        return window.API || window.API_BASE_URL;
    }
    const isProduction = window.location.hostname !== 'localhost' && 
                         window.location.hostname !== '127.0.0.1' &&
                         !window.location.hostname.startsWith('192.168.');
    return isProduction 
        ? 'https://northern-lights-api.onrender.com'
        : 'http://localhost:8080';
}
const API_BASE_URL = getApiBaseUrl();
let currentTeachers = [];
let filteredTeachers = [];
let currentPage = 1;
const teachersPerPage = 10;
let teacherToDelete = null;

// Elementos do DOM
// Verificar autenticação antes de carregar a página
function checkAuth() {
    try {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        console.log('🔍 Verificando autenticação...');
        console.log('Token existe:', !!token);
        console.log('User string:', userStr);
        
        if (!token) {
            console.warn('⚠️ Token não encontrado, redirecionando para login...');
            window.location.href = '/page/login.html';
            return false;
        }
        
        if (!userStr) {
            console.warn('⚠️ Dados do usuário não encontrados, redirecionando para login...');
            window.location.href = '/page/login.html';
            return false;
        }
        
        let user = null;
        try {
            user = JSON.parse(userStr);
        } catch (parseError) {
            console.error('❌ Erro ao fazer parse do usuário:', parseError);
            console.warn('⚠️ Dados do usuário inválidos, redirecionando para login...');
            window.location.href = '/page/login.html';
            return false;
        }
        
        if (!user || !user.userName) {
            console.warn('⚠️ Dados do usuário incompletos, redirecionando para login...');
            window.location.href = '/page/login.html';
            return false;
        }
        
        // Verificar role (case-insensitive e mais tolerante)
        const userRole = (user.role || '').toUpperCase();
        console.log('🔍 Role do usuário:', userRole);
        
        // Permitir TEACHER, ADMIN ou qualquer role (removendo restrição por enquanto)
        // Se quiser restringir novamente, descomente as linhas abaixo:
        /*
        if (userRole !== 'TEACHER' && userRole !== 'ADMIN') {
            console.warn('⚠️ Usuário sem permissão para acessar esta página. Role:', userRole);
            alert('Você não tem permissão para acessar esta página. Role necessário: TEACHER ou ADMIN');
            window.location.href = '/page/login.html';
            return false;
        }
        */
        
        console.log('✅ Usuário autenticado:', user.userName, 'Role:', userRole);
        return true;
        
    } catch (error) {
        console.error('❌ Erro crítico em checkAuth:', error);
        window.location.href = '/page/login.html';
        return false;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação primeiro
    if (!checkAuth()) {
        return;
    }
    // Elementos principais
    const searchInput = document.getElementById('searchInput');
    const filterByAge = document.getElementById('filterByAge');
    const sortBy = document.getElementById('sortBy');
    const refreshBtn = document.getElementById('refreshBtn');
    const addTeacherBtn = document.getElementById('addTeacherBtn');
    const teachersTableBody = document.getElementById('teachersTableBody');
    const totalCount = document.getElementById('totalCount');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageNumbers = document.getElementById('pageNumbers');
    
    // Elementos dos modais
    const editModal = document.getElementById('editModal');
    const deleteModal = document.getElementById('deleteModal');
    const detailsModal = document.getElementById('detailsModal');
    const closeEditModal = document.getElementById('closeEditModal');
    const closeDetailsModal = document.getElementById('closeDetailsModal');
    const cancelEdit = document.getElementById('cancelEdit');
    const cancelDelete = document.getElementById('cancelDelete');
    const confirmDelete = document.getElementById('confirmDelete');
    const closeDetails = document.getElementById('closeDetails');
    const editTeacherForm = document.getElementById('editTeacherForm');
    
    // Carregar professores ao iniciar
    loadTeachers();
    
    // Event Listeners para filtros
    searchInput.addEventListener('input', filterAndSortTeachers);
    filterByAge.addEventListener('change', filterAndSortTeachers);
    sortBy.addEventListener('change', filterAndSortTeachers);
    refreshBtn.addEventListener('click', loadTeachers);
    addTeacherBtn.addEventListener('click', () => {
        window.location.href = '/page/DashBoardTeacher-Nav/TeacherCreate.html';
    });
    
    // Event Listeners para paginação
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTeachersTable();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredTeachers.length / teachersPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTeachersTable();
        }
    });
    
    // Event Listeners para fechar modais
    closeEditModal.addEventListener('click', () => editModal.style.display = 'none');
    closeDetailsModal.addEventListener('click', () => detailsModal.style.display = 'none');
    cancelEdit.addEventListener('click', () => editModal.style.display = 'none');
    cancelDelete.addEventListener('click', () => {
        deleteModal.style.display = 'none';
        teacherToDelete = null;
    });
    closeDetails.addEventListener('click', () => detailsModal.style.display = 'none');
    
    // Fechar modais clicando fora
    window.addEventListener('click', (e) => {
        if (e.target === editModal) editModal.style.display = 'none';
        if (e.target === deleteModal) deleteModal.style.display = 'none';
        if (e.target === detailsModal) detailsModal.style.display = 'none';
    });
    
    // Enviar formulário de edição
    editTeacherForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateTeacher();
    });
    
    // Confirmar exclusão
    confirmDelete.addEventListener('click', async () => {
        if (teacherToDelete) {
            await deleteTeacher(teacherToDelete);
            deleteModal.style.display = 'none';
            teacherToDelete = null;
        }
    });
});

// Função para carregar professores da API
async function loadTeachers() {
    try {
        showLoading();
        
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('❌ Token não encontrado no localStorage');
            showError('Token não encontrado. Faça login novamente.');
            // Redirecionar para login
            setTimeout(() => {
                window.location.href = '/page/login.html';
            }, 2000);
            return;
        }
        
        console.log('🔐 Token encontrado, fazendo requisição para:', `${API_BASE_URL}/teachers`);
        console.log('🔑 Token preview:', token.substring(0, 20) + '...');
        
        // Verificar dados do usuário
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        console.log('👤 Usuário:', user);
        console.log('👤 Role do usuário:', user?.role);
        
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        console.log('📤 Headers da requisição:', headers);
        console.log('🌐 URL completa:', `${API_BASE_URL}/teachers`);
        
        const response = await fetch(`${API_BASE_URL}/teachers`, {
            method: 'GET',
            headers: headers
        });
        
        console.log('📡 Resposta recebida:', response.status, response.statusText);
        console.log('📡 Headers da resposta:', Object.fromEntries(response.headers.entries()));
        
        if (response.status === 401) {
            // Token inválido ou expirado - redirecionar para login
            const errorText = await response.text();
            console.error('❌ Erro 401 - Token inválido:', errorText);
            
            // Limpar dados de autenticação
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            showError('Sessão expirada. Faça login novamente.');
            
            // Redirecionar para login após 3 segundos
            setTimeout(() => {
                window.location.href = '/page/login.html';
            }, 3000);
            return;
        }
        
        if (response.status === 403) {
            // Erro 403 - pode ser CORS, permissões ou token sem permissão
            let errorText = '';
            try {
                errorText = await response.text();
            } catch (e) {
                errorText = 'Não foi possível ler a mensagem de erro';
            }
            
            // Obter dados do usuário para debug
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            
            console.error('❌ Erro 403 - Acesso negado');
            console.error('📝 Mensagem do servidor:', errorText);
            console.error('🔑 Token usado:', token.substring(0, 30) + '...');
            console.error('👤 Usuário:', user);
            console.error('👤 Role do usuário:', user?.role);
            console.error('🌐 URL da requisição:', `${API_BASE_URL}/teachers`);
            console.error('📤 Headers enviados:', {
                'Authorization': `Bearer ${token.substring(0, 20)}...`,
                'Content-Type': 'application/json'
            });
            console.warn('⚠️ Possíveis causas:');
            console.warn('  1. CORS não configurado no backend para aceitar requisições do Vercel');
            console.warn('  2. Usuário sem permissão (role) para acessar /teachers');
            console.warn('  3. Token válido mas sem as permissões necessárias');
            console.warn('  4. Endpoint /teachers requer autenticação específica');
            
            // Verificar se é erro de CORS
            const corsHeaders = response.headers.get('Access-Control-Allow-Origin');
            if (!corsHeaders) {
                console.error('🚫 ERRO DE CORS DETECTADO: Backend não está enviando header Access-Control-Allow-Origin');
            } else {
                console.log('✅ CORS configurado:', corsHeaders);
            }
            
            // Mostrar mensagem de erro mais detalhada
            const errorMessage = `
                <div style="text-align: left; padding: 20px;">
                    <h3 style="color: #ff6b6b; margin-bottom: 15px;">
                        <i class="fas fa-exclamation-triangle"></i> Erro 403 - Acesso Negado
                    </h3>
                    <p><strong>Possíveis causas:</strong></p>
                    <ul style="text-align: left; margin-left: 20px;">
                        <li>CORS não configurado no backend para aceitar requisições do Vercel</li>
                        <li>Usuário sem permissão (role: ${user?.role || 'N/A'}) para acessar este recurso</li>
                        <li>Token válido mas sem as permissões necessárias</li>
                        <li>Endpoint requer autenticação específica</li>
                    </ul>
                    <p style="margin-top: 15px;"><strong>Mensagem do servidor:</strong></p>
                    <pre style="background: rgba(0,0,0,0.1); padding: 10px; border-radius: 5px; overflow-x: auto; font-size: 0.85em;">${errorText || 'Nenhuma mensagem'}</pre>
                    <p style="margin-top: 15px; color: #666; font-size: 0.9em;">
                        <i class="fas fa-info-circle"></i> Verifique o console (F12) para mais detalhes.
                    </p>
                </div>
            `;
            
            showError(errorMessage);
            
            // Não redirecionar automaticamente - deixar o usuário decidir
            return;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro na requisição:', response.status, errorText);
            throw new Error(`Erro ${response.status}: ${errorText || response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Professores carregados:', data);
        
        currentTeachers = data;
        
        // Processar os dados recebidos do backend
        currentTeachers = currentTeachers.map(teacher => ({
            ...teacher,
            // Usar a data de criação real do backend (createAt)
            createdAt: teacher.createAt ? formatDateTime(teacher.createAt) : 'Não informado',
            // Determinar status baseado na data de criação (exemplo)
            status: determineStatus(teacher.createAt)
        }));
        
        filterAndSortTeachers();
        hideLoading();
        
    } catch (error) {
        console.error('❌ Erro ao carregar professores:', error);
        hideLoading();
        showError('Erro ao carregar professores: ' + error.message);
    }
}

// Função para filtrar e ordenar professores
function filterAndSortTeachers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const ageFilter = document.getElementById('filterByAge').value;
    const sortOption = document.getElementById('sortBy').value;
    
    // Filtrar
    filteredTeachers = currentTeachers.filter(teacher => {
        // Filtrar por busca
        const matchesSearch = !searchTerm || 
            (teacher.userName && teacher.userName.toLowerCase().includes(searchTerm)) ||
            (teacher.email && teacher.email.toLowerCase().includes(searchTerm));
        
        // Filtrar por idade
        let matchesAge = true;
        if (ageFilter && teacher.age) {
            const [minAge, maxAge] = ageFilter.split('-').map(Number);
            matchesAge = teacher.age >= minAge && teacher.age <= maxAge;
        }
        
        return matchesSearch && matchesAge;
    });
    
    // Ordenar
    filteredTeachers.sort((a, b) => {
        switch (sortOption) {
            case 'name-asc':
                return (a.userName || '').localeCompare(b.userName || '');
            case 'name-desc':
                return (b.userName || '').localeCompare(a.userName || '');
            case 'age-asc':
                return (a.age || 0) - (b.age || 0);
            case 'age-desc':
                return (b.age || 0) - (a.age || 0);
            case 'newest':
                // Ordenar por data de criação (mais recente primeiro)
                if (!a.createAt && !b.createAt) return 0;
                if (!a.createAt) return 1;
                if (!b.createAt) return -1;
                return new Date(b.createAt) - new Date(a.createAt);
            case 'oldest':
                // Ordenar por data de criação (mais antigo primeiro)
                if (!a.createAt && !b.createAt) return 0;
                if (!a.createAt) return 1;
                if (!b.createAt) return -1;
                return new Date(a.createAt) - new Date(b.createAt);
            default:
                return 0;
        }
    });
    
    currentPage = 1;
    renderTeachersTable();
}

// Função para renderizar a tabela
function renderTeachersTable() {
    const teachersTableBody = document.getElementById('teachersTableBody');
    const totalCount = document.getElementById('totalCount');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const pageNumbers = document.getElementById('pageNumbers');
    
    // Calcular paginação
    const totalTeachers = filteredTeachers.length;
    const totalPages = Math.ceil(totalTeachers / teachersPerPage);
    const startIndex = (currentPage - 1) * teachersPerPage;
    const endIndex = Math.min(startIndex + teachersPerPage, totalTeachers);
    const paginatedTeachers = filteredTeachers.slice(startIndex, endIndex);
    
    // Atualizar informações
    totalCount.textContent = `${totalTeachers} professores`;
    paginationInfo.textContent = `Mostrando ${startIndex + 1}-${endIndex} de ${totalTeachers} professores`;
    pageNumbers.textContent = `Página ${currentPage} de ${totalPages}`;
    
    // Atualizar botões de paginação
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    // Renderizar tabela
    if (paginatedTeachers.length === 0) {
        teachersTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="loading-cell">
                    <div style="text-align: center; color: var(--gray-color);">
                        <i class="fas fa-users-slash" style="font-size: 2rem; margin-bottom: 10px;"></i>
                        <p>Nenhum professor encontrado</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    let tableHTML = '';
    
    paginatedTeachers.forEach(teacher => {
        tableHTML += `
            <tr>
                <td>${teacher.id || '-'}</td>
                <td>${teacher.userName || '-'}</td>
                <td>${teacher.email || '-'}</td>
                <td>${teacher.age || '-'}</td>
                <td>${formatDateForTable(teacher.createAt) || '-'}</td>
                <td>
                    <span class="status-badge status-${teacher.status === 'Ativo' ? 'active' : 'inactive'}">
                        ${teacher.status || 'Ativo'}
                    </span>
                </td>
                <td class="actions-cell">
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary btn-icon" 
                                onclick="showTeacherDetails(${teacher.id})" 
                                title="Ver detalhes">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-warning btn-icon" 
                                onclick="editTeacher(${teacher.id})" 
                                title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-icon" 
                                onclick="confirmDeleteTeacher(${teacher.id})" 
                                title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    teachersTableBody.innerHTML = tableHTML;
}

// Função para mostrar detalhes do professor
async function showTeacherDetails(teacherId) {
    try {
        const teacher = currentTeachers.find(t => t.id === teacherId);
        if (!teacher) {
            throw new Error('Professor não encontrado');
        }
        
        // Preencher modal de detalhes com dados reais do backend
        document.getElementById('detailId').textContent = teacher.id || '-';
        document.getElementById('detailName').textContent = teacher.userName || '-';
        document.getElementById('detailEmail').textContent = teacher.email || '-';
        document.getElementById('detailAge').textContent = teacher.age || '-';
        document.getElementById('detailClassRoom').textContent = teacher.classRoom || 'Não informado';
        document.getElementById('detailCreatedAt').textContent = formatDateTime(teacher.createAt) || '-';
        document.getElementById('detailStatus').textContent = teacher.status || 'Ativo';
        
        // Adicionar informações extras se disponíveis
        const detailElement = document.getElementById('detailRole');
        if (detailElement) {
            detailElement.textContent = teacher.role || 'TEACHER';
        }
        
        // Mostrar modal
        document.getElementById('detailsModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        alert('Erro ao carregar detalhes do professor: ' + error.message);
    }
}

// Função para editar professor
async function editTeacher(teacherId) {
    try {
        const teacher = currentTeachers.find(t => t.id === teacherId);
        if (!teacher) {
            throw new Error('Professor não encontrado');
        }
        
        // Preencher formulário de edição
        document.getElementById('editTeacherId').value = teacher.id;
        document.getElementById('editTeacherName').value = teacher.userName || '';
        document.getElementById('editTeacherEmail').value = teacher.email || '';
        document.getElementById('editTeacherAge').value = teacher.age || '';
        document.getElementById('editTeacherClassRoom').value = teacher.classRoom || '';
        document.getElementById('editResetPassword').checked = false;
        
        // Mostrar modal
        document.getElementById('editModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Erro ao carregar dados para edição:', error);
        alert('Erro ao carregar dados do professor: ' + error.message);
    }
}

// Função para atualizar professor
async function updateTeacher() {
    try {
        const teacherId = document.getElementById('editTeacherId').value;
        const resetPassword = document.getElementById('editResetPassword').checked;
        
        const teacherData = {
            userName: document.getElementById('editTeacherName').value.trim(),
            email: document.getElementById('editTeacherEmail').value.trim(),
            age: parseInt(document.getElementById('editTeacherAge').value),
            classRoom: document.getElementById('editTeacherClassRoom').value.trim()
        };
        
        // Validar dados
        if (!teacherData.userName || teacherData.userName.length < 3) {
            alert('O nome deve ter pelo menos 3 caracteres.');
            return;
        }
        
        if (!teacherData.email || !teacherData.email.includes('@')) {
            alert('Por favor, insira um e-mail válido.');
            return;
        }
        
        if (!teacherData.age || teacherData.age < 18 || teacherData.age > 80) {
            alert('A idade deve estar entre 18 e 80 anos.');
            return;
        }
        
        // Se marcar para redefinir senha, gerar uma temporária
        if (resetPassword) {
            const tempPassword = generateTempPassword();
            teacherData.passWord = tempPassword;
            alert(`Senha temporária gerada: ${tempPassword}\nEsta senha será enviada por e-mail ao professor.`);
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Token não encontrado. Faça login novamente.');
        }
        
        // Mostrar indicador de carregamento
        const submitBtn = editTeacherForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        submitBtn.disabled = true;
        
        const response = await fetch(`${API_BASE_URL}/teachers/${teacherId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(teacherData)
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            alert('Sessão expirada. Faça login novamente.');
            window.location.href = '/page/login.html';
            return;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ${response.status}: ${errorText || response.statusText}`);
        }
        
        const updatedTeacher = await response.json();
        
        // Fechar modal e atualizar lista
        document.getElementById('editModal').style.display = 'none';
        alert('Professor atualizado com sucesso!');
        loadTeachers();
        
    } catch (error) {
        console.error('Erro ao atualizar professor:', error);
        alert('Erro ao atualizar professor: ' + error.message);
    } finally {
        // Restaurar botão
        const submitBtn = editTeacherForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
        submitBtn.disabled = false;
    }
}

// Função para confirmar exclusão
function confirmDeleteTeacher(teacherId) {
    const teacher = currentTeachers.find(t => t.id === teacherId);
    if (!teacher) return;
    
    teacherToDelete = teacherId;
    document.getElementById('deleteMessage').textContent = 
        `Tem certeza que deseja excluir o professor "${teacher.userName}"? Esta ação não pode ser desfeita.`;
    document.getElementById('deleteModal').style.display = 'flex';
}

// Função para excluir professor
async function deleteTeacher(teacherId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Token não encontrado. Faça login novamente.');
        }
        
        const response = await fetch(`${API_BASE_URL}/teachers/${teacherId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            alert('Sessão expirada. Faça login novamente.');
            window.location.href = '/page/login.html';
            return;
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ${response.status}: ${errorText || response.statusText}`);
        }
        
        alert('Professor excluído com sucesso!');
        loadTeachers();
        
    } catch (error) {
        console.error('Erro ao excluir professor:', error);
        alert('Erro ao excluir professor: ' + error.message);
    }
}

// Função para gerar senha temporária
function generateTempPassword() {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

// Função para mostrar estado de carregamento
function showLoading() {
    const teachersTableBody = document.getElementById('teachersTableBody');
    teachersTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="loading-cell">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i> Carregando professores...
                </div>
            </td>
        </tr>
    `;
    document.getElementById('totalCount').textContent = 'Carregando...';
}

// Função para mostrar erro
function showError(message) {
    const teachersTableBody = document.getElementById('teachersTableBody');
    teachersTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="loading-cell">
                <div style="text-align: center; color: var(--danger-color);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>${message}</p>
                    <button class="btn btn-secondary" onclick="loadTeachers()">
                        <i class="fas fa-redo"></i> Tentar novamente
                    </button>
                </div>
            </td>
        </tr>
    `;
    document.getElementById('totalCount').textContent = 'Erro ao carregar';
}

// Função para formatar data para tabela (data curta)
function formatDateForTable(dateString) {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        // Formato: DD/MM/AAAA
        return date.toLocaleDateString('pt-BR');
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return '-';
    }
}

// Função para formatar data e hora completo
function formatDateTime(dateString) {
    if (!dateString) return 'Não informado';
    try {
        const date = new Date(dateString);
        // Formato: DD/MM/AAAA HH:MM
        return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })}`;
    } catch (error) {
        console.error('Erro ao formatar data/hora:', error);
        return 'Não informado';
    }
}

// Função para determinar status baseado na data de criação
function determineStatus(createAt) {
    if (!createAt) return 'Ativo';
    
    try {
        const createDate = new Date(createAt);
        const now = new Date();
        const diffInDays = Math.floor((now - createDate) / (1000 * 60 * 60 * 24));
        
        // Exemplo: se criado há mais de 30 dias, considerar "Inativo"
        if (diffInDays > 30) {
            return 'Inativo';
        }
        
        return 'Ativo';
    } catch (error) {
        return 'Ativo';
    }
}

// Função para atualizar estatísticas em tempo real
async function updateStats() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await fetch(`${API_BASE_URL}/teachers/quantity`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const quantityData = await response.json();
            // Aqui você pode atualizar algum contador se necessário
            console.log('Quantidade de professores atualizada:', quantityData);
        }
    } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error);
    }
}

// Atualizar estatísticas periodicamente
setInterval(updateStats, 30000); // A cada 30 segundos