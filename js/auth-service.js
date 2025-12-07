// auth-service.js
class AuthService {
    constructor() {
        this.BASE_URL = 'http://localhost:8080/api';
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.isValidating = false;
    }

    // Adicione no auth-service.js para debug do token
decodeToken(token) {
    if (!token || token.split('.').length !== 3) {
        console.error('❌ Token mal formatado');
        return null;
    }

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔍 DEBUG - Payload do token:', payload);
        return payload;
    } catch (error) {
        console.error('❌ Erro ao decodificar token:', error);
        return null;
    }
}


// No getHeaders(), adicione:
getHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
        // DEBUG: Mostrar o que está no token
        this.decodeToken(this.token);
    }
    
    return headers;
}

    async login(loginData) {
        try {
            console.log('🔐 Tentando login...', { ...loginData, password: '***' });
            
            const response = await fetch(`${this.BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Login bem-sucedido:', { 
                userName: data.userName, 
                role: data.role,
                hasToken: !!data.token 
            });
            
            this.saveAuthData(data);
            return data;
            
        } catch (error) {
            console.error('❌ Erro no login:', error);
            throw error;
        }
    }

    saveAuthData(authData) {
        if (!authData.token) {
            throw new Error('Token não recebido do servidor');
        }

        this.token = authData.token;
        this.user = {
            id: authData.id,
            email: authData.email,
            userName: authData.userName,
            role: authData.role
        };

        localStorage.setItem('token', authData.token);
        localStorage.setItem('user', JSON.stringify(this.user));
        
        console.log('💾 Dados de autenticação salvos:', {
            userName: this.user.userName,
            role: this.user.role,
            tokenPreview: this.token.substring(0, 20) + '...'
        });
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    isAuthenticated() {
        const hasToken = !!this.token;
        const hasUser = !!this.user;
        
        console.log('🔍 Verificando autenticação:', { 
            hasToken, 
            hasUser,
            user: this.user 
        });
        
        return hasToken && hasUser;
    }

    getCurrentUser() {
        return this.user;
    }

    logout() {
    console.log('🚪 Fazendo logout...');
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();  
}


    async validateToken() {
        
    if (this.isValidating) return true;
    if (!this.isAuthenticated()) return false;

    this.isValidating = true;

    try {
        console.log('🔐 Validando token com API...');

        const response = await fetch(`${this.BASE_URL}/questions`, {
            method: 'GET',
            headers: this.getHeaders()
        });

        if (response.status === 401 || response.status === 403) {
            console.warn('❌ Token inválido ou sem permissão');
            this.logout();
            return false;
        }

        console.log('✅ Token válido e com permissões');
        return true;

    } catch (error) {
        console.error('❌ Erro ao validar token:', error);
        return false;  // Retornando falso em caso de erro
    } finally {
        this.isValidating = false;
    }
}

    // Nova função para verificar se o usuário tem role de professor
    isTeacher() {
        return this.user && this.user.role === 'TEACHER';
    }

    // Função para verificar permissões antes de fazer requisições
    async checkPermissions() {
    if (!this.isAuthenticated()) {
        throw new Error('Usuário não autenticado. Faça login para continuar.');
    }

    if (!this.isTeacher()) {
        throw new Error('Você não tem permissão para acessar esta funcionalidade.');
    }

    return await this.validateToken();
}

async register(registerData) {
    try {
        console.log("📤 Enviando registro:", registerData);

        const response = await fetch(`${this.BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(registerData)
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(errorMessage || `Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Registro bem-sucedido:", data);

        return data;

    } catch (error) {
        console.error("❌ Erro ao registrar:", error);
        throw error;
    }
}


}

// Instância global
const authService = new AuthService();