// questions-manager.js
// Usar API configurada em config.js
if (typeof window.API === 'undefined') {
    window.API = "http://localhost:8080";
}
const API = (function() { return window.API; })();
let editingQuestionId = null;
let optionCounter = 0;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    setupTabs();
    setupFormHandlers();
    setupMultipleQuestionsMode();
    await loadQuestions();
    setupEventListeners();
});

// Configurar abas
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            // Atualizar botões
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Atualizar conteúdos
            tabContents.forEach(c => c.classList.remove('active'));
            document.getElementById(`${targetTab}-tab`).classList.add('active');

            // Recarregar lista se necessário
            if (targetTab === 'list') {
                loadQuestions();
            }
        });
    });
}

// Configurar handlers do formulário
function setupFormHandlers() {
    const form = document.getElementById('create-question-form');
    const questionType = document.getElementById('question-type');
    const hasHelpCheckbox = document.getElementById('has-help-checkbox');
    const imageUploadArea = document.getElementById('image-upload-area');
    const questionImage = document.getElementById('question-image');
    const addOptionBtn = document.getElementById('add-option-btn');

    // Toggle tipo de questão
    questionType.addEventListener('change', (e) => {
        const optionsContainer = document.getElementById('options-container');
        if (e.target.value === 'MULTIPLE_CHOICE') {
            optionsContainer.style.display = 'block';
            if (document.getElementById('options-list').children.length === 0) {
                addOption();
                addOption();
            }
        } else {
            optionsContainer.style.display = 'none';
        }
    });

    // Toggle ajuda em português
    hasHelpCheckbox.addEventListener('change', (e) => {
        const container = document.getElementById('help-translation-container');
        container.style.display = e.target.checked ? 'block' : 'none';
    });

    // Upload de imagem
    imageUploadArea.addEventListener('click', () => questionImage.click());
    questionImage.addEventListener('change', handleImageUpload);
    document.getElementById('remove-image-btn')?.addEventListener('click', removeImage);

    // Adicionar opção
    addOptionBtn?.addEventListener('click', addOption);

    // Submit do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createQuestion();
    });
}

// Adicionar opção de múltipla escolha
function addOption() {
    optionCounter++;
    const optionsList = document.getElementById('options-list');
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-item';
    optionDiv.id = `option-${optionCounter}`;
    optionDiv.innerHTML = `
        <input 
            type="text" 
            class="form-input" 
            placeholder="Digite a opção de resposta..."
            required
        >
        <input 
            type="radio" 
            name="correct-option" 
            value="${optionCounter}"
            required
        >
        <label style="color: #10b981; font-weight: 600; white-space: nowrap;">Correta</label>
        <button type="button" class="btn btn-danger" onclick="removeOption(${optionCounter})" style="padding: 8px 12px;">
            <i class="fas fa-trash"></i>
        </button>
    `;
    optionsList.appendChild(optionDiv);
}

// Remover opção
function removeOption(id) {
    document.getElementById(`option-${id}`)?.remove();
}

// Upload de imagem
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
        showMessage('Por favor, selecione uma imagem válida', 'error');
        return;
    }

    // Validar tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
        showMessage('A imagem deve ter no máximo 5MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('preview-img');
        const previewContainer = document.getElementById('image-preview');
        preview.src = e.target.result;
        previewContainer.style.display = 'block';
        document.getElementById('image-upload-area').classList.add('has-image');
    };
    reader.readAsDataURL(file);
}

// Remover imagem
function removeImage() {
    document.getElementById('question-image').value = '';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('image-upload-area').classList.remove('has-image');
}

// Criar questão
async function createQuestion() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        showMessage('Erro: Você não está autenticado. Faça login novamente.', 'error');
        window.location.href = '/page/login.html';
        return;
    }
    
    const title = document.getElementById('question-title').value.trim();
    const description = document.getElementById('question-description').value.trim();
    const questionType = document.getElementById('question-type').value;
    const hasHelp = document.getElementById('has-help-checkbox').checked;
    const translation = hasHelp ? document.getElementById('question-translation').value.trim() : null;
    const imageFile = document.getElementById('question-image').files[0];
    const expiresAtInput = document.getElementById('question-expires-at').value;
    // Converter datetime-local para ISO string (formato que o backend espera)
    // datetime-local retorna formato "YYYY-MM-DDTHH:mm" (sem timezone)
    // Precisamos converter para ISO string com timezone
    let expiresAt = null;
    if (expiresAtInput) {
        // datetime-local já está no formato correto, mas precisamos adicionar timezone
        // Criar Date object e converter para ISO
        const date = new Date(expiresAtInput);
        expiresAt = date.toISOString();
    }
    
    const visibleAtInput = document.getElementById('question-visible-at').value;
    let visibleAt = null;
    if (visibleAtInput) {
        const date = new Date(visibleAtInput);
        visibleAt = date.toISOString();
    }
    
    console.log('🔍 DEBUG: Datas capturadas:', {
        expiresAtInput: expiresAtInput,
        expiresAt: expiresAt,
        visibleAtInput: visibleAtInput,
        visibleAt: visibleAt
    });

    if (!title || !description) {
        showMessage('Título e descrição são obrigatórios', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('questionType', questionType);
    formData.append('multipleChoice', questionType === 'MULTIPLE_CHOICE' ? 'true' : 'false');
    
    if (translation) {
        formData.append('portugueseTranslation', translation);
        formData.append('hasHelp', 'true');
    }

    if (expiresAt) {
        formData.append('expiresAt', expiresAt);
    }

    if (visibleAt) {
        formData.append('visibleAt', visibleAt);
    }

    if (imageFile) {
        formData.append('imageFile', imageFile);
    }

    // Adicionar opções se for múltipla escolha
    if (questionType === 'MULTIPLE_CHOICE') {
        const options = [];
        const optionItems = document.querySelectorAll('.option-item');
        const correctOption = document.querySelector('input[name="correct-option"]:checked')?.value;

        optionItems.forEach((item, index) => {
            const text = item.querySelector('input[type="text"]').value.trim();
            if (text) {
                options.push({
                    text: text,
                    correct: (index + 1).toString() === correctOption
                });
            }
        });

        if (options.length < 2) {
            showMessage('Múltipla escolha precisa de pelo menos 2 opções', 'error');
            return;
        }

        if (!correctOption) {
            showMessage('Selecione a opção correta', 'error');
            return;
        }

        formData.append('options', JSON.stringify(options));
    }

    try {
        console.log('🔍 DEBUG: Enviando requisição para criar questão');
        console.log('🔍 DEBUG: Token presente:', !!token);
        console.log('🔍 DEBUG: Token length:', token ? token.length : 0);
        console.log('🔍 DEBUG: expiresAt:', expiresAt);
        console.log('🔍 DEBUG: visibleAt:', visibleAt);
        
        const response = await fetch(`${API}/questions/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        console.log('🔍 DEBUG: Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Erro HTTP: ${response.status}`);
        }

        const question = await response.json();
        showMessage('Questão criada com sucesso!', 'success');
        
        // Limpar formulário
        document.getElementById('create-question-form').reset();
        document.getElementById('options-list').innerHTML = '';
        document.getElementById('image-preview').style.display = 'none';
        document.getElementById('image-upload-area').classList.remove('has-image');
        document.getElementById('help-translation-container').style.display = 'none';
        document.getElementById('has-help-checkbox').checked = false;
        optionCounter = 0;

        // Recarregar lista
        await loadQuestions();

    } catch (error) {
        console.error('Erro ao criar questão:', error);
        showMessage('Erro ao criar questão: ' + error.message, 'error');
    }
}

// Carregar questões
async function loadQuestions() {
    const token = localStorage.getItem('token');
    const questionsGrid = document.getElementById('questions-grid');

    try {
        questionsGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

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
            questionsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <i class="fas fa-inbox"></i>
                    <h3>Nenhuma questão encontrada</h3>
                    <p>Crie sua primeira questão usando a aba "Criar Questão"</p>
                </div>
            `;
            return;
        }

        questionsGrid.innerHTML = questions.map(q => `
            <div class="question-card">
                <div class="question-card-header">
                    <div style="flex: 1;">
                        <div class="question-card-title">${escapeHtml(q.title || 'Sem título')}</div>
                        <div style="display: flex; gap: 10px; margin-top: 10px;">
                            <span class="badge badge-type">${q.type || 'TEXT'}</span>
                            ${q.hasHelp ? '<span class="badge badge-help"><i class="fas fa-question-circle"></i> Tem Ajuda</span>' : ''}
                        </div>
                    </div>
                </div>
                <div class="question-card-description">
                    ${escapeHtml(q.description?.substring(0, 150) || 'Sem descrição')}${q.description?.length > 150 ? '...' : ''}
                </div>
                ${q.imagePath && q.imagePath.trim() !== '' ? `
                    <img 
                        src="${API}${q.imagePath.startsWith('/') ? q.imagePath : '/' + q.imagePath}" 
                        alt="Questão" 
                        style="max-width: 100%; border-radius: 8px; margin: 10px 0;"
                        onerror="this.style.display='none'; console.warn('Imagem não encontrada: ${q.imagePath}');"
                    >
                ` : ''}
                <div class="question-card-actions">
                    <button class="btn btn-primary" onclick="editQuestion(${q.id})" style="flex: 1;">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger" onclick="deleteQuestion(${q.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Erro ao carregar questões:', error);
        questionsGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar questões</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Editar questão
async function editQuestion(questionId) {
    editingQuestionId = questionId;
    
    // Mudar para aba de edição
    document.querySelector('[data-tab="edit"]').click();
    
    const token = localStorage.getItem('token');
    const container = document.getElementById('edit-question-container');

    try {
        const response = await fetch(`${API}/questions/${questionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar questão');
        }

        const question = await response.json();

        container.innerHTML = `
            <form id="edit-question-form">
                <div class="form-group">
                    <label class="form-label">Título <span class="required">*</span></label>
                    <input type="text" class="form-input" id="edit-title" value="${escapeHtml(question.title || '')}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Descrição <span class="required">*</span></label>
                    <textarea 
                        class="form-textarea" 
                        id="edit-description" 
                        required
                        rows="6"
                        style="line-height: 1.6; font-size: 1rem; padding: 15px;"
                        placeholder="Digite a descrição ou enunciado da questão...&#10;&#10;Dica: Você pode usar quebras de linha, tópicos com &quot;-&quot; ou &quot;*&quot;, e listas numeradas para melhor organização."
                    >${escapeHtml(question.description || '')}</textarea>
                </div>
                <div class="form-group">
                    <div class="help-section">
                        <div class="help-toggle">
                            <input type="checkbox" id="edit-has-help" ${question.hasHelp ? 'checked' : ''}>
                            <label for="edit-has-help">
                                <i class="fas fa-question-circle"></i> Adicionar ajuda em português
                            </label>
                        </div>
                        <div id="edit-help-container" style="display: ${question.hasHelp ? 'block' : 'none'};">
                            <label class="form-label" style="color: #fbbf24;">Tradução/Ajuda</label>
                            <textarea 
                                class="form-textarea" 
                                id="edit-translation"
                                rows="4"
                                style="line-height: 1.6; font-size: 1rem; padding: 15px;"
                                placeholder="Digite a tradução ou explicação em português...&#10;&#10;Dica: Você pode usar quebras de linha, tópicos com &quot;-&quot; ou &quot;*&quot;, e listas numeradas."
                            >${escapeHtml(question.portugueseTranslation || '')}</textarea>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo</label>
                    <select class="form-select" id="edit-type">
                        <option value="TEXT" ${question.type === 'TEXT' ? 'selected' : ''}>Texto Livre</option>
                        <option value="MULTIPLE_CHOICE" ${question.type === 'MULTIPLE_CHOICE' ? 'selected' : ''}>Múltipla Escolha</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Data de Expiração</label>
                    <input 
                        type="datetime-local" 
                        class="form-input" 
                        id="edit-expires-at"
                        value="${question.expiresAt ? new Date(question.expiresAt).toISOString().slice(0, 16) : ''}"
                    >
                    <small style="color: #94a3b8; font-size: 0.85rem; margin-top: 5px; display: block;">
                        <i class="fas fa-info-circle"></i> Após esta data, os alunos não poderão mais responder esta questão
                    </small>
                </div>
                <div class="form-group">
                    <label class="form-label">Data de Visibilidade</label>
                    <input 
                        type="datetime-local" 
                        class="form-input" 
                        id="edit-visible-at"
                        value="${question.visibleAt ? new Date(question.visibleAt).toISOString().slice(0, 16) : ''}"
                    >
                    <small style="color: #94a3b8; font-size: 0.85rem; margin-top: 5px; display: block;">
                        <i class="fas fa-info-circle"></i> Data em que a questão ficará visível para os alunos
                    </small>
                </div>
                <div style="display: flex; gap: 15px; margin-top: 30px;">
                    <button type="submit" class="btn btn-success" style="flex: 1;">
                        <i class="fas fa-save"></i> Salvar Alterações
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="cancelEdit()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                </div>
            </form>
        `;

        // Setup handlers
        document.getElementById('edit-has-help').addEventListener('change', (e) => {
            document.getElementById('edit-help-container').style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('edit-question-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateQuestion(questionId);
        });

    } catch (error) {
        console.error('Erro ao carregar questão:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar questão</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Atualizar questão
async function updateQuestion(questionId) {
    const token = localStorage.getItem('token');
    const title = document.getElementById('edit-title').value.trim();
    const description = document.getElementById('edit-description').value.trim();
    const hasHelp = document.getElementById('edit-has-help').checked;
    const translation = hasHelp ? document.getElementById('edit-translation').value.trim() : null;
    const expiresAtInput = document.getElementById('edit-expires-at').value;
    const expiresAt = expiresAtInput ? new Date(expiresAtInput).toISOString() : null;
    const visibleAtInput = document.getElementById('edit-visible-at').value;
    const visibleAt = visibleAtInput ? new Date(visibleAtInput).toISOString() : null;

    if (!title || !description) {
        showMessage('Título e descrição são obrigatórios', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    
    if (expiresAt) {
        formData.append('expiresAt', expiresAt);
    }
    
    if (visibleAt) {
        formData.append('visibleAt', visibleAt);
    }
    
    if (translation) {
        formData.append('portugueseTranslation', translation);
        formData.append('hasHelp', 'true');
    } else {
        formData.append('hasHelp', 'false');
    }

    try {
        const response = await fetch(`${API}/questions/${questionId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Erro HTTP: ${response.status}`);
        }

        showMessage('Questão atualizada com sucesso!', 'success');
        await loadQuestions();
        
        // Voltar para aba de listagem
        document.querySelector('[data-tab="list"]').click();

    } catch (error) {
        console.error('Erro ao atualizar questão:', error);
        showMessage('Erro ao atualizar questão: ' + error.message, 'error');
    }
}

// Deletar questão
async function deleteQuestion(questionId) {
    if (!confirm('Tem certeza que deseja excluir esta questão?')) {
        return;
    }

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API}/questions/${questionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao excluir questão');
        }

        showMessage('Questão excluída com sucesso!', 'success');
        await loadQuestions();

    } catch (error) {
        console.error('Erro ao excluir questão:', error);
        showMessage('Erro ao excluir questão: ' + error.message, 'error');
    }
}

// Cancelar edição
function cancelEdit() {
    editingQuestionId = null;
    document.querySelector('[data-tab="list"]').click();
}

// Configurar modo de múltiplas questões
function setupMultipleQuestionsMode() {
    const modeSingleBtn = document.getElementById('mode-single-btn');
    const modeMultipleBtn = document.getElementById('mode-multiple-btn');
    const singleMode = document.getElementById('single-question-mode');
    const multipleMode = document.getElementById('multiple-questions-mode');
    const addQuestionItemBtn = document.getElementById('add-question-item-btn');
    const saveAllBtn = document.getElementById('save-all-questions-btn');
    const clearAllBtn = document.getElementById('clear-all-questions-btn');

    if (modeSingleBtn && modeMultipleBtn) {
        modeSingleBtn.addEventListener('click', () => {
            modeSingleBtn.classList.remove('btn-secondary');
            modeSingleBtn.classList.add('btn-primary');
            modeMultipleBtn.classList.remove('btn-primary');
            modeMultipleBtn.classList.add('btn-secondary');
            singleMode.style.display = 'block';
            multipleMode.style.display = 'none';
        });

        modeMultipleBtn.addEventListener('click', () => {
            modeMultipleBtn.classList.remove('btn-secondary');
            modeMultipleBtn.classList.add('btn-primary');
            modeSingleBtn.classList.remove('btn-primary');
            modeSingleBtn.classList.add('btn-secondary');
            singleMode.style.display = 'none';
            multipleMode.style.display = 'block';
            if (document.getElementById('multiple-questions-container').children.length === 0) {
                addQuestionItem();
            }
        });
    }

    if (addQuestionItemBtn) {
        addQuestionItemBtn.addEventListener('click', addQuestionItem);
    }

    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', async () => {
            await saveAllQuestions();
        });
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja limpar todas as questões?')) {
                document.getElementById('multiple-questions-container').innerHTML = '';
                addQuestionItem();
            }
        });
    }
}

// Adicionar item de questão no modo múltiplo
let questionItemCounter = 0;
function addQuestionItem() {
    questionItemCounter++;
    const container = document.getElementById('multiple-questions-container');
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item-card';
    questionDiv.id = `question-item-${questionItemCounter}`;
    questionDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="color: #8b5cf6; margin: 0;">
                <i class="fas fa-file-alt"></i> Questão ${questionItemCounter}
            </h3>
            <button type="button" class="btn btn-danger" onclick="removeQuestionItem(${questionItemCounter})" style="padding: 8px 16px;">
                <i class="fas fa-trash"></i> Remover
            </button>
        </div>
        <div class="form-group">
            <label class="form-label">Título <span class="required">*</span></label>
            <input type="text" class="form-input question-title-input" placeholder="Digite o título da questão..." required>
        </div>
        <div class="form-group">
            <label class="form-label">Descrição/Enunciado <span class="required">*</span></label>
            <textarea 
                class="form-textarea question-description-input" 
                placeholder="Digite a descrição ou enunciado da questão...&#10;&#10;Dica: Você pode usar quebras de linha, tópicos com &quot;-&quot; ou &quot;*&quot;, e listas numeradas para melhor organização." 
                required
                rows="6"
                style="line-height: 1.6; font-size: 1rem; padding: 15px;"
            ></textarea>
        </div>
        <div class="form-group">
            <div class="help-section">
                <div class="help-toggle">
                    <input type="checkbox" class="question-has-help-input" id="has-help-${questionItemCounter}">
                    <label for="has-help-${questionItemCounter}">
                        <i class="fas fa-question-circle"></i> Adicionar ajuda em português
                    </label>
                </div>
                <div class="question-translation-container" id="translation-${questionItemCounter}" style="display: none;">
                    <label class="form-label" style="color: #fbbf24;">Tradução/Ajuda em Português</label>
                    <textarea 
                        class="form-textarea question-translation-input" 
                        placeholder="Digite a tradução ou explicação em português...&#10;&#10;Dica: Você pode usar quebras de linha, tópicos com &quot;-&quot; ou &quot;*&quot;, e listas numeradas."
                        rows="4"
                        style="line-height: 1.6; font-size: 1rem; padding: 15px;"
                    ></textarea>
                </div>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">Tipo de Questão</label>
            <select class="form-select question-type-input" id="question-type-${questionItemCounter}">
                <option value="TEXT">Texto Livre</option>
                <option value="MULTIPLE_CHOICE">Múltipla Escolha</option>
            </select>
        </div>
        <div class="question-options-container" id="options-container-${questionItemCounter}" style="display: none;">
            <div class="form-group">
                <label class="form-label">Opções de Resposta</label>
                <div class="question-options-list" id="options-list-${questionItemCounter}">
                    <!-- Opções serão adicionadas aqui -->
                </div>
                <button type="button" class="btn btn-success" onclick="addOptionToQuestion(${questionItemCounter})" style="margin-top: 10px;">
                    <i class="fas fa-plus"></i> Adicionar Opção
                </button>
            </div>
        </div>
        <div class="form-group">
            <label class="form-label">
                <i class="fas fa-image"></i> Imagem da Questão (Opcional)
            </label>
            <div class="image-upload-area" id="image-upload-area-${questionItemCounter}" style="border: 2px dashed rgba(59, 130, 246, 0.5); border-radius: 8px; padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s ease; background: rgba(15, 23, 42, 0.3);">
                <input 
                    type="file" 
                    class="question-image-input" 
                    id="question-image-${questionItemCounter}" 
                    accept="image/*" 
                    style="display: none;"
                    onchange="handleImageUploadForQuestion(${questionItemCounter}, event)"
                >
                <label for="question-image-${questionItemCounter}" style="cursor: pointer; display: block;">
                    <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: #3b82f6; margin-bottom: 10px;"></i>
                    <p style="color: #94a3b8; margin: 10px 0;">
                        <span id="image-label-${questionItemCounter}">Clique para escolher uma imagem</span>
                    </p>
                    <p style="color: #64748b; font-size: 0.85rem;">PNG, JPG ou GIF até 5MB</p>
                </label>
                <div id="image-preview-${questionItemCounter}" style="display: none; margin-top: 15px;">
                    <img id="preview-img-${questionItemCounter}" src="" alt="Preview" style="max-width: 100%; max-height: 300px; border-radius: 8px; border: 2px solid rgba(59, 130, 246, 0.3);">
                    <button type="button" class="btn btn-danger" onclick="removeImageForQuestion(${questionItemCounter})" style="margin-top: 10px;">
                        <i class="fas fa-trash"></i> Remover Imagem
                    </button>
                </div>
            </div>
        </div>
        <hr style="margin: 20px 0; border-color: rgba(255, 255, 255, 0.1);">
    `;
    container.appendChild(questionDiv);

    // Setup handlers
    const hasHelpCheckbox = questionDiv.querySelector('.question-has-help-input');
    const translationContainer = questionDiv.querySelector('.question-translation-container');
    const questionTypeSelect = questionDiv.querySelector('.question-type-input');
    const optionsContainer = questionDiv.querySelector('.question-options-container');
    
    hasHelpCheckbox.addEventListener('change', (e) => {
        translationContainer.style.display = e.target.checked ? 'block' : 'none';
    });
    
    questionTypeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'MULTIPLE_CHOICE') {
            optionsContainer.style.display = 'block';
            const optionsList = document.getElementById(`options-list-${questionItemCounter}`);
            if (optionsList.children.length === 0) {
                addOptionToQuestion(questionItemCounter);
                addOptionToQuestion(questionItemCounter);
            }
        } else {
            optionsContainer.style.display = 'none';
        }
    });
}

// Remover item de questão
function removeQuestionItem(id) {
    document.getElementById(`question-item-${id}`)?.remove();
    updateQuestionNumbers();
}

// Atualizar números das questões
function updateQuestionNumbers() {
    const items = document.querySelectorAll('.question-item-card');
    items.forEach((item, index) => {
        const title = item.querySelector('h3');
        if (title) {
            title.innerHTML = `<i class="fas fa-file-alt"></i> Questão ${index + 1}`;
        }
    });
}

// Adicionar opção a uma questão específica
let optionCounterMap = {};
function addOptionToQuestion(questionId) {
    if (!optionCounterMap[questionId]) {
        optionCounterMap[questionId] = 0;
    }
    optionCounterMap[questionId]++;
    
    const optionsList = document.getElementById(`options-list-${questionId}`);
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-item';
    optionDiv.id = `option-${questionId}-${optionCounterMap[questionId]}`;
    optionDiv.innerHTML = `
        <input 
            type="text" 
            class="form-input option-text-input" 
            placeholder="Digite a opção de resposta..."
            required
        >
        <input 
            type="radio" 
            name="correct-option-${questionId}" 
            value="${optionCounterMap[questionId]}"
            class="option-correct-input"
        >
        <label style="color: #10b981; font-weight: 600; white-space: nowrap;">Correta</label>
        <button type="button" class="btn btn-danger" onclick="removeOptionFromQuestion(${questionId}, ${optionCounterMap[questionId]})" style="padding: 8px 12px;">
            <i class="fas fa-trash"></i>
        </button>
    `;
    optionsList.appendChild(optionDiv);
}

// Remover opção de uma questão
function removeOptionFromQuestion(questionId, optionId) {
    document.getElementById(`option-${questionId}-${optionId}`)?.remove();
}

// Salvar todas as questões
async function saveAllQuestions() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        showMessage('Erro: Você não está autenticado. Faça login novamente.', 'error');
        window.location.href = '/page/login.html';
        return;
    }
    
    const questionItems = document.querySelectorAll('.question-item-card');
    
    if (questionItems.length === 0) {
        showMessage('Adicione pelo menos uma questão', 'error');
        return;
    }

    const questions = [];
    let hasError = false;

    for (const item of questionItems) {
        const title = item.querySelector('.question-title-input').value.trim();
        const description = item.querySelector('.question-description-input').value.trim();
        const questionType = item.querySelector('.question-type-input').value;
        const hasHelp = item.querySelector('.question-has-help-input').checked;
        const translation = hasHelp ? item.querySelector('.question-translation-input')?.value.trim() : null;

        if (!title || !description) {
            showMessage('Todas as questões devem ter título e descrição', 'error');
            hasError = true;
            break;
        }

        // Pegar ID da questão para usar em opções e imagem
        const itemQuestionId = item.id.replace('question-item-', '');
        
        // Coletar opções se for múltipla escolha
        let options = null;
        if (questionType === 'MULTIPLE_CHOICE') {
            const optionsList = document.getElementById(`options-list-${itemQuestionId}`);
            if (!optionsList || optionsList.children.length === 0) {
                showMessage('Questões de múltipla escolha devem ter pelo menos uma opção', 'error');
                hasError = true;
                break;
            }
            
            options = [];
            const optionItems = optionsList.querySelectorAll('.option-item');
            let hasCorrectOption = false;
            
            optionItems.forEach((optItem, index) => {
                const text = optItem.querySelector('.option-text-input').value.trim();
                const isCorrect = optItem.querySelector('.option-correct-input').checked;
                
                if (!text) {
                    showMessage(`A opção ${index + 1} não pode estar vazia`, 'error');
                    hasError = true;
                    return;
                }
                
                if (isCorrect) {
                    hasCorrectOption = true;
                }
                
                options.push({
                    text: text,
                    correct: isCorrect
                });
            });
            
            if (hasError) break;
            
            if (!hasCorrectOption) {
                showMessage('Questões de múltipla escolha devem ter pelo menos uma opção correta', 'error');
                hasError = true;
                break;
            }
        }

        // Pegar imagem se houver
        const imageFile = document.getElementById(`question-image-${itemQuestionId}`)?.files[0];

        // Pegar data de expiração global (se definida) - verificar tanto no modo único quanto múltiplo
        const globalExpiresAt = document.getElementById('question-expires-at')?.value || 
                                document.getElementById('question-expires-at-multiple')?.value;
        const expiresAt = globalExpiresAt ? new Date(globalExpiresAt).toISOString() : null;
        
        // Pegar data de visibilidade global (se definida)
        const globalVisibleAt = document.getElementById('question-visible-at')?.value || 
                                document.getElementById('question-visible-at-multiple')?.value;
        const visibleAt = globalVisibleAt ? new Date(globalVisibleAt).toISOString() : null;

        questions.push({
            title: title,
            description: description,
            portugueseTranslation: translation,
            hasHelp: hasHelp,
            questionType: questionType,
            multipleChoice: questionType === 'MULTIPLE_CHOICE',
            options: options,
            expiresAt: expiresAt,
            visibleAt: visibleAt,
            imageFile: imageFile
        });
    }

    if (hasError) return;

    try {
        showMessage(`Salvando ${questions.length} questão(ões)...`, 'info');

        // Salvar uma por uma
        let successCount = 0;
        let errorCount = 0;
        
        for (const q of questions) {
            try {
                const formData = new FormData();
                formData.append('title', q.title);
                formData.append('description', q.description);
                formData.append('questionType', q.questionType);
                formData.append('multipleChoice', q.multipleChoice.toString());
                
                if (q.portugueseTranslation) {
                    formData.append('portugueseTranslation', q.portugueseTranslation);
                }
                formData.append('hasHelp', q.hasHelp ? 'true' : 'false');
                
                // Adicionar opções se for múltipla escolha
                if (q.options && q.options.length > 0) {
                    formData.append('options', JSON.stringify(q.options));
                }
                
                // Adicionar imagem se houver
                if (q.imageFile) {
                    formData.append('imageFile', q.imageFile);
                }
                
                // Adicionar data de expiração se definida
                if (q.expiresAt) {
                    formData.append('expiresAt', q.expiresAt);
                }
                
                // Adicionar data de visibilidade se definida
                if (q.visibleAt) {
                    formData.append('visibleAt', q.visibleAt);
                }

                const response = await fetch(`${API}/questions/create`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Erro ao salvar questão "${q.title}":`, errorText);
                    errorCount++;
                } else {
                    successCount++;
                }
            } catch (error) {
                console.error(`Erro ao salvar questão "${q.title}":`, error);
                errorCount++;
            }
        }

        if (successCount === questions.length) {
            showMessage(`${successCount} questão(ões) criada(s) com sucesso!`, 'success');
            document.getElementById('multiple-questions-container').innerHTML = '';
            questionItemCounter = 0;
            optionCounterMap = {};
            await loadQuestions();
        } else {
            showMessage(`${successCount} de ${questions.length} questão(ões) foram salvas. ${errorCount} erro(s).`, 'error');
        }

    } catch (error) {
        console.error('Erro ao salvar questões:', error);
        showMessage('Erro ao salvar questões: ' + error.message, 'error');
    }
}

// Event Listeners
function setupEventListeners() {
    const refreshBtn = document.getElementById('refresh-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await loadQuestions();
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            authService.logout();
            window.location.href = '/page/login.html';
        });
    }
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

// Exportar funções globais
window.editQuestion = editQuestion;
window.deleteQuestion = deleteQuestion;
window.removeOption = removeOption;
window.cancelEdit = cancelEdit;
window.removeQuestionItem = removeQuestionItem;
window.addOptionToQuestion = addOptionToQuestion;
window.removeOptionFromQuestion = removeOptionFromQuestion;
window.handleImageUploadForQuestion = handleImageUploadForQuestion;
window.removeImageForQuestion = removeImageForQuestion;

