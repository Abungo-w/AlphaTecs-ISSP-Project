const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

const userModel = {
    findOne: async (email) => {
        return await prisma.user.findUnique({
            where: { email }
        });
    },
    
    findById: async (id) => {
        return await prisma.user.findUnique({
            where: { id }
        });
    },

    registerUser: async (userData) => {
        try {
            // Check if email already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: userData.email }
            });

            if (existingUser) {
                throw new Error("Email already registered");
            }

            // Get the count of existing users
            const userCount = await prisma.user.count();

            // Hash password with salt rounds of 12 for better security
            const hashedPassword = await bcrypt.hash(userData.password, 12);
            
            return await prisma.user.create({
                data: {
                    id: userCount + 1, // This will start at 1 for the first user
                    name: userData.name,
                    email: userData.email,
                    password: hashedPassword,
                    jobTitle: userData.jobTitle || '',
                    field: userData.field || '',
                    role: 'user'
                }
            });
        } catch (error) {
            throw error;
        }
    },

    updateUser: async (userId, updateData) => {
        try {
            const data = { ...updateData };
            
            // Only hash password if it's being updated
            if (updateData.password) {
                data.password = await bcrypt.hash(updateData.password, 12);
            }

            return await prisma.user.update({
                where: { id: userId },
                data
            });
        } catch (error) {
            throw error;
        }
    }
};

module.exports = { userModel };
