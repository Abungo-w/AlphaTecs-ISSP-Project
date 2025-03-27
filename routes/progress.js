// Function to update progress bar
// function updateProgressBar() {
//     const sections = document.querySelectorAll('.course-section');
//     const activeSection = document.querySelector('.course-section.active');
//     const progressBar = document.getElementById('progress-bar');
//     const progressText = document.getElementById('progress-text');

//     if (sections.length && activeSection) {
//         const activeIndex = Array.from(sections).indexOf(activeSection);
//         let progressPercentage = (activeIndex / (sections.length - 1)) * 100;
//         progressPercentage = Math.min(progressPercentage, 100);
//         progressBar.style.width = `${progressPercentage}%`;
//         progressText.textContent = `${Math.round(progressPercentage)}% completed`;
//     }
// }


// document.addEventListener('DOMContentLoaded', () => {
//     const sections = document.querySelectorAll('.course-section'); // All sections
//     const progressBar = document.getElementById('progress-bar'); // Progress bar element
//     const progressText = document.getElementById('progress-text'); // Progress text element
//     const footer = document.querySelector('footer'); // Optional footer element, if it exists

//     // Calculate the total scrollable height
//     const sectionHeights = Array.from(sections).map(section => section.offsetHeight);
//     const totalScrollableHeight = sectionHeights.reduce((a, b) => a + b, 0) - window.innerHeight;

//     function updateProgressBar() {
//         const scrollPosition = window.scrollY; // Current scroll position
//         let cumulativeHeight = 0;

//         // Calculate the progress percentage based on current section
//         let progressPercentage = 0;
//         for (let i = 0; i < sections.length; i++) {
//             cumulativeHeight += sectionHeights[i];

//             if (scrollPosition < cumulativeHeight) {
//                 const sectionStart = cumulativeHeight - sectionHeights[i];
//                 const sectionScroll = scrollPosition - sectionStart;
//                 const sectionProgress = (sectionScroll / sectionHeights[i]) * (100 / sections.length);
//                 progressPercentage += sectionProgress;
//                 break;
//             } else {
//                 progressPercentage += 100 / sections.length; // Add full progress for completed sections
//             }
//         }

//         progressPercentage = Math.min(Math.max(progressPercentage, 0), 100); // Clamp progress between 0% and 100%

//         // Update the progress bar and text
//         progressBar.style.width = `${progressPercentage}%`;
//         progressText.textContent = `${Math.round(progressPercentage)}% completed`;
//     }

//     // Event listener to update progress bar on scroll
//     window.addEventListener('scroll', updateProgressBar);

//     // Trigger an update on page load
//     updateProgressBar();
// });

// function updateProgressBar(){
//     const {scrollTop, scrollHeight} = document.documentElement;
//     const scrollPercent = scrollTop / (scrollHeight - window.innerHeight) * 100 + '%';
//     document.querySelector('#progress-bar').style.setProperty('--progress', scrollPercent);
//   }
  
// document.addEventListener('scroll', updateProgressBar);

document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('.course-section');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    function updateProgressBar() {
        const scrollPosition = window.scrollY; // Current scroll position
        const viewportHeight = window.innerHeight; // Height of the viewport
        const totalScrollableHeight = document.documentElement.scrollHeight - viewportHeight; // Total scrollable area

        let progressPercentage = 0;

        sections.forEach((section, i) => {
            const sectionTop = section.offsetTop; // Distance of the section from the top
            const sectionHeight = section.offsetHeight; // Height of the section

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                // Calculate the progress within the current section
                const sectionScroll = scrollPosition - sectionTop;
                const sectionProgress = (sectionScroll / sectionHeight) * (100 / sections.length);
                progressPercentage += sectionProgress; // Add the proportional progress of this section
                console.log(progressPercentage);

                progressPercentage = Math.min(Math.max(progressPercentage, 0), 100); // Clamp to 0-100%
                progressBar.style.width = `${progressPercentage}%`; // Update progress bar width
                progressText.textContent = `${Math.round(progressPercentage)}% completed`; // Update progress text
            } else if (scrollPosition >= sectionTop + sectionHeight) {
                // Add the full contribution of completed sections
                progressPercentage += 100 / sections.length;
            }
        });

        
    }

    window.addEventListener('scroll', updateProgressBar);
    window.addEventListener('load', updateProgressBar); // Ensure the progress is updated when the page loads
});

