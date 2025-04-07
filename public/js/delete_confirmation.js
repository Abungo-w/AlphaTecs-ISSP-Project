let currentItemToDelete = null;

function showDeleteModal(type, code) {
    currentItemToDelete = { type, code };
    const modal = document.getElementById('deleteModal');
    const modalText = document.getElementById('deleteModalText');
    
    modalText.textContent = `Are you sure you want to delete this ${type}? This action cannot be undone.`;
    modal.style.display = 'block';
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.style.display = 'none';
    currentItemToDelete = null;
}

async function confirmDelete() {
    if (!currentItemToDelete) return;
    
    const { type, code } = currentItemToDelete;
    const endpoint = `/${type}s/${code}`;
    
    try {
        // Add session recovery headers
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Admin-Preserve': 'true',
            'X-Requested-With': 'XMLHttpRequest'
        };

        if (type === 'course') {
            headers['X-Session-Preserve'] = 'true';
        }

        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers,
            credentials: 'same-origin' // Changed from 'include' for better session handling
        });

        const data = await response.json();

        if (data.success) {
            // Verify admin session is preserved
            if (data.adminSession) {
                localStorage.setItem('adminSessionInfo', JSON.stringify(data.adminSession));
            }
            
            const card = document.querySelector(`[data-${type}-code="${code}"]`);
            if (card) {
                card.remove();
                
                const remainingItems = document.querySelectorAll(`.${type}-card`);
                if (remainingItems.length === 0) {
                    const grid = document.querySelector(`.${type}-grid`);
                    if (type === 'course') {
                        grid.innerHTML = `
                            <div class="no-courses">
                                <i class="fas fa-graduation-cap"></i>
                                <p>No courses available yet.</p>
                                ${isAdmin ? '<a href="/courses/create_course" class="btn-create">Create your first course</a>' : ''}
                            </div>`;
                    } else {
                        grid.innerHTML = '<p class="no-modules">No modules available.</p>';
                    }
                }
            }
            showFlashMessage('success', `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`);
        }
    } catch (error) {
        console.error('Delete operation error:', error);
        showFlashMessage('error', 'Error during delete: ' + error.message);
        
        // Attempt session recovery if needed
        const adminInfo = localStorage.getItem('adminSessionInfo');
        if (adminInfo) {
            await fetch('/api/recover-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: adminInfo,
                credentials: 'same-origin'
            });
        }
    }
    
    closeDeleteModal();
}

function showFlashMessage(type, message) {
    const flashDiv = document.createElement('div');
    flashDiv.className = `flash-${type}`;
    flashDiv.textContent = message;
    document.body.appendChild(flashDiv);
    
    setTimeout(() => {
        flashDiv.remove();
    }, 3000);
}
