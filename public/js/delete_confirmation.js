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
        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
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
        } else {
            throw new Error(data.message || `Failed to delete ${type}`);
        }
    } catch (error) {
        console.error('Error:', error);
        showFlashMessage('error', error.message);
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
