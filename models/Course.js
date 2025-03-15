class Course {
    constructor(data) {
        console.log('Creating course with data:', data);
        this.id = Date.now().toString();
        this.courseCode = data.courseCode;
        this.title = data.title;
        this.introduction = data.introduction;
        this.summary = data.summary;
        this.modules = this.processModules(data.moduleCodes);
        this.createdAt = new Date().toISOString();
    }

    processModules(moduleCodes) {
        if (!moduleCodes) return [];
        // Ensure moduleCodes is always an array and filter out empty values
        const modules = Array.isArray(moduleCodes) ? moduleCodes : [moduleCodes];
        console.log('Processed modules:', modules);
        return modules.filter(code => code && code.trim());
    }

    validate() {
        console.log('Validating course:', this);
        
        if (!this.courseCode || !this.courseCode.match(/^C-\d{2}-\d{2}$/)) {
            throw new Error('Invalid course code format');
        }
        if (!this.title || this.title.trim().length === 0) {
            throw new Error('Title is required');
        }
        if (!this.modules || this.modules.length === 0) {
            throw new Error('At least one module is required');
        }
        if (!this.introduction || this.introduction.trim() === '') {
            throw new Error('Introduction is required');
        }
        return true;
    }
}

module.exports = Course;
