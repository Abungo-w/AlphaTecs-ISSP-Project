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

     // Attach scroll and load event listeners
    document.addEventListener('scroll', updateProgressBar);
    document.addEventListener('load', updateProgressBar);

});

