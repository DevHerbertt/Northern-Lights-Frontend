class RegisterManager {
    constructor() {
        this.authService = authService;
        this.isLoading = false;
        
        // Elementos DOM
        this.registerForm = document.getElementById('register-form');
        this.userNameInput = document.getElementById('userName');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.ageInput = document.getElementById('age');
        this.agreeTermsCheckbox = document.getElementById('agreeTerms');
        this.levelEnglishSelect = document.getElementById('levelEnglish');
        this.togglePasswordBtn = document.getElementById('toggle-password');
        this.toggleConfirmPasswordBtn = document.getElementById('toggle-confirm-password');
        this.registerBtn = document.getElementById('register-btn');
        this.buttonText = document.getElementById('button-text');
        this.successMessage = document.getElementById('success-message');
        this.errorMessage = document.getElementById('error-message');
        this.successText = document.getElementById('success-text');
        this.errorText = document.getElementById('error-text');
        this.loadingOverlay = document.getElementById('loading-overlay');
        this.backBtn = document.getElementById('back-btn');
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupRealTimeValidation();
    }

    bindEvents() {
        // Form submission
        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        
        // Toggle password visibility
        this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility(this.passwordInput, this.togglePasswordBtn));
        this.toggleConfirmPasswordBtn.addEventListener('click', () => this.togglePasswordVisibility(this.confirmPasswordInput, this.toggleConfirmPasswordBtn));
        
        // Back button
        this.backBtn.addEventListener('click', () => this.goBack());
        
        // Clear errors on input
        this.setupInputValidation();
    }

    setupRealTimeValidation() {
        // Validação em tempo real para senha
        this.confirmPasswordInput.addEventListener('input', () => {
            this.validatePasswordMatch();
        });
        
        // Validação de email em tempo real
        this.emailInput.addEventListener('blur', () => {
            if (this.emailInput.value) {
                this.validateEmail(this.emailInput.value);
            }
        });
    }

    setupInputValidation() {
        const inputs = [
            this.userNameInput, this.emailInput, this.passwordInput, 
            this.confirmPasswordInput, this.ageInput, this.levelEnglishSelect
        ];
        
        inputs.forEach(input => {
            input.addEventListener('input', () => this.clearError());
        });
    }

    async handleRegister(e) {
        e.preventDefault();
        
        if (this.isLoading) return;
        
        const registerData = this.getFormData();
        const validationError = this.validateForm(registerData);
        
        if (validationError) {
            this.showError(validationError);
            return;
        }
        
        await this.performRegister(registerData);
    }

   getFormData() {
    return {
        userName: this.userNameInput.value.trim(),
        email: this.emailInput.value.trim().toLowerCase(),
        password: this.passwordInput.value,
        age: parseInt(this.ageInput.value),
        levelEnglish: this.levelEnglishSelect.value,
        role: "STUDENT"
    };
}


    validateForm(data) {
        // Campos obrigatórios
        if (!data.userName || !data.email || !data.password || !data.age || !data.levelEnglish) {
            return "Por favor, preencha todos os campos obrigatórios.";
        }

        // Validação de email
        if (!this.isValidEmail(data.email)) {
            return "Por favor, insira um email válido.";
        }

        // Validação de idade
        if (data.age < 10 || data.age > 100) {
            return "A idade deve estar entre 10 e 100 anos.";
        }

        // Validação de senha
        const passwordError = this.validatePassword(data.password);
        if (passwordError) {
            return passwordError;
        }

        // Confirmação de senha
        if (this.passwordInput.value !== this.confirmPasswordInput.value) {
            return "As senhas não coincidem.";
        }

        // Termos e condições
        if (!this.agreeTermsCheckbox.checked) {
            return "Você deve concordar com os Termos de Serviço e Política de Privacidade.";
        }

        return null;
    }

    validatePassword(password) {
        if (password.length < 6) {
            return "A senha deve ter pelo menos 6 caracteres.";
        }

        if (password.length > 100) {
            return "A senha deve ter no máximo 100 caracteres.";
        }

        return null;
    }

    validatePasswordMatch() {
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        
        if (password && confirmPassword && password !== confirmPassword) {
            this.confirmPasswordInput.style.borderColor = 'var(--error)';
        } else if (password && confirmPassword) {
            this.confirmPasswordInput.style.borderColor = 'var(--success)';
        } else {
            this.confirmPasswordInput.style.borderColor = '';
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async performRegister(registerData) {
        this.setLoading(true);
        
        try {
            console.log('Iniciando processo de registro:', registerData);
            
            const result = await this.authService.register(registerData);
            console.log('Registro bem-sucedido:', result);
            
            this.showSuccess("Conta criada com sucesso! Redirecionando para login...");
            
            // Redirecionar para login após sucesso
            setTimeout(() => {
                window.location.href = `/page/login.html?registered=true&message=${encodeURIComponent("Conta criada com sucesso! Faça login para continuar.")}`;
            }, 2000);
            
        } catch (error) {
            console.error('Erro no registro:', error);
            this.handleRegisterError(error);
        } finally {
            this.setLoading(false);
        }
    }

    handleRegisterError(error) {
        let errorMessage = "Erro ao criar conta. Tente novamente.";
        
        if (error.message.includes('409') || error.message.includes('Email já')) {
            errorMessage = "Este email já está em uso. Tente outro email.";
        } else if (error.message.includes('400') || error.message.includes('Validation')) {
            errorMessage = "Dados inválidos. Verifique as informações fornecidas.";
        } else if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
            errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        } else if (error.message.includes('500')) {
            errorMessage = "Erro interno do servidor. Tente novamente mais tarde.";
        } else {
            errorMessage = error.message;
        }
        
        this.showError(errorMessage);
    }

    togglePasswordVisibility(inputElement, toggleButton) {
        const type = inputElement.type === 'password' ? 'text' : 'password';
        const icon = toggleButton.querySelector('i');
        
        inputElement.type = type;
        icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    }

    validateEmail(email) {
        if (!this.isValidEmail(email)) {
            this.emailInput.style.borderColor = 'var(--error)';
            return false;
        } else {
            this.emailInput.style.borderColor = 'var(--success)';
            return true;
        }
    }

    showSuccess(message) {
        this.successText.textContent = message;
        this.successMessage.style.display = 'flex';
        this.errorMessage.style.display = 'none';
        
        // Scroll to success message
        this.successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    showError(message) {
        this.errorText.textContent = message;
        this.errorMessage.style.display = 'flex';
        this.successMessage.style.display = 'none';
        
        // Scroll to error message
        this.errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    clearError() {
        this.errorMessage.style.display = 'none';
        // Reset border colors
        this.emailInput.style.borderColor = '';
        this.confirmPasswordInput.style.borderColor = '';
    }

    setLoading(loading) {
        this.isLoading = loading;
        
        if (loading) {
            this.registerBtn.disabled = true;
            this.buttonText.textContent = 'Criando conta...';
            this.loadingOverlay.style.display = 'flex';
        } else {
            this.registerBtn.disabled = false;
            this.buttonText.textContent = 'Criar Minha Conta';
            this.loadingOverlay.style.display = 'none';
        }
    }

    goBack() {
        window.location.href = '/page/login.html';
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new RegisterManager();
});