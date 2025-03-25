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
//     const sections = document.querySelectorAll('.course-section');
//     const progressBar = document.getElementById('progress-bar');
//     const progressText = document.getElementById('progress-text');

//     function updateProgressBar() {
//         const scrollPosition = window.scrollY; // Current scroll position
//         const viewportHeight = window.innerHeight; // Height of the viewport
//         const totalScrollableHeight = document.documentElement.scrollHeight - viewportHeight; // Total scrollable area

//         let progressPercentage = 0;

//         sections.forEach((section, i) => {
//             const sectionTop = section.offsetTop; // Distance of the section from the top
//             const sectionHeight = section.offsetHeight; // Height of the section

//             if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
//                 // Calculate the progress within the current section
//                 const sectionScroll = scrollPosition - sectionTop;
//                 const sectionProgress = (sectionScroll / sectionHeight) * (100 / sections.length);
//                 progressPercentage += sectionProgress; // Add the proportional progress of this section
//                 console.log(progressPercentage);

//                 progressPercentage = Math.min(Math.max(progressPercentage, 0), 100); // Clamp to 0-100%
//                 progressBar.style.width = `${progressPercentage}%`; // Update progress bar width
//                 progressText.textContent = `${Math.round(progressPercentage)}% completed`; // Update progress text
//             } else if (scrollPosition >= sectionTop + sectionHeight) {
//                 // Add the full contribution of completed sections
//                 progressPercentage += 100 / sections.length;
//             }
//         });

        
//     }

//     window.addEventListener('scroll', updateProgressBar);
//     window.addEventListener('load', updateProgressBar); // Ensure the progress is updated when the page loads
// });


// const sections = document.querySelectorAll('.course-section');
// const progressBar = document.getElementById('progress-bar');
// const totalSections = sections.length;
// const sectionPercentage = 100 / totalSections; // 20% per section

// window.addEventListener('scroll', () => {
//     let totalProgress = 0;

//     sections.forEach((section, index) => {
//         const rect = section.getBoundingClientRect();
//         if (rect.top < window.innerHeight && rect.bottom > 0) {
//             const sectionHeight = rect.height;
//             const visibleHeight = Math.min(window.innerHeight - rect.top, rect.bottom);
//             const sectionProgress = (visibleHeight / sectionHeight) * sectionPercentage;
//             totalProgress += Math.min(sectionProgress, sectionPercentage);
//         } else if (rect.top < 0 && rect.bottom > window.innerHeight) {
//             totalProgress += sectionPercentage;
//         }
//     });

//     progressBar.style.width = `${Math.min(totalProgress, 100)}%`;
// });
