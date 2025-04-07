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
            const exists = await fs.access(this.coursesFile)
                .then(() => true)
                .catch(() => false);

            if (!exists) {
                await fs.writeFile(this.coursesFile, '[]');
                return [];
            }

            const data = await fs.readFile(this.coursesFile, 'utf8');
            const courses = JSON.parse(data);
            
            // Validate course data
            return courses.map(course => ({
                ...course,
                modules: course.modules || [],
                createdAt: course.createdAt || new Date().toISOString()
            }));
        } catch (error) {
            console.error('Error loading courses:', error);
            return [];
        }
    }

    async saveCourses(courses) {
        try {
            await fs.writeFile(this.coursesFile, JSON.stringify(courses, null, 2));
        } catch (error) {
            console.error('Error saving courses:', error);
            throw error;
        }
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
        try {
            const courses = await this.loadCourses();
            const course = courses.find(c => c.courseCode === courseCode);
            
            if (!course) {
                throw new Error('Course not found');
            }
            
            // Ensure modules array exists
            course.modules = course.modules || [];
            
            return course;
        } catch (error) {
            console.error('Error in getCourse:', error);
            throw error;
        }
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
            const index = courses.findIndex(c => c.courseCode === courseData.courseCode);
            console.log('Index:', index);
            if (index === -1) {
                throw new Error('Course not found');
            }
            
            // Process modules properly - ensure we have an array of non-empty module codes
            const modules = Array.isArray(courseData.moduleCodes) 
                ? courseData.moduleCodes.filter(Boolean) 
                : courseData.moduleCodes ? [courseData.moduleCodes].filter(Boolean) : [];
            
            console.log("Processing modules for update:", modules);
            
            // Create the updated course with proper module handling
            const updatedCourse = { 
                ...courses[index],
                title: courseData.title,
                introduction: courseData.introduction,
                summary: courseData.summary,
                modules: modules,
                updatedAt: new Date().toISOString()
            };
            
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
