const fs = require('fs').promises;
const path = require('path');
const Course = require('../models/Course');

class CourseManager {
    constructor() {
        this.coursesFile = path.join(__dirname, '../data/courses.json');
    }

    async loadCourses() {
        try {
            const data = await fs.readFile(this.coursesFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.writeFile(this.coursesFile, '[]');
                return [];
            }
            throw error;
        }
    }

    async saveCourses(courses) {
        await fs.writeFile(this.coursesFile, JSON.stringify(courses, null, 2));
    }

    async createCourse(courseData) {
        try {
            console.log('Creating course with data:', courseData);
            
            // Create and validate course
            const course = new Course(courseData);
            await course.validate();

            // Load existing courses
            const courses = await this.loadCourses();
            
            // Check for duplicate course code
            if (courses.some(c => c.courseCode === course.courseCode)) {
                throw new Error('Course code already exists');
            }

            // Add new course
            courses.push(course);
            
            // Save courses
            await this.saveCourses(courses);
            
            console.log('Course saved successfully:', course);
            return course;
        } catch (error) {
            console.error('Error in createCourse:', error);
            throw error;
        }
    }

    async getCourse(courseCode) {
        const courses = await this.loadCourses();
        return courses.find(c => c.courseCode === courseCode);
    }

    async getAllCourses() {
        const courses = await this.loadCourses();
        return courses;
    }

    async getAvailableModules() {
        try {
            const modulesData = await fs.readFile(path.join(__dirname, '../data/modules.json'), 'utf8');
            return JSON.parse(modulesData);
        } catch (error) {
            console.error('Error loading modules:', error);
            return [];
        }
    }

    processModules(modules) {
        if (!Array.isArray(modules)) {
            return [];
        }
        return modules.filter(module => module && typeof module === 'string');
    }

    async getCourseById(courseId) {
        if (!courseId) return null;
        
        const courses = await this.loadCourses();
        console.log('Looking for course with ID:', courseId);
        console.log('Available course IDs:', courses.map(c => c.id));
        
        // Try both string and direct comparison
        return courses.find(c => c.id === courseId || c.id === String(courseId));
    }

    async updateCourse(courseId, courseData) {
        try {
            if (!courseId) {
                throw new Error('Course ID is required');
            }

            const courses = await this.loadCourses();
            console.log('Updating course. Course ID:', courseId);
            console.log('Current courses:', courses.map(c => ({id: c.id, code: c.courseCode})));

            // Find course index using both string and direct comparison
            const courseIndex = courses.findIndex(c => 
                c.id === courseId || c.id === String(courseId)
            );
            
            if (courseIndex === -1) {
                throw new Error(`Course not found with ID: ${courseId}`);
            }

            // Process modules if they exist
            if (courseData.modules) {
                courseData.modules = this.processModules(courseData.modules);
            }

            // Update course while preserving original id
            const updatedCourse = {
                ...courses[courseIndex],
                ...courseData,
                id: courses[courseIndex].id // Ensure we keep the original ID
            };

            courses[courseIndex] = updatedCourse;
            await this.saveCourses(courses);
            
            console.log('Course updated successfully:', updatedCourse);
            return updatedCourse;
        } catch (error) {
            console.error('Error in updateCourse:', error);
            throw error;
        }
    }
}

module.exports = new CourseManager();
