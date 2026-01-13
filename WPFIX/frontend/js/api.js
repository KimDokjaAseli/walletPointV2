class API {
    static getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    static async login(email, password) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    static async getProfile() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
                method: 'GET',
                headers: API.getHeaders()
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    API.logout();
                }
                throw new Error(data.message || 'Failed to fetch profile');
            }

            return data;
        } catch (error) {
            console.error('Profile error:', error);
            throw error;
        }
    }

    static logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    // ========================================
    // ADMIN: User Management
    // ========================================
    static async getUsers(params = {}) {
        return API.request('/admin/users', 'GET', null, params);
    }

    static async createUser(userData) {
        return API.request('/admin/users', 'POST', userData);
    }

    static async updateUser(id, userData) {
        return API.request(`/admin/users/${id}`, 'PUT', userData);
    }

    static async deleteUser(id) {
        return API.request(`/admin/users/${id}`, 'DELETE');
    }

    static async resetUserPassword(id, newPassword) {
        return API.request(`/admin/users/${id}/password`, 'PUT', { new_password: newPassword });
    }

    // ========================================
    // ADMIN: Wallet Management
    // ========================================
    static async getWallets(params = {}) {
        return API.request('/admin/wallets', 'GET', null, params);
    }

    static async getWalletTransactions(id, params = {}) {
        return API.request(`/admin/wallets/${id}/transactions`, 'GET', null, params);
    }

    static async adjustWalletPoints(data) {
        return API.request('/admin/wallet/adjustment', 'POST', data);
    }

    static async resetWallet(data) {
        return API.request('/admin/wallet/reset', 'POST', data);
    }

    static async getAllTransactions(params = {}) {
        return API.request('/admin/transactions', 'GET', null, params);
    }

    // ========================================
    // ADMIN: Marketplace
    // ========================================
    static async getProducts(params = {}) {
        return API.request('/admin/products', 'GET', null, params);
    }

    static async createProduct(productData) {
        return API.request('/admin/products', 'POST', productData);
    }

    static async updateProduct(id, productData) {
        return API.request(`/admin/products/${id}`, 'PUT', productData);
    }

    static async deleteProduct(id) {
        return API.request(`/admin/products/${id}`, 'DELETE');
    }

    // ========================================
    // ADMIN: Audit Logs
    // ========================================
    static async getAuditLogs(params = {}) {
        return API.request('/admin/audit-logs', 'GET', null, params);
    }

    // ========================================
    // DOSEN: Mission Management
    // ========================================
    static async getDosenMissions(params = {}) {
        return API.request('/dosen/missions', 'GET', null, params);
    }

    static async createMission(missionData) {
        return API.request('/dosen/missions', 'POST', missionData);
    }

    static async updateMission(id, missionData) {
        return API.request(`/dosen/missions/${id}`, 'PUT', missionData);
    }

    static async deleteMission(id) {
        return API.request(`/dosen/missions/${id}`, 'DELETE');
    }

    static async getSubmissions(params = {}) {
        return API.request('/dosen/submissions', 'GET', null, params);
    }

    static async reviewSubmission(id, reviewData) {
        return API.request(`/dosen/submissions/${id}/review`, 'POST', reviewData);
    }

    static async getDosenStudents(params = {}) {
        return API.request('/dosen/students', 'GET', null, params);
    }

    static async creditStudent(data) {
        return API.request('/dosen/wallet/credit', 'POST', data);
    }

    static async getStudentTransactions(walletId, params = {}) {
        return API.request(`/dosen/wallets/${walletId}/transactions`, 'GET', null, params);
    }

    // ========================================
    // MAHASISWA: Mission & Submission
    // ========================================
    static async getStudentMissions(params = {}) {
        return API.request('/mahasiswa/missions', 'GET', null, params);
    }

    static async getMissionDetails(id) {
        return API.request(`/mahasiswa/missions/${id}`, 'GET');
    }

    static async submitMission(submissionData) {
        return API.request('/mahasiswa/missions/submit', 'POST', submissionData);
    }

    static async getStudentSubmissions(params = {}) {
        return API.request('/mahasiswa/submissions', 'GET', null, params);
    }

    // Generic Request Helper
    static async request(endpoint, method, body = null, params = {}) {
        try {
            let url = `${CONFIG.API_BASE_URL}${endpoint}`;
            if (Object.keys(params).length > 0) {
                const searchParams = new URLSearchParams(params);
                url += `?${searchParams.toString()}`;
            }

            const options = {
                method,
                headers: API.getHeaders()
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(url, options);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    API.logout();
                }
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }
}
