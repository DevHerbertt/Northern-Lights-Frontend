// login-manager.js
class LoginManager {
    constructor() {
        this.isLoading = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkUrlParams();
        this.checkExistingAuth();
    }

    bindEvents() {
        const loginForm = document.getElementById('login-form');
        const togglePasswordBtn = document.getElementById('toggle-password');
        const backBtn = document.getElementById('back-btn');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (togglePasswordBtn) {
            togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => this.goBack());
        }
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const registered = urlParams.get('registered');
        const message = urlParams.get('message');
        
        if (registered === 'true' && message) {
            this.showSuccess(decodeURIComponent(message));
        }
    }

   async checkExistingAuth() {
    if (authService.isAuthenticated()) {
        const valid = await authService.validateToken();
        if (valid) {
            console.log('✅ Usuário já autenticado, redirecionando...');
            this.redirectUser(authService.getCurrentUser().role);
        } else {
            authService.logout();
        }
    }
}


    async handleLogin(e) {
        e.preventDefault();
        
        if (this.isLoading) return;
        
        const loginData = this.getFormData();
        const validationError = this.validateForm(loginData);
        
        if (validationError) {
            this.showError(validationError);
            return;
        }
        
        await this.performLogin(loginData);
    }

    getFormData() {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        return {
            email: emailInput.value.trim().toLowerCase(),
            password: passwordInput.value
        };
    }

    validateForm(data) {
        if (!data.email || !data.password) {
            return "Por favor, preencha todos os campos.";
        }

        if (!this.isValidEmail(data.email)) {
            return "Por favor, insira um email válido.";
        }

        return null;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async performLogin(loginData) {
        this.setLoading(true);
        
        try {
            console.log('🔄 Processando login...');
            
            const result = await authService.login(loginData);
            
            this.showSuccess('Login realizado com sucesso! Redirecionando...');
            
            // Pequeno delay para usuário ver a mensagem
            setTimeout(() => {
                this.redirectUser(result.role);
            }, 1500);
            
        } catch (error) {
            console.error('❌ Erro no login:', error);
            this.handleLoginError(error);
        } finally {
            this.setLoading(false);
        }
    }

    redirectUser(role) {
        const dashboardUrl = role?.toUpperCase() === 'TEACHER'
            ? '/page/teacher-dashboard.html'
            : '/page/student-dashboard.html';

            
        console.log(`🔄 Redirecionando para: ${dashboardUrl}`);
        window.location.href = dashboardUrl;
    }

    handleLoginError(error) {
        let errorMessage = "Erro ao fazer login. Verifique suas credenciais.";
        
        if (error.message.includes('401') || error.message.includes('Credenciais')) {
            errorMessage = "Email ou senha incorretos.";
        } else if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
            errorMessage = "Erro de conexão. Verifique sua internet.";
        } else if (error.message.includes('500')) {
            errorMessage = "Erro interno do servidor. Tente novamente.";
        } else {
            errorMessage = error.message;
        }
        
        this.showError(errorMessage);
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const togglePasswordBtn = document.getElementById('toggle-password');
        
        if (passwordInput && togglePasswordBtn) {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            const icon = togglePasswordBtn.querySelector('i');
            
            passwordInput.type = type;
            icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
        }
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        // Remove mensagens existentes
        this.clearMessages();
        
        const messageElement = document.createElement('div');
        messageElement.className = `alert alert-${type} fade-in`;
        messageElement.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        const container = document.querySelector('.login-container') || document.body;
        container.insertBefore(messageElement, container.firstChild);

        // Auto-remove após 5 segundos
        setTimeout(() => {
            if (messageElement.parentElement) {
                messageElement.remove();
            }
        }, 5000);
    }

    clearMessages() {
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loginBtn = document.getElementById('login-btn');
        const buttonText = document.getElementById('button-text');
        const loadingOverlay = document.getElementById('loading-overlay');
        
        if (loginBtn && buttonText) {
            loginBtn.disabled = loading;
            buttonText.textContent = loading ? 'Entrando...' : 'Acessar Minha Conta';
        }
        
        if (loadingOverlay) {
            loadingOverlay.style.display = loading ? 'flex' : 'none';
        }
    }

    goBack() {
        window.location.href = '/page/index.html';
    }
}

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});