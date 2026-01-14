class ProfileController {
    static async renderProfile() {
        const content = document.getElementById('mainContent');
        const user = JSON.parse(localStorage.getItem('user')) || {};

        content.innerHTML = `
            <div class="profile-container" style="max-width: 800px; margin: 0 auto;">
                <div class="stat-card card-gradient-1" style="display: flex; align-items: center; gap: 2rem; padding: 2.5rem; margin-bottom: 2rem;">
                    <div class="user-avatar" style="width: 100px; height: 100px; font-size: 2.5rem; background: rgba(255,255,255,0.2);">
                        ${(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div style="color: white">
                        <h2 style="margin:0; font-size: 2rem;">${user.full_name || 'User'}</h2>
                        <p style="margin:0; opacity: 0.8; font-size: 1.1rem;">${user.role.toUpperCase()} • ${user.nim_nip || 'No ID'}</p>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                    <!-- Basic Info -->
                    <div class="table-wrapper" style="margin:0">
                        <div class="table-header">
                            <h3>Edit Profile</h3>
                        </div>
                        <div style="padding: 1.5rem;">
                            <form id="profileForm" onsubmit="ProfileController.handleUpdateProfile(event)">
                                <div class="form-group">
                                    <label>Full Name</label>
                                    <input type="text" name="full_name" value="${user.full_name}" required>
                                </div>
                                <div class="form-group">
                                    <label>Email Address</label>
                                    <input type="email" value="${user.email}" disabled style="opacity: 0.6; cursor: not-allowed;">
                                    <small style="color:var(--text-muted)">Email cannot be changed contact admin.</small>
                                </div>
                                <div class="form-actions" style="margin-top: 1.5rem">
                                    <button type="submit" class="btn btn-primary btn-block">Update Profile</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Change Password -->
                    <div class="table-wrapper" style="margin:0">
                        <div class="table-header">
                            <h3>Change Password</h3>
                        </div>
                        <div style="padding: 1.5rem;">
                            <form id="passwordForm" onsubmit="ProfileController.handleUpdatePassword(event)">
                                <div class="form-group">
                                    <label>Current Password</label>
                                    <input type="password" name="old_password" required placeholder="••••••••">
                                </div>
                                <div class="form-group">
                                    <label>New Password</label>
                                    <input type="password" name="new_password" required placeholder="••••••••" minlength="6">
                                </div>
                                <div class="form-group">
                                    <label>Confirm New Password</label>
                                    <input type="password" id="confirm_password" required placeholder="••••••••" minlength="6">
                                </div>
                                <div class="form-actions" style="margin-top: 1.5rem">
                                    <button type="submit" class="btn btn-primary btn-block" style="background: var(--secondary)">Change Password</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static async handleUpdateProfile(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await API.updateProfile(data);
            showToast("Profile updated successfully");

            // Update local storage
            const user = JSON.parse(localStorage.getItem('user'));
            user.full_name = res.data.full_name;
            localStorage.setItem('user', JSON.stringify(user));

            // Update UI sidebar
            updateUserProfile(user);
        } catch (error) {
            showToast(error.message, "error");
        }
    }

    static async handleUpdatePassword(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const confirm = document.getElementById('confirm_password').value;

        if (data.new_password !== confirm) {
            showToast("Passwords do not match", "error");
            return;
        }

        try {
            await API.updatePassword(data);
            showToast("Password updated successfully");
            e.target.reset();
        } catch (error) {
            showToast(error.message, "error");
        }
    }
}
