// document.addEventListener('DOMContentLoaded', () => {
//     const profileForm = document.querySelector('.profile-settings form');
    
//     profileForm.addEventListener('submit', (event) => {
//         event.preventDefault();
        
//         const formData = new FormData(profileForm);
//         const data = Object.fromEntries(formData.entries());
        
//         fetch('/updateprofile', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(data)
//         })
//         .then(response => response.json())
//         .then(result => {
//             if (result.success) {
//                 alert('Profile updated successfully!');
//             } else {
//                 alert('Failed to update profile.');
//             }
//         })
//         .catch(error => {
//             console.error('Error:', error);
//             alert('An error occurred while updating the profile.');
//         });
//     });
// });

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profilePreview').src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}