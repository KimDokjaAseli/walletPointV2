class DosenController {
    static async loadDashboardStats() {
        try {
            const missionsRes = await API.getDosenMissions();
            const studentsRes = await API.getDosenStudents();
            const subsRes = await API.getSubmissions({ status: 'pending' });

            const missions = missionsRes.data.missions || [];
            const students = studentsRes.data.users || [];
            const pending = subsRes.data.submissions || [];

            if (document.getElementById('statMissions')) {
                document.getElementById('statMissions').textContent = missions.length;
                document.getElementById('statStudents').textContent = students.length;
                document.getElementById('statPending').textContent = pending.length;
            }

            if (pending.length > 0 && document.getElementById('attentionSection')) {
                document.getElementById('attentionSection').innerHTML = `
                    <div class="attention-card">
                        <div class="attention-info">
                            <div class="attention-icon">⏰</div>
                            <div class="attention-text">
                                <h4>${pending.length} Misi Menunggu Validasi</h4>
                                <p>Dari ${new Set(pending.map(p => p.student_id)).size} mahasiswa berbeda</p>
                            </div>
                        </div>
                        <button class="btn btn-primary" style="background: var(--pastel-yellow); color: white; border:none;" 
                            onclick="document.querySelector('[data-target=\\'submissions\\']').click()">
                            Lihat
                        </button>
                    </div>
                `;
            }
        } catch (e) { console.error(e); }
    }

    static async renderMissions() {
        const content = document.getElementById('mainContent');
        content.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h3 style="color: var(--primary-color); font-weight: 700;">📊 Daftar Misi Saya</h3>
                    <button class="btn btn-primary" onclick="DosenController.showMissionModal()" 
                        style="background: var(--pastel-green); color: white; border:none; box-shadow: 0 4px 10px rgba(23, 209, 116, 0.2)">
                        + Buat Misi Baru
                    </button>
                </div>
                <div style="overflow-x: auto;">
                    <table id="dosenMissionsTable">
                        <thead>
                            <tr>
                                <th>Judul Misi</th>
                                <th>Tipe</th>
                                <th>Hadiah Poin</th>
                                <th>Tenggat Waktu</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody><tr><td colspan="6" class="text-center">Memuat...</td></tr></tbody>
                    </table>
                </div>
            </div>
        `;

        try {
            const result = await API.getDosenMissions();
            const missions = result.data.missions || [];

            const tbody = document.querySelector('#dosenMissionsTable tbody');
            if (missions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 2rem; color: var(--text-muted);">Belum ada misi yang dibuat.</td></tr>';
                return;
            }

            tbody.innerHTML = missions.map(m => `
                <tr>
                    <td>
                        <div style="font-weight: 700; color: var(--text-main);">${m.title}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">${m.description || 'Tidak ada deskripsi'}</div>
                    </td>
                    <td>
                        <span style="background: var(--pastel-blue-light); color: var(--pastel-blue); padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                            ${m.type}
                        </span>
                        <div style="font-size: 10px; color: var(--text-muted); margin-top: 5px;">
                            ${m.submission_type === 'image' ? '📸 FOTO' :
                    m.submission_type === 'file' ? '📁 FILE' :
                        m.submission_type === 'link' ? '🔗 LINK' : '📝 TEKS'}
                        </div>
                    </td>
                    <td><span style="color: var(--pastel-green); font-weight: 800;">+${m.points}</span> <small>pts</small></td>
                    <td>${m.deadline ? new Date(m.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '∞ No Deadline'}</td>
                    <td><span class="status-badge ${m.status === 'active' ? 'status-active' : 'status-expired'}">${m.status}</span></td>
                    <td>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-icon" onclick="DosenController.showMissionModal(${m.id})" title="Edit">✏️</button>
                            <button class="btn-icon" style="color:var(--error)" onclick="DosenController.deleteMission(${m.id})" title="Delete">🗑️</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error(error);
        }
    }

    static async showMissionModal(id = null) {
        let mission = null;
        if (id) {
            try {
                const res = await API.request(`/dosen/missions/${id}`, 'GET');
                mission = res.data;
            } catch (e) { console.error(e); }
        }

        const modalHtml = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal-content" style="border-top: 8px solid ${id ? 'var(--pastel-blue)' : 'var(--pastel-green)'}">
                    <h3 style="margin-bottom: 2rem;">${id ? '📝 Edit Misi' : '✨ Buat Misi Baru'}</h3>
                    <form id="missionForm" onsubmit="DosenController.handleMissionSubmit(event, ${id})">
                        <div class="form-group">
                            <label>Judul Misi</label>
                            <input type="text" name="title" value="${mission?.title || ''}" required placeholder="Contoh: Kuis Pekan 1">
                        </div>
                        <div class="form-group">
                            <label>Deskripsi</label>
                            <textarea name="description" placeholder="Berikan instruksi yang jelas kepada mahasiswa...">${mission?.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Tipe Misi</label>
                            <select name="type">
                                <option value="quiz" ${mission?.type === 'quiz' ? 'selected' : ''}>Kuis</option>
                                <option value="task" ${mission?.type === 'task' ? 'selected' : ''}>Tugas</option>
                                <option value="assignment" ${mission?.type === 'assignment' ? 'selected' : ''}>Assignment</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Jenis Bukti Pengumpulan</label>
                            <select name="submission_type">
                                <option value="text" ${mission?.submission_type === 'text' ? 'selected' : ''}>📝 Teks / Jawaban Langsung</option>
                                <option value="image" ${mission?.submission_type === 'image' ? 'selected' : ''}>📸 Foto / Capture Bukti</option>
                                <option value="file" ${mission?.submission_type === 'file' ? 'selected' : ''}>📁 File (PDF/Docs/Zip)</option>
                                <option value="link" ${mission?.submission_type === 'link' ? 'selected' : ''}>🔗 Link / URL Digital</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Hadiah Poin</label>
                            <input type="number" name="points" value="${mission?.points || 10}" required min="1">
                        </div>
                        <div class="form-group">
                            <label>Tenggat Waktu (Opsional)</label>
                            <input type="datetime-local" name="deadline" value="${mission?.deadline ? mission.deadline.substring(0, 16) : ''}">
                        </div>
                        <div class="form-actions" style="border:none; padding-top: 0;">
                            <button type="button" class="btn" style="background: transparent; color: var(--text-muted);" onclick="closeModal()">Batal</button>
                            <button type="submit" class="btn btn-primary" style="background: ${id ? 'var(--pastel-blue)' : 'var(--pastel-green)'}; padding: 0.75rem 2.5rem; border-radius: 12px;">
                                ${id ? 'Simpan Perubahan' : 'Terbitkan Misi'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    static async handleMissionSubmit(e, id) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.points = parseInt(data.points);
        if (!data.deadline) delete data.deadline;
        else data.deadline = new Date(data.deadline).toISOString();

        try {
            if (id) {
                await API.updateMission(id, data);
            } else {
                await API.createMission(data);
            }
            closeModal();
            DosenController.renderMissions();
            // showToast(`Misi berhasil ${id ? 'diperbarui' : 'dibuat'}`);
        } catch (error) {
            alert(error.message);
        }
    }

    static async deleteMission(id) {
        if (!confirm('Apakah anda yakin ingin menghapus misi ini?')) return;
        try {
            await API.deleteMission(id);
            DosenController.renderMissions();
        } catch (error) {
            alert(error.message);
        }
    }

    static async renderSubmissions() {
        const content = document.getElementById('mainContent');
        content.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h3 style="color: var(--pastel-purple); font-weight: 700;">✅ Validasi Tugas</h3>
                </div>
                <div style="overflow-x: auto;">
                    <table id="submissionsTable">
                        <thead>
                            <tr>
                                <th>Mission</th>
                                <th>Mahasiswa</th>
                                <th>Waktu Kumpul</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody><tr><td colspan="5" class="text-center">Loading...</td></tr></tbody>
                    </table>
                </div>
            </div>
        `;

        try {
            const result = await API.getSubmissions({ status: 'pending' });
            const subs = result.data.submissions || [];

            const tbody = document.querySelector('#submissionsTable tbody');
            if (subs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 2rem; color: var(--text-muted);">Tidak ada pengumpulan yang perlu divalidasi.</td></tr>';
                return;
            }

            tbody.innerHTML = subs.map(s => `
                <tr>
                    <td style="font-weight: 600;">${s.mission_title}</td>
                    <td>
                        <div style="font-weight: 600;">${s.student_name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${s.student_nim}</div>
                    </td>
                    <td style="color: var(--text-muted); font-size: 0.8rem;">${new Date(s.created_at).toLocaleString('id-ID')}</td>
                    <td><span class="status-badge status-pending">${s.status}</span></td>
                    <td>
                        <button class="btn btn-primary" style="background: var(--pastel-purple); color: white; border:none; padding: 6px 16px; border-radius: 8px; font-size: 12px;" 
                            onclick="DosenController.showReviewModal(${s.id}, '${s.student_name}')">Review</button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error(error);
        }
    }

    static showReviewModal(subId, studentName) {
        const modalHtml = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal-content" style="border-top: 8px solid var(--pastel-purple)">
                    <h3 style="margin-bottom: 2rem;">Validasi Tugas: <span style="color: var(--pastel-purple)">${studentName}</span></h3>
                    <form id="reviewForm" onsubmit="DosenController.handleReview(event, ${subId})">
                        <div class="form-group">
                            <label>Keputusan</label>
                            <select name="status">
                                <option value="approved">✅ Terima & Berikan Poin</option>
                                <option value="rejected">❌ Tolak</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Skor (0-100)</label>
                            <input type="number" name="score" value="100" min="0" max="100" required>
                        </div>
                        <div class="form-group">
                            <label>Catatan Review (Opsional)</label>
                            <textarea name="review_note" placeholder="Berikan feedback membangun untuk mahasiswa..."></textarea>
                        </div>
                        <div class="form-actions" style="border:none; padding-top: 0;">
                            <button type="button" class="btn" style="background: transparent; color: var(--text-muted);" onclick="closeModal()">Batal</button>
                            <button type="submit" class="btn btn-primary" style="background: var(--pastel-purple); padding: 0.75rem 2rem; border-radius: 12px;">Submit Review</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    static async handleReview(e, id) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.score = parseInt(data.score);

        try {
            await API.reviewSubmission(id, data);
            closeModal();
            DosenController.renderSubmissions();
            // showToast('Review berhasil disimpan');
        } catch (error) {
            alert(error.message);
        }
    }

    static async renderStudents() {
        const content = document.getElementById('mainContent');
        content.innerHTML = `
            <div class="table-container">
                <div class="table-header">
                    <h3 style="color: var(--pastel-blue); font-weight: 700;">👥 Database Mahasiswa</h3>
                </div>
                <div style="overflow-x: auto;">
                    <table id="studentsTable">
                        <thead>
                            <tr>
                                <th>Mahasiswa</th>
                                <th>Email</th>
                                <th>Saldo Dompet</th>
                            </tr>
                        </thead>
                        <tbody><tr><td colspan="3" class="text-center">Loading...</td></tr></tbody>
                    </table>
                </div>
            </div>
        `;

        try {
            const result = await API.getDosenStudents();
            const students = result.data.users || [];

            const tbody = document.querySelector('#studentsTable tbody');
            if (students.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="padding: 2rem; color: var(--text-muted);">Tidak ada mahasiswa terdaftar.</td></tr>';
                return;
            }

            tbody.innerHTML = students.map(s => `
                <tr>
                    <td>
                        <div style="font-weight: 700; color: var(--text-main);">${s.full_name || 'No Name'}</div>
                    </td>
                    <td style="color: var(--text-muted); font-size: 0.8rem;">${s.email}</td>
                    <td>
                        <div style="background: var(--pastel-green-light); color: var(--pastel-green); font-weight: 800; display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem;">
                            ${Number(s.balance || 0).toLocaleString()} pts
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error(error);
            const tbody = document.querySelector('#studentsTable tbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:red">Error loading students: ${error.message}</td></tr>`;
        }
    }

    static async showHistoryModal(walletId, name) {
        if (!walletId) { alert("Dompet tidak ditemukan."); return; }
        const modalId = 'historyModal';
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();

        const modalHtml = `
            <div id="${modalId}" class="modal-overlay" onclick="closeModal(event)">
                <div class="modal-content" style="max-width: 600px; border-top: 8px solid var(--pastel-yellow)">
                    <h3 style="margin-bottom: 2rem;">📜 Riwayat Transaksi: ${name}</h3>
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                            <thead>
                                <tr style="background: #F8FAFC; text-align: left;">
                                    <th style="padding: 12px;">Waktu</th>
                                    <th style="padding: 12px;">Deskripsi</th>
                                    <th style="padding: 12px; text-align: right;">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody id="historyTbody">
                                <tr><td colspan="3" class="text-center" style="padding: 1.5rem;">Memuat...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        try {
            const res = await API.getStudentTransactions(walletId);
            const transactions = res.data || [];
            const tbody = document.getElementById('historyTbody');

            if (transactions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="padding: 1.5rem; color: var(--text-muted);">Belum ada riwayat transaksi.</td></tr>';
                return;
            }

            tbody.innerHTML = transactions.map(t => `
                <tr style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 12px; color: var(--text-muted);">${new Date(t.created_at).toLocaleDateString('id-ID')}</td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 600;">${t.description}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">${t.type}</div>
                    </td>
                    <td style="padding: 12px; text-align: right; font-weight: 800; color: ${t.direction === 'credit' ? 'var(--pastel-green)' : 'var(--error)'}">
                        ${t.direction === 'credit' ? '+' : '-'}${t.amount} pts
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            document.getElementById('historyTbody').innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--error)">Error: ${error.message}</td></tr>`;
        }
    }

    static showCreditModal(studentId, name, walletId) {
        if (!walletId) { alert("Mahasiswa belum memiliki dompet!"); return; }
        const modalHtml = `
            <div class="modal-overlay" onclick="closeModal(event)">
                <div class="modal-content" style="border-top: 8px solid var(--pastel-green)">
                    <h3 style="margin-bottom: 2rem;">💰 Beri Poin manual: ${name}</h3>
                    <form id="creditForm" onsubmit="DosenController.handleCreditSubmit(event, ${walletId})">
                        <div class="form-group">
                            <label>Jumlah Poin</label>
                            <input type="number" name="amount" min="1" required placeholder="Contoh: 50">
                        </div>
                        <div class="form-group">
                            <label>Alasan / Keterangan</label>
                            <textarea name="description" required placeholder="Misal: Reward keaktifan dikelas..."></textarea>
                        </div>
                        <div class="form-actions" style="border:none; padding-top: 0;">
                            <button type="button" class="btn" style="background: transparent; color: var(--text-muted);" onclick="closeModal()">Batal</button>
                            <button type="submit" class="btn btn-primary" style="background: var(--pastel-green); padding: 0.75rem 2.5rem; border-radius: 12px;">Kirim Poin</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    static async handleCreditSubmit(e, walletId) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            wallet_id: walletId,
            amount: parseInt(formData.get('amount')),
            description: formData.get('description')
        };

        try {
            await API.creditStudent(data);
            closeModal();
            DosenController.renderStudents();
            // showToast('Poin berhasil dikirim!');
        } catch (error) {
            alert(error.message);
        }
    }
}
