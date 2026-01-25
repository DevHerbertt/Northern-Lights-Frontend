// ========== CONFIGURAÇÃO GLOBAL ==========
// Usar API configurada em config.js
const API_BASE_URL = window.API || window.API_BASE_URL || 'http://localhost:8080';

document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const form = document.getElementById('createTeacherForm');
    const resetButton = document.getElementById('resetForm');
    const togglePassword = document.getElementById('togglePassword');
    const teacherPassword = document.getElementById('teacherPassword');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    const generateTempPassword = document.getElementById('generateTempPassword');
    const successModal = document.getElementById('successModal');
    const closeModal = document.getElementById('closeModal');
    const successMessage = document.getElementById('successMessage');
    const totalTeachersElement = document.querySelector('.stat-item .stat-value');
    
    // Carregar estatísticas ao iniciar
    loadTeacherStats();

    // Alternar visibilidade da senha
    togglePassword.addEventListener('click', function() {
        const type = teacherPassword.getAttribute('type') === 'password' ? 'text' : 'password';
        teacherPassword.setAttribute('type', type);
        this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
    
    // Verificar força da senha
    teacherPassword.addEventListener('input', function() {
        const password = this.value;
        let strength = 0;
        let color = '#ef476f'; // Vermelho - fraco
        let text = 'Fraca';
        
        // Verificar comprimento
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        
        // Verificar caracteres diversos
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        // Determinar força
        if (strength <= 2) {
            color = '#ef476f'; // Vermelho
            text = 'Fraca';
        } else if (strength <= 4) {
            color = '#ffbe0b'; // Amarelo
            text = 'Média';
        } else {
            color = '#06d6a0'; // Verde
            text = 'Forte';
        }
        
        // Atualizar barra de força
        const width = Math.min(100, (strength / 6) * 100);
        strengthBar.style.width = `${width}%`;
        strengthBar.style.backgroundColor = color;
        strengthText.textContent = `Força: ${text}`;
        strengthText.style.color = color;
    });
    
    // Gerar senha temporária - CORREÇÃO PRINCIPAL
    generateTempPassword.addEventListener('change', function() {
        if (this.checked) {
            // Gerar senha aleatória
            const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
            let tempPassword = "";
            for (let i = 0; i < 12; i++) {
                tempPassword += charset.charAt(Math.floor(Math.random() * charset.length));
            }
            
            // ATUALIZAR O VALOR DO CAMPO mesmo quando disabled
            teacherPassword.value = tempPassword;
            teacherPassword.type = "text";
            togglePassword.innerHTML = '<i class="fas fa-eye-slash"></i>';
            
            // IMPORTANTE: Habilitar temporariamente para garantir que o valor seja coletado
            teacherPassword.disabled = false;
            teacherPassword.value = tempPassword;
            teacherPassword.disabled = true;
            togglePassword.disabled = true;
            
            // Disparar evento para atualizar força da senha
            const event = new Event('input');
            teacherPassword.dispatchEvent(event);
            
        } else {
            teacherPassword.disabled = false;
            togglePassword.disabled = false;
            teacherPassword.value = "";
            teacherPassword.type = "password";
            togglePassword.innerHTML = '<i class="fas fa-eye"></i>';
            
            // Disparar evento para atualizar força da senha
            const event = new Event('input');
            teacherPassword.dispatchEvent(event);
        }
    });
    
    // Limpar formulário
    resetButton.addEventListener('click', function() {
        if (confirm('Tem certeza que deseja limpar todos os campos do formulário?')) {
            // Habilitar campo de senha antes de resetar
            teacherPassword.disabled = false;
            togglePassword.disabled = false;
            
            form.reset();
            
            teacherPassword.type = "password";
            togglePassword.innerHTML = '<i class="fas fa-eye"></i>';
            
            // Resetar barra de força
            strengthBar.style.width = '0%';
            strengthText.textContent = 'Força da senha';
            strengthText.style.color = '';
        }
    });
    
    // Enviar formulário - CORREÇÃO CRÍTICA
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // CORREÇÃO: Sempre garantir que o campo de senha está habilitado antes de coletar dados
        const isPasswordDisabled = teacherPassword.disabled;
        if (isPasswordDisabled) {
            teacherPassword.disabled = false;
        }
        
        // Coletar dados do formulário - AGORA VAI PEGAR O VALOR CORRETAMENTE
        const teacherData = {
            userName: document.getElementById('teacherName').value.trim(),
            email: document.getElementById('teacherEmail').value.trim(),
            age: parseInt(document.getElementById('teacherAge').value),
            passWord: teacherPassword.value, // AGORA VAI PEGAR O VALOR CORRETO
            classRoom: "",
        };
        
        // Restaurar estado do campo se estava desabilitado
        if (isPasswordDisabled) {
            teacherPassword.disabled = true;
        }
        
        console.log("Dados a serem enviados:", teacherData);
        console.log("Senha coletada (tamanho):", teacherData.passWord ? teacherData.passWord.length : "NULL");
        
        // Validação básica
        if (!validateForm(teacherData)) {
            return;
        }
        
        try {
            // Mostrar indicador de carregamento
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
            submitBtn.disabled = true;
            
            // Enviar dados para API
            const response = await createTeacher(teacherData);
            
            if (response) {
                // Mostrar mensagem de sucesso
                let successMsg = `Professor ${teacherData.userName} criado com sucesso!`;
                if (generateTempPassword.checked) {
                    successMsg += `\nSenha temporária: ${teacherData.passWord}`;
                }
                successMessage.textContent = successMsg;
                
                // Mostrar modal de sucesso
                successModal.style.display = 'flex';
                
                // Atualizar estatísticas
                await loadTeacherStats();
            }
            
        } catch (error) {
            console.error('Erro no formulário:', error);
            alert(`Erro ao criar professor: ${error.message || 'Tente novamente mais tarde.'}`);
        } finally {
            // Restaurar botão
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.innerHTML = '<i class="fas fa-user-plus"></i> Criar Professor';
            submitBtn.disabled = false;
        }
    });
    
    // Fechar modal
    closeModal.addEventListener('click', function() {
        successModal.style.display = 'none';
        
        // Habilitar campo de senha antes de resetar
        teacherPassword.disabled = false;
        togglePassword.disabled = false;
        
        form.reset();
        
        teacherPassword.type = "password";
        togglePassword.innerHTML = '<i class="fas fa-eye"></i>';
        
        // Resetar barra de força
        strengthBar.style.width = '0%';
        strengthText.textContent = 'Força da senha';
        strengthText.style.color = '';
    });
    
    // Fechar modal clicando fora
    successModal.addEventListener('click', function(e) {
        if (e.target === successModal) {
            successModal.style.display = 'none';
        }
    });
    
    // Função de validação
    function validateForm(data) {
        // Validar nome
        if (!data.userName || data.userName.trim().length < 3) {
            alert('O nome deve ter pelo menos 3 caracteres.');
            return false;
        }
        
        // Validar e-mail
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            alert('Por favor, insira um e-mail válido.');
            return false;
        }
        
        // Validar idade
        if (data.age < 18 || data.age > 80 || isNaN(data.age)) {
            alert('A idade deve estar entre 18 e 80 anos.');
            return false;
        }
        
        // CORREÇÃO CRÍTICA: Verificar se a senha não é nula ou vazia
        if (!data.passWord || data.passWord.trim().length === 0) {
            alert('A senha não pode estar vazia.');
            return false;
        }
        
        // Verificar comprimento da senha
        if (data.passWord.length < 8) {
            alert('A senha deve ter pelo menos 8 caracteres.');
            return false;
        }
        
        return true;
    }
});

// ========== FUNÇÕES DA API ==========

// Função para criar professor
async function createTeacher(teacherData) {
    try {
        const token = localStorage.getItem("token");
        
        if (!token) {
            throw new Error("Token de autenticação não encontrado. Faça login novamente.");
        }
        
        console.log("Enviando dados para API:", teacherData);
        console.log("Senha no momento do envio:", teacherData.passWord ? `"${teacherData.passWord}" (${teacherData.passWord.length} chars)` : "NULL");

        // Verificação EXTRA para garantir que a senha não seja nula
        if (!teacherData.passWord || teacherData.passWord.trim() === '') {
            throw new Error("A senha não pode estar vazia. Por favor, insira uma senha válida.");
        }

        const response = await fetch(`${API_BASE_URL}/teachers`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(teacherData)
        });

        if (!response.ok) {
            console.error("Erro ao criar professor:", response.status, response.statusText);
            
            // Tentar obter mensagem de erro do response
            let errorMessage = `Erro ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // Ignora se não conseguir parsear JSON
            }
            
            throw new Error(errorMessage);
        }

        const teacher = await response.json();
        console.log("Professor criado com sucesso:", teacher);

        return teacher;

    } catch (error) {
        console.error("Erro ao criar professor:", error);
        throw error;
    }
}

// Função para buscar estatísticas dos professores
async function loadTeacherStats() {
    try {
        const token = localStorage.getItem("token");
        const totalTeachersElement = document.querySelector('.stat-item .stat-value');

        if (!totalTeachersElement) {
            console.warn("Elemento para exibir estatísticas não encontrado");
            return;
        }

        const response = await fetch(`${API_BASE_URL}/teachers/quantity`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Erro ao buscar quantidade de professores:", response.status, response.statusText);
            totalTeachersElement.textContent = "Erro";
            return;
        }

        const quantityData = await response.json();
        console.log("Quantidade de professores:", quantityData);

        // Ajuste conforme a estrutura da sua resposta
        let quantity;
        if (typeof quantityData === 'number') {
            quantity = quantityData;
        } else if (quantityData.quantity !== undefined) {
            quantity = quantityData.quantity;
        } else if (quantityData.count !== undefined) {
            quantity = quantityData.count;
        } else {
            quantity = "N/A";
        }

        totalTeachersElement.textContent = quantity;

    } catch (error) {
        console.error("Erro ao buscar quantidade de professores:", error);
        const totalTeachersElement = document.querySelector('.stat-item .stat-value');
        if (totalTeachersElement) {
            totalTeachersElement.textContent = "Erro";
        }
    }
}

// Função para buscar professor por ID (para uso futuro)
async function getTeacherById(teacherId) {
    try {
        const token = localStorage.getItem("token");

        const response = await fetch(`${API_BASE_URL}/teachers/${teacherId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Erro ao buscar professor:", response.status, response.statusText);
            return null;
        }

        const teacher = await response.json();
        console.log("Professor encontrado:", teacher);

        return teacher;

    } catch (error) {
        console.error("Erro ao buscar professor:", error);
        return null;
    }
}

// Função para atualizar professor (para uso futuro)
async function updateTeacher(teacherId, teacherData) {
    try {
        const token = localStorage.getItem("token");

        const response = await fetch(`${API_BASE_URL}/teachers/${teacherId}`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(teacherData)
        });

        if (!response.ok) {
            console.error("Erro ao atualizar professor:", response.status, response.statusText);
            
            let errorMessage = `Erro ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // Ignora se não conseguir parsear JSON
            }
            
            throw new Error(errorMessage);
        }

        const updatedTeacher = await response.json();
        console.log("Professor atualizado com sucesso:", updatedTeacher);

        return updatedTeacher;

    } catch (error) {
        console.error("Erro ao atualizar professor:", error);
        throw error;
    }
}

// Função para deletar professor (para uso futuro)
async function deleteTeacher(teacherId) {
    try {
        const token = localStorage.getItem("token");

        const response = await fetch(`${API_BASE_URL}/teachers/${teacherId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Erro ao deletar professor:", response.status, response.statusText);
            
            let errorMessage = `Erro ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // Ignora se não conseguir parsear JSON
            }
            
            throw new Error(errorMessage);
        }

        console.log("Professor deletado com sucesso, ID:", teacherId);
        return true;

    } catch (error) {
        console.error("Erro ao deletar professor:", error);
        throw error;
    }
}

// Função para buscar todos os professores (para uso futuro)
async function getAllTeachers() {
    try {
        const token = localStorage.getItem("token");

        const response = await fetch(`${API_BASE_URL}/teachers`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            console.error("Erro ao buscar professores:", response.status, response.statusText);
            return [];
        }

        const teachers = await response.json();
        console.log("Professores encontrados:", teachers);

        return teachers;

    } catch (error) {
        console.error("Erro ao buscar professores:", error);
        return [];
    }
}