const fs = require('fs').promises;
const path = require('path');
const Course = require('../models/Course');
const { db } = require('../prisma/database');

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
        return courses.find(c => c.id === courseId || c.id === String(courseId));
    }

    async updateCourse(courseData) {
        try {
            const courses = await this.loadCourses();
            const index = await courses.findIndex(c => c.courseCode === courseData.courseCode);
            console.log('Index:', index);
            if (index === -1) {
                throw new Error('Course not found');
            }
            const updatedCourse = { ...courses[index], ...courseData };
            courses[index] = updatedCourse;
            await this.saveCourses(courses);
            return updatedCourse;
            

            
        } catch (error) {
            console.error('Error in updateCourse:', error);
            throw error;
        }
    }
}

module.exports = new CourseManager();
