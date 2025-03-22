document.addEventListener('DOMContentLoaded', () => {
    const sections      = document.querySelectorAll('.course-section');
    const progressBar   = document.getElementById('progress-bar');
    const progressText  = document.getElementById('progress-text');

    // Function to update progress bar
    function updateProgressBar() 
    {
        let progressPercentage = 0;

        // Loop through each section
        sections.forEach((section, i) => 
        {
            const {scrollTop, scrollHeight, clientHeight} = document.documentElement;
            console.log({scrollTop, scrollHeight, clientHeight});

            // If within the current section, calculate proportional progress
            if(scrollTop >= section.offsetTop && scrollTop < section.offsetTop + section.offsetHeight) 
            {
                const {scrollTop, scrollHeight, clientHeight} = document.documentElement;
                const scrollPercent         = (scrollTop) / (scrollHeight - clientHeight) * 100 / sections.length;
                progressPercentage          += scrollPercent;

                progressPercentage          = Math.min(progressPercentage, 100); // Clamp progress percentage to ensure it stays within 0-100%
                progressBar.style.width     = `${progressPercentage}%`;
                progressText.textContent    = `${Math.round(progressPercentage)}% completed`;
            } 

            // If the section is fully scrolled past, add its full contribution to the progress
            else if(scrollTop >= section.offsetTop + section.offsetHeight) 
            {
                progressPercentage          += 100 / sections.length;
            } 
            
            // Handle the edge case: If at the very bottom of the last section
            else if(Math.round(scrollTop + clientHeight) == scrollHeight && i == sections.length-1)
            {
                progressPercentage          = 100;
                progressBar.style.width     = `${progressPercentage}%`;
                progressText.textContent    = `${Math.round(progressPercentage)}% completed`;
            }
            
        });
    }

    // Function to save progress to the server
    async function saveProgress() 
    {
        try {
            const progressBar = document.getElementById('progress-bar');
            const progress    = parseInt(progressBar.style.width, 10); // Get current progress percentage

            const response = await fetch('/progress/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: "<%= user.id %>", // Pass userId dynamically
                    moduleId: "<%= course.courseCode %>", // Pass moduleId dynamically
                    progress: progress
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save progress');
            }
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }

    // Function to restore progress
    async function restoreProgress() {
        try {
            const response = await fetch(`/progress/get?userId=${window.userId}&moduleId=${window.moduleId}`);
            if (!response.ok) throw new Error('Failed to fetch progress');

            const data = await response.json();
            if (data.progress) {
                const targetScroll = (data.progress / 100) * (document.documentElement.scrollHeight - window.innerHeight);
                window.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Error restoring progress:', error);
        }
    }

    // Save progress when the user navigates away or closes the page
    window.addEventListener('beforeunload', saveProgress);

    

    window.userId   = "<%= user.id %>"; // Pass userId to the client
    window.moduleId = "<%= course.courseCode %>"; // Pass moduleId to the client


     // Attach scroll and load event listeners
    document.addEventListener('scroll', updateProgressBar);
    document.addEventListener('load', updateProgressBar);

    // Restore progress on page load
    restoreProgress();

});

